import * as React from 'react';
import { useODFNamespaceSelector } from '@odf/core/redux';
import {
  ALERTMANAGER_SILENCES_PATH,
  MINUTES_IN_DAY,
  SAMPLE_STEP_SECONDS,
  TWENTY_FOUR_HOURS,
} from '@odf/shared/constants';
import { useCustomPrometheusPoll } from '@odf/shared/hooks/custom-prometheus-poll';
import {
  URL_POLL_DEFAULT_DELAY,
  useURLPoll,
} from '@odf/shared/hooks/custom-prometheus-poll/use-url-poll';
import { useAlertManagerBasePath } from '@odf/shared/hooks/custom-prometheus-poll/utils';
import { PrometheusRuleModel } from '@odf/shared/models';
import useAlerts from '@odf/shared/monitoring/useAlert';
import { referenceForModel } from '@odf/shared/utils';
import {
  K8sResourceCommon,
  PrometheusEndpoint,
  PrometheusResponse,
  PrometheusRule,
  useK8sWatchResource,
} from '@openshift-console/dynamic-plugin-sdk';
import { extractTemplatesFromRules, parseAlertMessage } from './utils';

type PrometheusRuleCR = K8sResourceCommon & {
  spec?: {
    groups?: {
      name: string;
      rules?: PrometheusRule[];
    }[];
  };
};

const HEALTH_RULES_CR_NAME = 'ocs-prometheus-rules';
const HEALTH_CHECKS_GROUP_NAME = 'odf_healthchecks.rules';

const useHealthRules = () => {
  const { odfNamespace } = useODFNamespaceSelector();

  const [prometheusRule, rulesLoaded, rulesError] =
    useK8sWatchResource<PrometheusRuleCR>({
      kind: referenceForModel(PrometheusRuleModel),
      name: HEALTH_RULES_CR_NAME,
      namespace: odfNamespace,
      isList: false,
    });

  const templateMap = React.useMemo(() => {
    const allGroups = prometheusRule?.spec?.groups || [];
    const healthCheckGroups = allGroups.filter(
      (group) => group.name === HEALTH_CHECKS_GROUP_NAME
    );
    return extractTemplatesFromRules(healthCheckGroups);
  }, [prometheusRule]);

  return {
    templates: templateMap.templates,
    ruleNames: templateMap.ruleNames,
    loaded: rulesLoaded,
    error: rulesError,
  };
};

export type AlertRowData = {
  alertname: string;
  startTime: Date;
  endTime?: Date;
  duration: number;
  message: string;
  severity: string;
  labels: Record<string, string>;
  state: 'firing' | 'resolved';
  metadata: {
    uid: string;
  };
};

type PrometheusAlertResult = {
  metric: Record<string, string>;
  values: [number, string][];
};

type AlertAnnotations = {
  message?: string;
  description?: string;
  summary?: string;
};

const getNormalizedAlertKey = (
  alertname: string,
  labels: Record<string, string>
): string => {
  const normalizedLabels = Object.entries(labels || {})
    .filter(([key]) => key !== 'alertstate')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('|');
  return `${alertname}::${normalizedLabels}`;
};

const resolveAlertMessage = (
  alertname: string,
  labels: Record<string, string>,
  alertTemplates: Map<string, string>,
  annotations?: AlertAnnotations
) => {
  const template =
    alertTemplates.get(alertname) ||
    annotations?.message ||
    annotations?.description ||
    annotations?.summary ||
    alertname;

  return parseAlertMessage(template, labels);
};

type BuildAlertRowArgs = {
  alertKey: string;
  alertname: string;
  severity: string;
  message: string;
  labels: Record<string, string>;
  startTimestampMs: number;
  endTimestampMs?: number;
  state: AlertRowData['state'];
};

const buildAlertRow = ({
  alertKey,
  alertname,
  severity,
  message,
  labels,
  startTimestampMs,
  endTimestampMs,
  state,
}: BuildAlertRowArgs): AlertRowData => {
  const startTime = new Date(startTimestampMs);
  const endTime = endTimestampMs ? new Date(endTimestampMs) : undefined;
  const duration = Math.max(
    0,
    (endTime ?? new Date()).getTime() - startTime.getTime()
  );

  return {
    alertname,
    startTime,
    endTime,
    duration,
    message,
    severity,
    labels,
    state,
    metadata: { uid: `${alertKey}-${startTime.getTime()}` },
  };
};

