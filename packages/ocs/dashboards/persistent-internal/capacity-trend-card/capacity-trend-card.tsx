import * as React from 'react';
import { useODFSystemFlagsSelector } from '@odf/core/redux';
import { GraphEmpty } from '@odf/shared/charts';
import { PrometheusUtilizationItem } from '@odf/shared/dashboards';
import { dateFormatter } from '@odf/shared/details-page/datetime';
import { FieldLevelHelp } from '@odf/shared/generic';
import { DataUnavailableError } from '@odf/shared/generic/Error';
import {
  useCustomPrometheusPoll,
  usePrometheusBasePath,
} from '@odf/shared/hooks/custom-prometheus-poll';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { getInstantVectorStats, humanizeBinaryBytes } from '@odf/shared/utils';
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

  const [availableCapacity, availableCapacityError, availableCapacityLoading] =
    useCustomPrometheusPoll({
      query:
        CAPACITY_TREND_QUERIES(ocsCluster)[
          StorageDashboardQuery.RAW_CAPACITY_AVAILABLE
        ],
      endpoint: 'api/v1/query' as any,
      basePath: usePrometheusBasePath(),
    });

  const [uptimeDay, uptimeDayError, uptimeDayLoading] = useCustomPrometheusPoll(
    {
      query:
        CAPACITY_TREND_QUERIES(ocsCluster)[StorageDashboardQuery.UPTIME_DAYS],
      endpoint: 'api/v1/query' as any,
      basePath: usePrometheusBasePath(),
    }
  );
  const uptimeDayMetric = parser(uptimeDay);

  const [totalUtil, totalUtilError, totalUtilLoading] = useCustomPrometheusPoll(
    {
      query: CAPACITY_TREND_QUERIES(ocsCluster, uptimeDayMetric)[
        StorageDashboardQuery.UTILIZATION_VECTOR
      ],
      endpoint: 'api/v1/query' as any,
      basePath: usePrometheusBasePath(),
    }
  );

  const loadError = availableCapacityError || uptimeDayError || totalUtilError;
  const loading =
    availableCapacityLoading || uptimeDayLoading || totalUtilLoading;

  const totalUtilMetric = parser(totalUtil);
  const avgUtilMetric = totalUtilMetric / uptimeDayMetric;
  const avgUtilMetricByte = humanizeBinaryBytes(avgUtilMetric.toFixed(0));

  const availableCapacityMetric = parser(availableCapacity);
  const daysLeft = Math.floor(availableCapacityMetric / avgUtilMetric);

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
                    {t('Over the past {{uptimeDayMetric}} days', {
                      uptimeDayMetric: uptimeDayMetric,
                    })}
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
                  chartType="grouped-line"
                  hideCurrentHumanized={true}
                  formatDate={
                    uptimeDayMetric > 1 ? dateFormatter.format : undefined
                  }
                  showLegend={false}
                  timespan={uptimeDayMetric * 24 * 60 * 60}
                />
              </FlexItem>
              <FlexItem
                flex={{ default: 'flex_1' }}
                alignSelf={{ default: 'alignSelfCenter' }}
                spacer={{ default: 'spacerLg' }}
              >
                <Text component={TextVariants.h4}>{t('Average')}</Text>
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
                {daysLeft}
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
