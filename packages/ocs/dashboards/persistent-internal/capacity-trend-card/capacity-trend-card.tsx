import * as React from 'react';
import { pluralize } from '@odf/core/components/utils';
import { useODFSystemFlagsSelector } from '@odf/core/redux';
import { GraphEmpty } from '@odf/shared/charts';
import { DEFAULT_PROMETHEUS_RETENTION } from '@odf/shared/constants';
import { PrometheusUtilizationItem } from '@odf/shared/dashboards';
import {
  dateTimeFormatterNoYear,
  dateFormatterNoYear,
} from '@odf/shared/details-page/datetime';
import { FieldLevelHelp } from '@odf/shared/generic';
import { DataUnavailableError } from '@odf/shared/generic/Error';
import {
  useCustomPrometheusPoll,
  usePrometheusBasePath,
} from '@odf/shared/hooks/custom-prometheus-poll';
import { ConfigMapModel } from '@odf/shared/models';
import { ConfigMapKind } from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { getInstantVectorStats, humanizeBinaryBytes } from '@odf/shared/utils';
import {
  PrometheusResponse,
  PrometheusValue,
  useK8sWatchResource,
} from '@openshift-console/dynamic-plugin-sdk';
import { TFunction } from 'i18next';
import { Trans } from 'react-i18next';
import { useParams } from 'react-router-dom-v5-compat';
import { compose } from 'redux';
import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Flex,
  FlexItem,
  Text,
  TextContent,
  TextVariants,
} from '@patternfly/react-core';
import {
  CAPACITY_TREND_QUERIES,
  StorageDashboardQuery,
} from '../../../queries/ceph-storage';
import { ODFSystemParams } from '../../../types';

const parser = compose((val) => val?.[0]?.y, getInstantVectorStats);

const calculateDaysUp = (response: PrometheusResponse): number | null => {
  if (!response.data?.result?.length) {
    return null;
  }

  const values: PrometheusValue[] = response.data?.result?.[0]?.values || [];

  if (!values.length) {
    return null;
  }

  const timestamps: number[] = values.map(([timestamp, _value]) => timestamp);

  const minTimestamp: number = Math.min(...timestamps);
  const maxTimestamp: number = Math.max(...timestamps);

  const timeDifferenceMs: number = maxTimestamp - minTimestamp;

  const daysPassed: number = timeDifferenceMs / (1000 * 60 * 60 * 24);

  // Rounding up to one decimal place if days passed is less than half a day
  if (daysPassed < 0.5) {
    return Math.ceil(daysPassed * 10) / 10; // Round up to one decimal place
  }

  return Math.ceil(daysPassed); // If days passed is half a day or more, round up to the nearest whole day
};

const roughEstimationToolTip = (t: TFunction, estimationName: string) => {
  return (
    <Trans t={t}>
      The {{ estimationName }} is a rough estimation. The calculation is based
      on the data gathered on day to day basis.
    </Trans>
  );
};

