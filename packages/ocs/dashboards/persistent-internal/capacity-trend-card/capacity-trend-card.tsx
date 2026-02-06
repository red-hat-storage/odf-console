import * as React from 'react';
import { pluralize } from '@odf/core/components/utils';
import { useGetInternalClusterDetails } from '@odf/core/redux/utils';
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
import { humanizeBinaryBytesWithNegatives, parser } from '@odf/shared/utils';
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';
import { TFunction } from 'react-i18next';
import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Flex,
  FlexItem,
  PopoverPosition,
  Content,
  ContentVariants,
} from '@patternfly/react-core';
import {
  CAPACITY_TREND_QUERIES,
  CEPH_CAPACITY_BREAKDOWN_QUERIES,
  StorageDashboardQuery,
} from '../../../queries/ceph-storage';

const calculateDaysUp = (timespan: number): number | null => {
  const daysPassed: number = timespan / (60 * 60 * 24);

  // Rounding up to one decimal place if days passed is less than half a day
  if (daysPassed < 0.5) {
    return Math.ceil(daysPassed * 10) / 10; // Round up to one decimal place
  }

  return Math.ceil(daysPassed); // If days passed is half a day or more, round up to the nearest whole day
};

const understandingToolTip = (t: TFunction) => {
  return (
    <>
      <Content component={ContentVariants.h2}>{t('Understand terms')}</Content>
      <Content component={ContentVariants.h4}>
        {t('Net storage consumption')}
      </Content>

      <Content component={ContentVariants.p}>
        {t('Indicates the daily net change in storage capacity.')}
      </Content>

      <Content component={ContentVariants.h4}>
        {t('Average storage consumption')}
      </Content>

      <Content component={ContentVariants.p}>
        {t(
          'Refers to the amount of data used over a specified period. A positive average indicates how quickly the cluster is filling up, while a negative average indicates the rate at which the cluster is clearing up.'
        )}
      </Content>
      <Content component={ContentVariants.h4}>
        {t('Estimated days until full **')}
      </Content>

      <Content component={ContentVariants.p}>
        {t(
          'Indicates the number of days remaining before a storage system reaches its maximum capacity based on current usage trends.'
        )}
      </Content>

      <Content component={ContentVariants.small}>
        {t(
          'Calculations for above metrics are based on the data gathered day to day basis. **This is only a rough estimation These calculations are based on the data gathered on day to day basis'
        )}
      </Content>
    </>
  );
};

const CapacityTrendCard: React.FC = () => {
  const { t } = useCustomTranslation();

  const { clusterName: ocsCluster } = useGetInternalClusterDetails();

  const [configData, configLoaded, configLoadError] =
    useK8sWatchResource<ConfigMapKind>({
      kind: ConfigMapModel.kind,
      namespace: 'openshift-monitoring',
      name: 'cluster-monitoring-config',
      isList: false,
    });

  let retentionPeriod: string = DEFAULT_PROMETHEUS_RETENTION;

  if (configLoaded && !configLoadError && configData?.data) {
    const retentionRegex =
      /retention:\s*["']?((\d+y)?(\d+w)?(\d+d)?(\d+h)?(\d+m)?(\d+s)?(\d+ms)?)["']?/;
    const retentionMatch =
      configData?.data?.['config.yaml']?.match(retentionRegex);
    if (!!retentionMatch && retentionMatch?.[1] !== '') {
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

  const [totalCapacity, totalCapacityError, totalCapacityLoading] =
    useCustomPrometheusPoll({
      query: CEPH_CAPACITY_BREAKDOWN_QUERIES(null, ocsCluster)[
        StorageDashboardQuery.CEPH_CAPACITY_TOTAL
      ],
      endpoint: 'api/v1/query' as any,
      basePath: usePrometheusBasePath(),
    });

  const loadError =
    availableCapacityError ||
    totalUtilError ||
    uptimeError ||
    totalCapacityError;
  const loading =
    availableCapacityLoading ||
    totalUtilLoading ||
    uptimeUtilLoading ||
    totalCapacityLoading;

  let daysUp: number;
  if (!loading && !loadError) {
    daysUp = calculateDaysUp(parser(uptime));
  }

  const totalUtilMetric = parser(totalUtil);
  const totalCapacityMetric = parser(totalCapacity);
  const avgUtilMetric =
    !!daysUp && !!totalUtilMetric
      ? totalUtilMetric / Math.ceil(daysUp) // do a ceil function, if it's a new cluster (dayUp < 1)
      : 0;

  const avgUtilMetricByte = humanizeBinaryBytesWithNegatives(
    avgUtilMetric.toFixed(0)
  );
  const availableCapacityMetric = parser(availableCapacity);
  let daysLeft =
    !!availableCapacityMetric && avgUtilMetric
      ? Math.floor(availableCapacityMetric / avgUtilMetric)
      : 0;

  if (daysLeft < 0) {
    // Clean up negative average values, if a user empties a cluster the average value goes to negative we need to make
    // sure that estimated days left takes into account the average rate of filling up the cluster.
    // This will give better information about estimated days
    const clusterCleanUpToZeroDays =
      (totalCapacityMetric - availableCapacityMetric) / Math.abs(avgUtilMetric);
    const clusterFillUpToMaxDays =
      totalCapacityMetric / Math.abs(avgUtilMetric);
    daysLeft = Math.floor(clusterCleanUpToZeroDays + clusterFillUpToMaxDays);
  }
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
                <Content>
                  <Content component={ContentVariants.h4}>
                    {t('Storage consumption')}
                  </Content>
                  <Content component={ContentVariants.small}>
                    {t('Over the past {{daysUp}} ', {
                      daysUp: !!daysUp ? Math.ceil(daysUp) : null,
                    })}
                    {pluralize(Math.ceil(daysUp), t('day'), t('days'), false)}
                  </Content>
                </Content>
                <PrometheusUtilizationItem
                  title=""
                  description={t('Net storage consumption')}
                  utilizationQuery={
                    CAPACITY_TREND_QUERIES(ocsCluster)[
                      StorageDashboardQuery.UTILIZATION_1D
                    ]
                  }
                  humanizeValue={humanizeBinaryBytesWithNegatives}
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
                  showLegend={true}
                  timespan={daysUp * 24 * 60 * 60 * 1000}
                  showHumanizedInLegend={true}
                />
              </FlexItem>
            </Flex>
            <Flex justifyContent={{ default: 'justifyContentSpaceBetween' }}>
              <FlexItem flex={{ default: 'flex_1' }}>
                <Content component={ContentVariants.h4}>
                  {t('Average storage consumption')}
                </Content>
                {avgUtilMetricByte.string}
              </FlexItem>
              <FlexItem flex={{ default: 'flex_1' }}>
                <Content component={ContentVariants.h4}>
                  {t('Estimated days until full')}
                </Content>
                {daysLeft} {pluralize(daysLeft, t('day'), t('days'), false)}
              </FlexItem>
            </Flex>
            <Flex>
              <FieldLevelHelp
                position={PopoverPosition.right}
                buttonText={t('Understanding these terms')}
                popoverHasAutoWidth
              >
                {understandingToolTip(t)}
              </FieldLevelHelp>
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