const processAlertTimeSeries = (
  response: PrometheusResponse,
  alertTemplates: Map<string, string>,
  allowedAlertNames: Set<string>,
  activeAlertKeys: Set<string>
): AlertRowData[] => {
  if (!response?.data?.result || !allowedAlertNames.size) {
    return [];
  }

  const alerts: AlertRowData[] = [];
  const results = response.data.result as PrometheusAlertResult[];

  results.forEach((result) => {
    const { metric, values } = result;
    const alertname = metric.alertname || 'Unknown';
    if (!allowedAlertNames.has(alertname)) {
      return;
    }
    if (!values?.length) {
      return;
    }

    const severity = metric.severity || 'info';
    const alertKey = getNormalizedAlertKey(alertname, metric);
    const message = resolveAlertMessage(alertname, metric, alertTemplates);
    const sortedValues = [...values].sort((a, b) => a[0] - b[0]);
    const stepSeconds =
      sortedValues.length > 1
        ? sortedValues[1][0] - sortedValues[0][0]
        : SAMPLE_STEP_SECONDS;

    const addResolvedAlert = (startSeconds: number, endSeconds?: number) => {
      alerts.push(
        buildAlertRow({
          alertKey,
          alertname,
          severity,
          message,
          labels: metric,
          startTimestampMs: startSeconds * 1000,
          endTimestampMs:
            endSeconds !== undefined ? endSeconds * 1000 : undefined,
          state: 'resolved',
        })
      );
    };

    let firingStart: number | null = null;
    let lastFiringTimestamp: number | null = null;

    sortedValues.forEach(([timestamp, value]) => {
      const isFiring = value === '1';
      if (!isFiring) {
        if (firingStart !== null) {
          addResolvedAlert(firingStart, timestamp);
          firingStart = null;
        }
        return;
      }

      if (firingStart === null) {
        firingStart = timestamp;
      }
      lastFiringTimestamp = timestamp;
    });

    if (firingStart !== null && !activeAlertKeys.has(alertKey)) {
      const endTimestamp =
        lastFiringTimestamp !== null
          ? lastFiringTimestamp + stepSeconds
          : undefined;
      addResolvedAlert(firingStart, endTimestamp);
    }
  });

  return alerts;
};

const mergeAlerts = (
  historical: AlertRowData[],
  active: AlertRowData[],
  activeAlertKeys: Set<string>
): AlertRowData[] => {
  const alertMap = new Map<string, AlertRowData>();
  const now = Date.now();

  historical.forEach((alert) => {
    if (!alert.endTime) {
      return;
    }
    const alertKey = getNormalizedAlertKey(alert.alertname, alert.labels);
    if (activeAlertKeys.has(alertKey) || alert.endTime.getTime() > now) {
      return;
    }
    alertMap.set(alert.metadata.uid, alert);
  });

  active.forEach((alert) => {
    alertMap.set(alert.metadata.uid, alert);
  });

  return Array.from(alertMap.values()).sort(
    (a, b) => b.startTime.getTime() - a.startTime.getTime()
  );
};

export const useHealthAlerts = (): [AlertRowData[], boolean, any] => {
  const {
    templates: alertTemplates,
    ruleNames: allowedAlertNames,
    loaded: rulesLoaded,
    error: rulesError,
  } = useHealthRules();

  const historicalQuery = React.useMemo(() => {
    if (!allowedAlertNames.size) {
      return '';
    }
    const escapeRegex = (name: string) =>
      name.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = Array.from(allowedAlertNames).map(escapeRegex).join('|');
    return `ALERTS{alertname=~"${regex}"}`;
  }, [allowedAlertNames]);

  const [historicalResponse, historicalError, historicalLoading] =
    useCustomPrometheusPoll({
      endpoint: PrometheusEndpoint.QUERY_RANGE,
      query: historicalQuery,
      timespan: TWENTY_FOUR_HOURS,
      samples: MINUTES_IN_DAY,
    });

  const [activeAlerts, activeLoaded, activeError] = useAlerts();

  const alerts = React.useMemo(() => {
    if (!allowedAlertNames.size) {
      return [];
    }
    const filteredActiveAlerts = (activeAlerts || []).filter((alert) =>
      allowedAlertNames.has(
        alert.labels?.alertname || (alert as any)?.rule?.name
      )
    );
    const activeAlertKeys = new Set(
      filteredActiveAlerts.map((alert) =>
        getNormalizedAlertKey(
          alert.labels?.alertname || 'Unknown',
          alert.labels || {}
        )
      )
    );
    const historical = processAlertTimeSeries(
      historicalResponse,
      alertTemplates,
      allowedAlertNames,
      activeAlertKeys
    );
    const active = filteredActiveAlerts.map((alert) => {
      const alertname = alert.labels?.alertname || 'Unknown';
      const severity = alert.labels?.severity || 'info';
      const labels = alert.labels || {};
      const alertKey = getNormalizedAlertKey(alertname, labels);
      const startTime = alert.activeAt ? new Date(alert.activeAt) : new Date();
      const message = resolveAlertMessage(
        alertname,
        labels,
        alertTemplates,
        alert.annotations as AlertAnnotations
      );

      return buildAlertRow({
        alertKey,
        alertname,
        severity,
        message,
        labels,
        startTimestampMs: startTime.getTime(),
        state: 'firing',
      });
    });

    return mergeAlerts(historical, active, activeAlertKeys);
  }, [historicalResponse, activeAlerts, alertTemplates, allowedAlertNames]);

  const loaded = !historicalLoading && activeLoaded && rulesLoaded;
  const error = historicalError || activeError || rulesError;

  return [alerts, loaded, error];
};

