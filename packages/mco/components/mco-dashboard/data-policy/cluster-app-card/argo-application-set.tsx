/**
 * Add components specific to appicaltion-wise card here
 */

import * as React from 'react';
import {
  SLA_STATUS,
  DRPC_STATUS,
  ACM_ENDPOINT,
  HUB_CLUSTER_NAME,
} from '@odf/mco/constants';
import { ProtectedAppSetsMap } from '@odf/mco/types';
import { DRPlacementControlKind } from '@odf/mco/types';
import {
  getSLAStatus,
  getRemoteNSFromAppSet,
  getProtectedPVCsFromDRPC,
  getCurrentStatus,
  getDRStatus,
} from '@odf/mco/utils';
import { mapLimitsRequests } from '@odf/shared/charts';
import { AreaChart } from '@odf/shared/dashboards/utilization-card/area-chart';
import { trimSecondsXMutator } from '@odf/shared/dashboards/utilization-card/utilization-item';
import { SingleSelectDropdown } from '@odf/shared/dropdown/singleselectdropdown';
import { useCustomPrometheusPoll } from '@odf/shared/hooks/custom-prometheus-poll';
import { URL_POLL_DEFAULT_DELAY } from '@odf/shared/hooks/custom-prometheus-poll/use-url-poll';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  humanizeSeconds,
  secondsToNanoSeconds,
  DataPoint,
} from '@odf/shared/utils';
import {
  PrometheusResponse,
  PrometheusResult,
  Humanize,
} from '@openshift-console/dynamic-plugin-sdk';
import {
  useUtilizationDuration,
  UtilizationDurationDropdown,
} from '@openshift-console/dynamic-plugin-sdk-internal';
import { chart_color_orange_300 as thresholdColor } from '@patternfly/react-tokens/dist/js/chart_color_orange_300';
import * as _ from 'lodash-es';
import { SelectOption } from '@patternfly/react-core';
import { getPvcSlaPerPVCQuery } from '../../queries';

const humanizeSLA: Humanize = (value) =>
  humanizeSeconds(secondsToNanoSeconds(value), null, 's');

const getThresholdData = (data: ChartData, syncInterval: string): ChartData => {
  if (!!data?.length) {
    return data?.map((r) => {
      return r?.map(
        (dataPoint) =>
          ({
            x: dataPoint.x,
            y: Number(syncInterval) || 0,
          } as DataPoint<string | number | Date>)
      );
    });
  }
  return [];
};

export const ProtectedPVCsSection: React.FC<ProtectedPVCsSectionProps> = ({
  clusterName,
  pvcSLAData,
  selectedAppSet,
}) => {
  const { t } = useCustomTranslation();

  const [protectedPVCsCount, pvcsWithIssueCount] = React.useMemo(() => {
    const pvcsList = getProtectedPVCsFromDRPC(
      selectedAppSet?.drPlacementControl
    );
    const remoteNS = getRemoteNSFromAppSet(selectedAppSet?.application);
    const issueCount =
      pvcSLAData?.data?.result?.reduce((acc, item: PrometheusResult) => {
        /** FIX THIS */
        if (
          item?.metric?.cluster === clusterName &&
          item?.metric?.pvc_namespace === remoteNS &&
          getSLAStatus(item)[0] !== SLA_STATUS.HEALTHY &&
          pvcsList.includes(item?.metric?.pvc_name)
        )
          return acc + 1;
        else return acc;
      }, 0) || 0;

    return [pvcsList?.length || 0, issueCount];
  }, [selectedAppSet, pvcSLAData, clusterName]);

  return (
    <div className="mco-dashboard__contentColumn">
      <div className="mco-dashboard__title">{protectedPVCsCount}</div>
      <div className="mco-dashboard__title">{t('Protected PVCs')}</div>
      <div className="text-muted">
        {t('{{ pvcsWithIssueCount }} with issues', { pvcsWithIssueCount })}
      </div>
    </div>
  );
};

