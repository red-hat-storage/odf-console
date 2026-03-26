import * as React from 'react';
import {
  IBM_SCALE_NAMESPACE,
  IBM_SCALE_OPERATOR_NAME,
} from '@odf/core/constants';
import { RemoteClusterKind } from '@odf/core/types/scale';
import {
  ClusterServiceVersionKind,
  ClusterServiceVersionModel,
  getName,
  useCustomTranslation,
} from '@odf/shared';
import HealthItem from '@odf/shared/dashboards/status-card/HealthItem';
import { RemoteClusterModel } from '@odf/shared/models/scale';
import { getOperatorHealthState, referenceForModel } from '@odf/shared/utils';
import {
  HealthState,
  useK8sWatchResource,
} from '@openshift-console/dynamic-plugin-sdk';
import { useParams } from 'react-router-dom-v5-compat';
import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Gallery,
  GalleryItem,
} from '@patternfly/react-core';

const getRemoteClusterConnectionHealth = (
  remoteCluster: RemoteClusterKind,
  loading: boolean,
  loadError: any
) => {
  if (loading) {
    return HealthState.LOADING;
  }
  if (loadError) {
    return HealthState.ERROR;
  }
  if (!remoteCluster) {
    return HealthState.NOT_AVAILABLE;
  }
  const remoteClusterConnectionStatus = remoteCluster?.status?.conditions?.find(
    (condition) => condition.type === 'Available'
  )?.status;
  return remoteClusterConnectionStatus === 'True'
    ? HealthState.OK
    : HealthState.ERROR;
};

const StatusCard: React.FC<{}> = () => {
  const { t } = useCustomTranslation();
  const { systemName } = useParams();
  const [csvs, csvsLoaded, csvsLoadError] = useK8sWatchResource<
    ClusterServiceVersionKind[]
  >({
    kind: referenceForModel(ClusterServiceVersionModel),
    namespaced: true,
    isList: true,
    namespace: IBM_SCALE_NAMESPACE,
  });

  const [remoteCluster, remoteClustersLoaded, remoteClustersLoadError] =
    useK8sWatchResource<RemoteClusterKind>({
      kind: referenceForModel(RemoteClusterModel),
      isList: false,
      namespace: IBM_SCALE_NAMESPACE,
      name: systemName,
    });

  const ibmCSV = csvs?.find((csv) =>
    getName(csv).includes(IBM_SCALE_OPERATOR_NAME)
  );
  const flashOperator = getOperatorHealthState(
    ibmCSV?.status?.phase,
    !csvsLoaded,
    csvsLoadError
  );

  const remoteClusterConnectionHealth = getRemoteClusterConnectionHealth(
    remoteCluster,
    !remoteClustersLoaded,
    remoteClustersLoadError
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('Status')}</CardTitle>
      </CardHeader>
      <CardBody>
        <Gallery hasGutter>
          <GalleryItem>
            <HealthItem title={t('Operator')} state={flashOperator.state} />
          </GalleryItem>
          <GalleryItem>
            <HealthItem
              title={t('Connection')}
              state={remoteClusterConnectionHealth}
            />
          </GalleryItem>
        </Gallery>
      </CardBody>
    </Card>
  );
};

export default StatusCard;