type AlertmanagerMatcher = {
  name: string;
  value: string;
  isRegex: boolean;
  isEqual: boolean;
};

type AlertmanagerSilence = {
  id: string;
  status?: { state?: string };
  matchers?: AlertmanagerMatcher[];
  startsAt: string;
  endsAt?: string;
  comment?: string;
  createdBy?: string;
  updatedAt?: string;
};

export type SilencedAlertRowData = K8sResourceCommon & {
  silenceId: string;
  alertname: string;
  silencedOn: Date;
  endsOn?: Date;
  severity: string;
  details: string;
};

const mapSilencesToRows = (
  silences: AlertmanagerSilence[] = [],
  templateMap: Map<string, string>,
  allowedAlertNames: Set<string>
): SilencedAlertRowData[] => {
  return silences
    .filter(
      (silence) =>
        silence?.status?.state === 'active' &&
        allowedAlertNames.has(
          silence.matchers?.find((m) => m?.name === 'alertname')?.value || ''
        )
    )
    .map((silence) => {
      const alertname =
        silence.matchers?.find((m) => m?.name === 'alertname')?.value ||
        'Unknown';
      const labels = (silence.matchers || []).reduce(
        (acc, matcher) => ({
          ...acc,
          [matcher.name]: matcher.value,
        }),
        {}
      );
      const messageTemplate =
        templateMap.get(alertname) || silence.comment || alertname;
      const parsedMessage = parseAlertMessage(messageTemplate, labels);
      const severity =
        silence.matchers?.find((m) => m?.name === 'severity')?.value || 'info';
      const details =
        parsedMessage ||
        silence.comment ||
        (silence.matchers || [])
          .map((matcher) => {
            const operator = matcher.isEqual === false ? '!=' : '=';
            return `${matcher.name}${operator}${matcher.value}`;
          })
          .join(', ') ||
        alertname;
      const silencedOn = silence.startsAt
        ? new Date(silence.startsAt)
        : new Date();
      const endsOn = silence.endsAt ? new Date(silence.endsAt) : undefined;

      return {
        silenceId: silence.id,
        alertname,
        silencedOn,
        endsOn,
        severity,
        details,
        metadata: { uid: silence.id },
      } as SilencedAlertRowData;
    });
};

/**
 * Checks if an alert matches a silence's matchers
 */
const alertMatchesSilence = (
  alert: AlertRowData,
  silence: AlertmanagerSilence
): boolean => {
  if (!silence.matchers || silence.status?.state !== 'active') {
    return false;
  }

  // Check if all matchers match the alert
  return silence.matchers.every((matcher) => {
    const alertValue = alert.labels?.[matcher.name];

    if (!alertValue) {
      return false;
    }

    if (matcher.isRegex) {
      try {
        const regex = new RegExp(matcher.value);
        const matches = regex.test(alertValue);
        return matcher.isEqual ? matches : !matches;
      } catch {
        return false;
      }
    }

    const matches = alertValue === matcher.value;
    return matcher.isEqual ? matches : !matches;
  });
};

/**
 * Filters out alerts that are currently silenced
 */
export const filterOutSilencedAlerts = (
  alerts: AlertRowData[],
  silences: AlertmanagerSilence[] = []
): AlertRowData[] => {
  if (!silences.length) {
    return alerts;
  }

  return alerts.filter((alert) => {
    // Check if this alert matches any active silence
    return !silences.some((silence) => alertMatchesSilence(alert, silence));
  });
};

export const useSilencedAlerts = () => {
  const alertManagerBasePath = useAlertManagerBasePath();
  const silencesURL = alertManagerBasePath
    ? `${alertManagerBasePath}/${ALERTMANAGER_SILENCES_PATH}`
    : '';
  // TODO: Refactor to use useSWRMutation instead of refreshKey state
  // useSWRMutation returns a mutate function, eliminating the need for refreshKey
  const [refreshKey, setRefreshKey] = React.useState(0);

  const [silences, pollError, loading] = useURLPoll<AlertmanagerSilence[]>(
    silencesURL,
    URL_POLL_DEFAULT_DELAY,
    undefined,
    refreshKey
  );

  const {
    templates,
    ruleNames,
    loaded: rulesLoaded,
    error: rulesError,
  } = useHealthRules();

  const silencedAlerts = React.useMemo(
    () => mapSilencesToRows(silences, templates, ruleNames),
    [silences, templates, ruleNames]
  );

  const refreshSilencedAlerts = React.useCallback(
    () => setRefreshKey((key) => key + 1),
    []
  );

  const silencedAlertsLoaded = (!silencesURL || !loading) && rulesLoaded;
  const silencedAlertsError =
    (!alertManagerBasePath && !loading
      ? new Error('Alertmanager base URL is unavailable.')
      : pollError) || rulesError;

  return {
    silencedAlerts,
    silencedAlertsLoaded,
    silencedAlertsError,
    refreshSilencedAlerts,
    // Expose raw silences for filtering
    silences,
  };
};
