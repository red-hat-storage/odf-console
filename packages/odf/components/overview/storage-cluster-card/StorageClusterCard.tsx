import * as React from 'react';
import { useRawCapacity, useSafeK8sWatchResource } from '@odf/core/hooks';
import { useODFNamespaceSelector } from '@odf/core/redux/selectors';
import {
  odfSubscriptionResource,
  storageClusterResource,
} from '@odf/core/resources';
import { getStorageClusterInNs } from '@odf/core/utils';
import { DANGER_THRESHOLD, WARNING_THRESHOLD } from '@odf/ocs/constants/charts';
import { useGetOCSHealth } from '@odf/ocs/hooks/useOcsHealth';
import { resiliencyProgressQuery, StatusCardQueries } from '@odf/ocs/queries';
import { getDataResiliencyState } from '@odf/ocs/utils';
import {
  DASH,
  getName,
  healthStateMapping,
  healthStateMessage,
  ODF_OPERATOR,
  StorageClusterKind,
  SubscriptionKind,
  useFetchCsv,
} from '@odf/shared';
import { ErrorCardBody } from '@odf/shared/generic/ErrorCardBody';
import {
  useCustomPrometheusPoll,
  usePrometheusBasePath,
} from '@odf/shared/hooks/custom-prometheus-poll';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  getOprChannelFromSub,
  getOprVersionFromCSV,
  getStorageClusterMetric,
  humanizeBinaryBytes,
} from '@odf/shared/utils';
import {
  HealthState,
  useK8sWatchResource,
} from '@openshift-console/dynamic-plugin-sdk';
import { chart_color_blue_100 as general2 } from '@patternfly/react-tokens/dist/js/chart_color_blue_100';
import { chart_color_blue_300 as general1 } from '@patternfly/react-tokens/dist/js/chart_color_blue_300';
import { global_danger_color_100 as danger1 } from '@patternfly/react-tokens/dist/js/global_danger_color_100';
import { global_warning_color_100 as warning1 } from '@patternfly/react-tokens/dist/js/global_warning_color_100';
import classNames from 'classnames';
import * as _ from 'lodash-es';
import { useNavigate } from 'react-router-dom-v5-compat';
import { ChartDonut, ChartLabel, ChartLegend } from '@patternfly/react-charts';
import {
  DescriptionList,
  DescriptionListTerm,
  DescriptionListGroup,
  DescriptionListDescription,
  Button,
  ButtonVariant,
  Skeleton,
} from '@patternfly/react-core';
import {
  Card,
  CardBody,
  CardHeader,
  CardProps,
  CardTitle,
  Grid,
  GridItem,
} from '@patternfly/react-core';
import { ArrowRightIcon } from '@patternfly/react-icons';
import './StorageClusterCard.scss';

const generalColorScale = [general1.value, general2.value];
const warningColorScale = [warning1.value, general2.value];
const dangerColorScale = [danger1.value, general2.value];

