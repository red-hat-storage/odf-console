import * as React from 'react';
import {
  HUB_CLUSTER_NAME,
  ODFMCO_OPERATOR,
  ODR_CLUSTER_OPERATOR,
  ODR_HUB_OPERATOR,
  VOL_SYNC,
} from '@odf/mco/constants';
import HealthItem from '@odf/shared/dashboards/status-card/HealthItem';
import {
  ClusterServiceVersionKind,
  ClusterServiceVersionPhase,
} from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { getOperatorHealthState } from '@odf/shared/utils';
import {
  HealthState,
  WatchK8sResource,
  useK8sWatchResource,
  PrometheusResponse,
} from '@openshift-console/dynamic-plugin-sdk';
import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Gallery,
  GalleryItem,
} from '@patternfly/react-core';
import { DrClusterAppsMap } from '../../../../types';
import {
  CSVStatusesContext,
  DRResourcesContext,
} from '../dr-dashboard-context';

const operatorResource: WatchK8sResource = {
  kind: 'operators.coreos.com~v1alpha1~ClusterServiceVersion',
  namespace: 'openshift-storage',
  isList: true,
  cluster: HUB_CLUSTER_NAME,
};
const drOperators: string[] = [ODFMCO_OPERATOR, ODR_HUB_OPERATOR];
const clusterOperators: string[] = [ODR_CLUSTER_OPERATOR, VOL_SYNC];

const getDRCombinedStatus = (
  csvHubData: ClusterServiceVersionKind[],
  csvHubLoaded: boolean,
  csvHubError: any
) => {
  const operatorsPhase = drOperators.map(
    (drOperator) =>
      csvHubData?.find((csv) => csv.metadata.name.startsWith(drOperator))
        ?.status?.phase
  );
  const worstPhase =
    operatorsPhase?.find(
      (phase) => phase !== ClusterServiceVersionPhase.CSVPhaseSucceeded
    ) || ClusterServiceVersionPhase.CSVPhaseSucceeded;
  return getOperatorHealthState(worstPhase, !csvHubLoaded, csvHubError);
};

const getClustersOperatorHealth = (
  csvManagedData: PrometheusResponse,
  drClusterAppsMap: DrClusterAppsMap
) => {
  const drClusters = Object.keys(drClusterAppsMap);
  const clusterWiseHealth: ClusterWiseHealth =
    csvManagedData?.data?.result?.reduce((acc, item) => {
      const cluster = item?.metric.cluster;
      let count = acc?.[cluster] || 0;
      acc =
        drClusters.includes(cluster) &&
        !!clusterOperators.find((operator: string) =>
          item?.metric.name.startsWith(operator)
        )
          ? { ...acc, [cluster]: item?.value[1] !== '1' ? count : count + 1 }
          : acc;
      return acc;
    }, {});
  return drClusters?.every(
    (cluster) => clusterWiseHealth?.[cluster] === clusterOperators.length
  )
    ? HealthState.OK
    : HealthState.ERROR;
};

export const StatusCard: React.FC = () => {
  const { t } = useCustomTranslation();
  const [csvHubData, csvHubLoaded, csvHubError] =
    useK8sWatchResource<ClusterServiceVersionKind[]>(operatorResource);

  const {
    csvData: csvManagedData,
    csvError: csvManagedError,
    csvLoading: csvManagedLoading,
  } = React.useContext(CSVStatusesContext);
  const { drClusterAppsMap, loaded, loadError } =
    React.useContext(DRResourcesContext);

  // combined status of all DR hub operators (odr-hub and odf-mco)
  const drOperatorsHealthStatus = getDRCombinedStatus(
    csvHubData,
    csvHubLoaded,
    csvHubError
  ).state;
  const allManagedLoaded = loaded && !csvManagedLoading;
  const anyManagedError = csvManagedError || loadError;
  // combined status of all cluster operators (odr-cluster and vol-sync)
  const clusterOperatorHealthStatus = React.useMemo(() => {
    if (!allManagedLoaded && !anyManagedError) return HealthState.LOADING;
    if (anyManagedError) return HealthState.NOT_AVAILABLE;
    return getClustersOperatorHealth(csvManagedData, drClusterAppsMap);
  }, [csvManagedData, drClusterAppsMap, allManagedLoaded, anyManagedError]);

  return (
    <Card data-test="operator-status-card">
      <CardHeader>
        <CardTitle>{t('Operator status')}</CardTitle>
      </CardHeader>
      <CardBody>
        <Gallery hasGutter>
          <GalleryItem>
            <HealthItem
              title={t('Disaster recovery')}
              state={drOperatorsHealthStatus}
            />
          </GalleryItem>
          <GalleryItem>
            <HealthItem
              title={t('Cluster operator')}
              state={clusterOperatorHealthStatus}
            />
          </GalleryItem>
        </Gallery>
      </CardBody>
    </Card>
  );
};

type ClusterWiseHealth = {
  [name in string]: number;
};