const CapacityTrendCard: React.FC = () => {
  const { t } = useCustomTranslation();
  const { systemFlags } = useODFSystemFlagsSelector();

  const { namespace: clusterNs } = useParams<ODFSystemParams>();
  const ocsCluster = systemFlags[clusterNs]?.ocsClusterName;

  const [configData, configLoaded, configLoadError] =
    useK8sWatchResource<ConfigMapKind>({
      kind: ConfigMapModel.kind,
      namespace: 'openshift-monitoring',
      name: 'cluster-monitoring-config',
      isList: false,
    });

  let retentionPeriod: string = DEFAULT_PROMETHEUS_RETENTION;

  if (configLoaded && !configLoadError && configData?.data) {
    const retentionRegex = /retention:\s*["'](\d+([dhmy]))["']/;
    const retentionMatch =
      configData?.data?.['config.yaml']?.match(retentionRegex);
    if (!!retentionMatch && retentionMatch.length === 2) {
      retentionPeriod = retentionMatch[1];
    } else {
      retentionPeriod = DEFAULT_PROMETHEUS_RETENTION;
    }
  }

  const [availableCapacity, availableCapacityError, availableCapacityLoading] =
    useCustomPrometheusPoll({
      query:
        CAPACITY_TREND_QUERIES(ocsCluster)[
          StorageDashboardQuery.RAW_CAPACITY_AVAILABLE
        ],
      endpoint: 'api/v1/query' as any,
      basePath: usePrometheusBasePath(),
    });

  const [totalUtil, totalUtilError, totalUtilLoading] = useCustomPrometheusPoll(
    {
      query: CAPACITY_TREND_QUERIES(ocsCluster, retentionPeriod)[
        StorageDashboardQuery.UTILIZATION_VECTOR
      ],
      endpoint: 'api/v1/query' as any,
      basePath: usePrometheusBasePath(),
    }
  );
  const [uptime, uptimeError, uptimeUtilLoading] = useCustomPrometheusPoll({
    query: CAPACITY_TREND_QUERIES(ocsCluster, retentionPeriod)[
      StorageDashboardQuery.UPTIME_DAYS
    ],
    endpoint: 'api/v1/query' as any,
    basePath: usePrometheusBasePath(),
  });

  const loadError = availableCapacityError || totalUtilError || uptimeError;
  const loading =
    availableCapacityLoading || totalUtilLoading || uptimeUtilLoading;

  let daysUp: number;
  if (!loading && !loadError) {
    daysUp = calculateDaysUp(uptime);
  }

  const totalUtilMetric = parser(totalUtil);
  const avgUtilMetric =
    !!daysUp && !!totalUtilMetric
      ? totalUtilMetric / Math.ceil(daysUp) // do a ceil function, if it's a new cluster (dayUp < 1)
      : 0;
  const avgUtilMetricByte = humanizeBinaryBytes(avgUtilMetric.toFixed(0));

  const availableCapacityMetric = parser(availableCapacity);
  const daysLeft =
    !!availableCapacityMetric && avgUtilMetric
      ? Math.floor(availableCapacityMetric / avgUtilMetric)
      : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('Consumption trend')}</CardTitle>
      </CardHeader>
      <CardBody>
        {!loading && !loadError && (
          <Flex direction={{ default: 'column' }}>
            <Flex>
              <FlexItem flex={{ default: 'flex_4' }}>
                <TextContent>
                  <Text component={TextVariants.h4}>
                    {t('Storage consumption per day')}
                  </Text>
                  <Text component={TextVariants.small}>
                    {t('Over the past {{daysUp}} ', {
                      daysUp: !!daysUp ? Math.ceil(daysUp) : null,
                    })}
                    {pluralize(Math.ceil(daysUp), t('day'), t('days'), false)}
                  </Text>
                </TextContent>
                <PrometheusUtilizationItem
                  title=""
                  utilizationQuery={
                    CAPACITY_TREND_QUERIES(ocsCluster)[
                      StorageDashboardQuery.UTILIZATION_1D
                    ]
                  }
                  humanizeValue={humanizeBinaryBytes}
                  hideHorizontalBorder={true}
                  hideCurrentHumanized={true}
                  formatDate={
                    daysUp >= 1
                      ? daysUp === 1
                        ? dateTimeFormatterNoYear.format
                        : dateFormatterNoYear.format
                      : undefined
                  }
                  chartType="grouped-line"
                  showLegend={false}
                  timespan={daysUp * 24 * 60 * 60 * 1000}
                />
              </FlexItem>
              <FlexItem
                flex={{ default: 'flex_1' }}
                alignSelf={{ default: 'alignSelfCenter' }}
                spacer={{ default: 'spacerLg' }}
              >
                <Text component={TextVariants.h4}>
                  {t('Average consumption')}
                </Text>
                {avgUtilMetricByte.string} / {t('day')}
              </FlexItem>
            </Flex>
            <Flex justifyContent={{ default: 'justifyContentSpaceBetween' }}>
              <FlexItem flex={{ default: 'flex_1' }}>
                <Text component={TextVariants.h4}>
                  {t('Estimated days until full')}
                  <FieldLevelHelp>
                    {roughEstimationToolTip(t, t('number of days left'))}
                  </FieldLevelHelp>
                </Text>
                {daysLeft} {pluralize(daysUp, t('day'), t('days'), false)}
              </FlexItem>
            </Flex>
          </Flex>
        )}
        {loading && !loadError && (
          <GraphEmpty loading={loading && !loadError} />
        )}
        {loadError && <DataUnavailableError />}
      </CardBody>
    </Card>
  );
};

export default CapacityTrendCard;