export const StorageClusterCard: React.FC<CardProps> = ({ className }) => {
  const { t } = useCustomTranslation();
  const navigate = useNavigate();
  const [storageClusters, storageClustersLoaded, storageClustersError] =
    useK8sWatchResource<StorageClusterKind[]>(storageClusterResource);
  const { odfNamespace, isNsSafe } = useODFNamespaceSelector();
  const [csv, csvLoaded, csvError] = useFetchCsv({
    specName: ODF_OPERATOR,
    namespace: odfNamespace,
    startPollingInstantly: isNsSafe,
  });
  const [subscription, subscriptionLoaded, subscriptionError] =
    useSafeK8sWatchResource<SubscriptionKind>(odfSubscriptionResource);

  const storageCluster = getStorageClusterInNs(storageClusters, odfNamespace);
  const clusterName = getName(storageCluster);

  const { healthState, message: healthMessage } =
    useGetOCSHealth(storageCluster);

  const [totalCapacity, usedCapacity, capacityLoading, capacityLoadError] =
    useRawCapacity(clusterName);
  const [cephResiliencyProgress, cephResiliencyProgressError] =
    useCustomPrometheusPoll({
      query: resiliencyProgressQuery(clusterName),
      endpoint: 'api/v1/query' as any,
      basePath: usePrometheusBasePath(),
    });

  const [objectResiliencyProgress, objectResiliencyProgressError] =
    useCustomPrometheusPoll({
      query: StatusCardQueries.MCG_REBUILD_PROGRESS_QUERY,
      endpoint: 'api/v1/query' as any,
      basePath: usePrometheusBasePath(),
    });

  const objectResiliencyState = getDataResiliencyState(
    [
      {
        response: objectResiliencyProgress,
        error: objectResiliencyProgressError,
      },
    ],
    t
  );
  const cephDataResiliencyState = getDataResiliencyState(
    [{ response: cephResiliencyProgress, error: cephResiliencyProgressError }],
    t
  );
  const healthIcon = healthStateMapping?.[healthState]?.icon;
  const cephResiliencyMessage =
    cephDataResiliencyState.state === HealthState.OK
      ? t('Healthy')
      : healthStateMessage(cephDataResiliencyState.state, t);
  const cephResiliencyIcon =
    healthStateMapping?.[cephDataResiliencyState.state]?.icon;
  const objectResiliencyMessage =
    objectResiliencyState.state === HealthState.OK
      ? t('Healthy')
      : healthStateMessage(objectResiliencyState.state, t);
  const objectResiliencyIcon =
    healthStateMapping?.[objectResiliencyState.state]?.icon;

  const odfVersion =
    csvLoaded && _.isEmpty(csvError) ? getOprVersionFromCSV(csv) : DASH;

  const clusterVersionChannel =
    subscriptionLoaded && !subscriptionError
      ? getOprChannelFromSub(subscription)
      : DASH;

  const usedCapacityData = getStorageClusterMetric(
    usedCapacity,
    clusterName,
    odfNamespace
  );
  const totalCapacityData = getStorageClusterMetric(
    totalCapacity,
    clusterName,
    odfNamespace
  );
  const totalCapacityValue = humanizeBinaryBytes(totalCapacityData?.value?.[1]);
  const showCapacityChart =
    !capacityLoading && !capacityLoadError && totalCapacityValue.value > 0;
  const usedCapacityValue = humanizeBinaryBytes(
    usedCapacityData?.value?.[1],
    null,
    totalCapacityValue?.unit
  );
  const usedCapacityNotRelativeToTotal = humanizeBinaryBytes(
    usedCapacityData?.value?.[1]
  );
  const availableCapacityValue = humanizeBinaryBytes(
    !!usedCapacityData?.value?.[1] && !!totalCapacityData?.value?.[1]
      ? Number(totalCapacityData.value?.[1]) -
          Number(usedCapacityData.value?.[1])
      : 0,
    null,
    totalCapacityValue?.unit
  );
  const donutData = [
    { x: 'Used', y: usedCapacityValue.value, string: usedCapacityValue.string },
    {
      x: 'Available',
      y: availableCapacityValue.value,
      string: availableCapacityValue.string,
    },
  ];

  const capacityRatio = parseFloat(
    (usedCapacityValue.value / totalCapacityValue.value).toFixed(2)
  );

  const colorScale = React.useMemo(() => {
    if (capacityRatio > DANGER_THRESHOLD) return dangerColorScale;
    if (capacityRatio > WARNING_THRESHOLD && capacityRatio <= DANGER_THRESHOLD)
      return warningColorScale;
    return generalColorScale;
  }, [capacityRatio]);

  return (
    <Card className={classNames(className)} isFlat={true}>
      <CardHeader>
        <CardTitle>{t('Storage cluster')}</CardTitle>
      </CardHeader>
      <CardBody>
        {storageClustersLoaded && !storageClustersError && !!storageCluster && (
          <Grid hasGutter>
            <GridItem md={4} sm={12}>
              <DescriptionList>
                <DescriptionListGroup>
                  <DescriptionListTerm>
                    {t('Cluster Status')}
                  </DescriptionListTerm>
                  <DescriptionListDescription>
                    {healthIcon}
                    <span className="pf-v5-u-ml-xs">{healthMessage}</span>
                  </DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>
                    {t('Block and File Resiliency')}
                  </DescriptionListTerm>
                  <DescriptionListDescription>
                    {cephResiliencyIcon}
                    <span className="pf-v5-u-ml-xs">
                      {cephResiliencyMessage}
                    </span>
                  </DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>
                    {t('Object Resiliency')}
                  </DescriptionListTerm>
                  <DescriptionListDescription>
                    {objectResiliencyIcon}
                    <span className="pf-v5-u-ml-xs">
                      {objectResiliencyMessage}
                    </span>
                  </DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>
                    {t('Data Foundation version')}
                  </DescriptionListTerm>
                  <DescriptionListDescription>
                    {odfVersion}
                  </DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>
                    {t('Update channel')}
                  </DescriptionListTerm>
                  <DescriptionListDescription>
                    {clusterVersionChannel}
                  </DescriptionListDescription>
                </DescriptionListGroup>
              </DescriptionList>
            </GridItem>
            <GridItem
              md={8}
              rowSpan={2}
              sm={12}
              className="odf-cluster-card__chart-container"
            >
              {showCapacityChart ? (
                <ChartDonut
                  ariaDesc={t('Available versus Used Capacity')}
                  ariaTitle={t('Available versus Used Capacity')}
                  height={150}
                  width={300}
                  data={donutData}
                  labels={({ datum }) => `${datum.string}`}
                  title={usedCapacityNotRelativeToTotal.value}
                  subTitle={usedCapacityNotRelativeToTotal.unit}
                  colorScale={colorScale}
                  padding={{ top: 0, bottom: 0, left: 0, right: 140 }}
                  constrainToVisibleArea
                  titleComponent={
                    <ChartLabel
                      className="odf-cluster-card__chart-title"
                      style={{
                        fill: 'var(--pf-v5-global--Color--100)',
                        fontSize: 20,
                      }}
                    />
                  }
                  subTitleComponent={
                    <ChartLabel
                      className="odf-cluster-card__chart-subtitle"
                      style={{ fill: 'var(--pf-v5-global--Color--200)' }}
                      dy={5}
                    />
                  }
                  legendComponent={
                    <ChartLegend
                      orientation="vertical"
                      gutter={20}
                      style={{
                        labels: { fill: 'var(--pf-v5-global--Color--200)' },
                      }}
                    />
                  }
                  legendData={[
                    {
                      name: `${t('Used')}: ${usedCapacityNotRelativeToTotal.string}`,
                    },
                    {
                      name: `${t('Available')}: ${availableCapacityValue.string}`,
                    },
                  ]}
                  legendOrientation="vertical"
                  legendPosition="right"
                />
              ) : (
                <>{t('No capacity data available.')}</>
              )}
            </GridItem>
            <GridItem md={4} sm={12}>
              <Button
                variant={ButtonVariant.link}
                icon={<ArrowRightIcon />}
                iconPosition="end"
                className="pf-v5-u-font-size-lg odf-cluster-card__storage-link"
                component="a"
                onClick={() => navigate('/odf/storage-cluster')}
              >
                {t('View storage')}
              </Button>
            </GridItem>
          </Grid>
        )}
        {storageClustersLoaded && !storageClustersError && !storageCluster && (
          <ErrorCardBody title={t('No storage cluster configured.')} />
        )}
        {!storageClustersLoaded && !storageClustersError && (
          <Skeleton
            height="100%"
            screenreaderText={t('Loading storage cluster data')}
          />
        )}
        {storageClustersError && (
          <ErrorCardBody title={t('Storage cluster data not available.')} />
        )}
      </CardBody>
    </Card>
  );
};
