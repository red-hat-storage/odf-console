import * as React from 'react';
import {
  ODFMCO_OPERATOR,
  ODFMCO_OPERATOR_NAMESPACE,
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
  ContentVariants,
  Content,
} from '@patternfly/react-core';
import { DRClusterAppsMap } from '../../../../types';
import {
  OperatorStatusesContext,
  DRResourcesContext,
} from '../dr-dashboard-context';
import './status-card.scss';

const operatorResource: WatchK8sResource = {
  kind: 'operators.coreos.com~v1alpha1~ClusterServiceVersion',
  namespace: ODFMCO_OPERATOR_NAMESPACE,
  isList: true,
};
const drOperators: string[] = [ODFMCO_OPERATOR, ODR_HUB_OPERATOR];
const clusterCSVOperators: string[] = [ODR_CLUSTER_OPERATOR];
// Monitoring non CSV operator as POD
const clusterPodOperators: string[] = [VOL_SYNC];

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

const getClusterWiseHealth = (
  prometheusResponse: PrometheusResponse,
  operators: string[],
  label: string,
  drClusters: string[],
  clusterHealthStatus: ClusterWiseHealth
): ClusterWiseHealth => {
  return prometheusResponse?.data?.result?.reduce((acc, item) => {
    const cluster = item?.metric.cluster;
    let count = acc?.[cluster] || 0;
    acc =
      drClusters.includes(cluster) &&
      !!operators.find((operator: string) =>
        item?.metric?.[label].startsWith(operator)
      )
        ? { ...acc, [cluster]: item?.value[1] !== '1' ? count : count + 1 }
        : acc;
    return acc;
  }, clusterHealthStatus);
};

const getClustersOperatorHealth = (
  csvManagedData: PrometheusResponse,
  drClusterAppsMap: DRClusterAppsMap,
  podManagedData: PrometheusResponse
) => {
  const drClusters = Object.keys(drClusterAppsMap);
  // Create cluster wise health map
  let clusterWiseHealth: ClusterWiseHealth = getClusterWiseHealth(
    csvManagedData,
    clusterCSVOperators,
    'name',
    drClusters,
    {}
  );
  // Update cluster wise health map
  clusterWiseHealth = getClusterWiseHealth(
    podManagedData,
    clusterPodOperators,
    'pod',
    drClusters,
    clusterWiseHealth
  );
  return drClusters?.every(
    (cluster) =>
      clusterWiseHealth?.[cluster] ===
      clusterCSVOperators.length + clusterPodOperators.length
  )
    ? HealthState.OK
    : HealthState.ERROR;
};

export const StatusCard: React.FC = () => {
  const { t } = useCustomTranslation();
  const [csvHubData, csvHubLoaded, csvHubError] =
    useK8sWatchResource<ClusterServiceVersionKind[]>(operatorResource);

  const {
    csvStatus: {
      data: csvManagedData,
      error: csvManagedError,
      loading: csvManagedLoading,
    },
    podStatus: {
      data: podManagedData,
      error: podManagedError,
      loading: podManagedLoading,
    },
  } = React.useContext(OperatorStatusesContext);

  const { drClusterAppsMap, loaded, loadError } =
    React.useContext(DRResourcesContext);

  // combined status of all DR hub operators (odr-hub and odf-mco)
  const drOperatorsHealthStatus = getDRCombinedStatus(
    csvHubData,
    csvHubLoaded,
    csvHubError
  ).state;
  const allManagedLoaded = loaded && !csvManagedLoading && !podManagedLoading;
  const anyManagedError = csvManagedError || loadError || podManagedError;
  // combined status of all cluster operators (odr-cluster and vol-sync)
  const clusterOperatorHealthStatus = React.useMemo(() => {
    if (!allManagedLoaded && !anyManagedError) return HealthState.LOADING;
    if (anyManagedError) return HealthState.NOT_AVAILABLE;
    return getClustersOperatorHealth(
      csvManagedData,
      drClusterAppsMap,
      podManagedData
    );
  }, [
    csvManagedData,
    drClusterAppsMap,
    allManagedLoaded,
    anyManagedError,
    podManagedData,
  ]);

  return (
    <Card data-test="operator-status-card">
      <CardHeader className="mco-status__text--divider">
        <CardTitle>
          <Content component={ContentVariants.h3}>
            {t('Operator status')}
          </Content>
        </CardTitle>
      </CardHeader>
      <CardBody>
        <Gallery hasGutter>
          <GalleryItem>
            <HealthItem
              title={t('Disaster recovery')}
              state={drOperatorsHealthStatus}
              className="mco-dashboard__statusText--size"
            />
          </GalleryItem>
          <GalleryItem>
            <HealthItem
              title={t('Cluster operator')}
              state={clusterOperatorHealthStatus}
              className="mco-dashboard__statusText--size"
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