export const RPOSection: React.FC<CommonProps> = ({ selectedAppSet }) => {
  const { t } = useCustomTranslation();
  const [rpo, setRPO] = React.useState('N/A');
  const clearSetIntervalId = React.useRef<NodeJS.Timeout>();

  const updateRPO = () => {
    const currentTime = new Date().getTime();
    const lastSyncTime = new Date(
      selectedAppSet?.drPlacementControl?.status?.lastGroupSyncTime
    ).getTime();
    const rpo = ((lastSyncTime - currentTime) / 1000).toString();
    setRPO(!_.isNaN(rpo) && !!rpo ? rpo : 'N/A');
  };

  React.useEffect(() => {
    clearSetIntervalId.current = setInterval(updateRPO, URL_POLL_DEFAULT_DELAY);
    return () => clearInterval(clearSetIntervalId.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mco-dashboard__contentColumn">
      <div className="mco-dashboard__title">{t('{{ rpo }} sec', { rpo })}</div>
      <div className="mco-dashboard__title">{t('RPO')}</div>
    </div>
  );
};

export const ActivitySection: React.FC<CommonProps> = ({ selectedAppSet }) => {
  const { t } = useCustomTranslation();

  const drpc: DRPlacementControlKind = selectedAppSet?.drPlacementControl;
  const currentStatus = getCurrentStatus([drpc]);
  const failoverCluster = drpc?.spec?.failoverCluster;
  const preferredCluster = drpc?.spec?.preferredCluster;
  return (
    <div className="mco-dashboard__contentColumn">
      <div className="mco-dashboard__title">{t('Activity')}</div>
      <div className="mco-dashboard__contentRow">
        {getDRStatus(currentStatus, null, t).icon}
        <div className="text-muted mco-cluster-app__text--padding-left">
          {!currentStatus
            ? t('Unknown')
            : [DRPC_STATUS.Relocating, DRPC_STATUS.Relocated].includes(
                currentStatus as DRPC_STATUS
              )
            ? t('{{ currentStatus }} to {{ preferredCluster }}', {
                currentStatus,
                preferredCluster,
              })
            : t('{{ currentStatus }} to {{ failoverCluster }}', {
                currentStatus,
                failoverCluster,
              })}
        </div>
      </div>
    </div>
  );
};

export const SnapshotSection: React.FC<CommonProps> = ({ selectedAppSet }) => {
  const { t } = useCustomTranslation();

  const lastSyncTime =
    selectedAppSet?.drPlacementControl?.status?.lastGroupSyncTime || 'N/A';
  return (
    <div className="mco-dashboard__contentColumn">
      <div className="mco-dashboard__title">{t('Snapshot')}</div>
      <div className="text-muted">
        {t('Last on: {{ lastSyncTime }}', { lastSyncTime })}
      </div>
    </div>
  );
};

const PVCDropdown: React.FC<PVCDropdownProps> = ({
  remoteNS,
  pvcsList,
  pvcSLAData,
  pvc,
  setPVC,
}) => {
  const { t } = useCustomTranslation();

  const pvcDropdownOptions: JSX.Element[] = pvcsList?.map((pvc) => (
    <SelectOption key={pvc} value={pvc} />
  ));

  React.useEffect(() => {
    if (!pvc && !!pvcsList.length) {
      // initial selection, based on worst PVC SLA
      let worstSLA: number;
      let worstPVC: string;
      pvcsList?.forEach((pvc) => {
        const slaSyncDiff = getSLAStatus(
          pvcSLAData?.data?.result?.find(
            /** FIX THIS */
            (item: PrometheusResult) =>
              item?.metric?.pvc_namespace === remoteNS &&
              item?.metric?.pvc_name === pvc
          )
        )?.[1];
        if (!worstSLA || slaSyncDiff > worstSLA) {
          worstSLA = slaSyncDiff;
          worstPVC = pvc;
        }
      });
      setPVC(worstPVC);
    }
  }, [pvc, remoteNS, pvcSLAData, pvcsList, setPVC]);

  return (
    <SingleSelectDropdown
      selectedKey={pvc}
      selectOptions={pvcDropdownOptions}
      onChange={setPVC}
      placeholderText={t('Select PVCs')}
    />
  );
};

export const ReplicationHistorySection: React.FC<ReplicationHistorySectionProps> =
  ({ clusterName, selectedAppSet, pvcSLAData }) => {
    const { t } = useCustomTranslation();
    const { duration } = useUtilizationDuration();
    const [pvc, setPVC] = React.useState<string>();

    const remoteNS = getRemoteNSFromAppSet(selectedAppSet?.application);
    const pvcsList: string[] = getProtectedPVCsFromDRPC(
      selectedAppSet?.drPlacementControl
    );

    const [pvcSLARangeData, pvcSLARangeError, pvcSLARangeLoading] =
      useCustomPrometheusPoll({
        endpoint: 'api/v1/query_range' as any,
        query:
          !!remoteNS && !!pvc
            ? getPvcSlaPerPVCQuery(clusterName, remoteNS, pvc)
            : null,
        delay: duration,
        basePath: ACM_ENDPOINT,
        cluster: HUB_CLUSTER_NAME,
      });

    /**
     * FIX THIS
     * ToDo(Sanjal): Find a way to add more info to tooltip of the chart
     * Also, update utils based upon unit of the data (sec, min etc)
     */
    const { data, chartStyle } = mapLimitsRequests(
      pvcSLARangeData,
      null,
      null,
      trimSecondsXMutator,
      t
    );
    const thresholdData: ChartData = getThresholdData(
      data,
      selectedAppSet.syncInterval
    );
    data.push(...thresholdData);
    if (thresholdData.length) {
      chartStyle.push({
        data: {
          stroke: thresholdColor.value,
          strokeDasharray: '3,3',
          fillOpacity: 0,
        },
      });
    }

    return (
      <div className="mco-dashboard__contentColumn">
        <div className="mco-dashboard__contentRow mco-cluster-app__contentRow--spaceBetween">
          <div className="mco-dashboard__title mco-cluster-app__contentRow--flexStart">
            {t('Replication history')}
          </div>
          <div className="mco-dashboard__contentRow mco-cluster-app__contentRow--flexEnd">
            <PVCDropdown
              remoteNS={remoteNS}
              pvcsList={pvcsList}
              pvcSLAData={pvcSLAData}
              pvc={pvc}
              setPVC={setPVC}
            />
            <UtilizationDurationDropdown />
          </div>
        </div>
        <AreaChart
          data={data}
          loading={!pvcSLARangeError && pvcSLARangeLoading}
          /** FIX THIS
           * Assuming value from metric response is in sec
           */
          humanize={humanizeSLA}
          chartStyle={chartStyle}
          mainDataName="usage"
        />
      </div>
    );
  };

type ProtectedPVCsSectionProps = {
  clusterName: string;
  pvcSLAData: PrometheusResponse;
  selectedAppSet: ProtectedAppSetsMap;
};

type CommonProps = {
  selectedAppSet: ProtectedAppSetsMap;
};

type PVCDropdownProps = {
  remoteNS: string;
  pvcsList: string[];
  pvcSLAData: PrometheusResponse;
  pvc: string;
  setPVC: React.Dispatch<React.SetStateAction<string>>;
};

type ReplicationHistorySectionProps = {
  clusterName: string;
  selectedAppSet: ProtectedAppSetsMap;
  pvcSLAData: PrometheusResponse;
};

type ChartData = DataPoint<string | number | Date>[][];
