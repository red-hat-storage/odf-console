import * as React from 'react';
import {
  IBM_SCALE_NAMESPACE,
  IBM_SCALE_OPERATOR_NAME,
} from '@odf/core/constants';
import { ClusterKind } from '@odf/core/types/scale';
import { useCustomTranslation, useFetchCsv } from '@odf/shared';
import HealthItem from '@odf/shared/dashboards/status-card/HealthItem';
import { ClusterModel as SANClusterModel } from '@odf/shared/models/scale';
import { getOperatorHealthState, referenceForModel } from '@odf/shared/utils';
import {
  HealthState,
  useK8sWatchResource,
} from '@openshift-console/dynamic-plugin-sdk';
import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Gallery,
  GalleryItem,
} from '@patternfly/react-core';

const getLocalClusterHealth = (
  cluster: ClusterKind,
  loading: boolean,
  loadError: any
) => {
  if (loading) {
    return HealthState.LOADING;
  }
  if (loadError) {
    return HealthState.ERROR;
  }
  if (!cluster) {
    return HealthState.NOT_AVAILABLE;
  }
  const clusterConnectionStatus = cluster?.status?.conditions?.find(
    (condition) => condition.type === 'Success'
  ).status;
  return clusterConnectionStatus === 'True'
    ? HealthState.OK
    : HealthState.ERROR;
};

const StatusCard: React.FC<{}> = () => {
  const { t } = useCustomTranslation();
  const [ibmCSV, ibmCsvLoaded, ibmCsvLoadError] = useFetchCsv({
    specName: IBM_SCALE_OPERATOR_NAME,
    namespace: IBM_SCALE_NAMESPACE,
  });

  const [localCluster, localClusterLoaded, localClusterLoadError] =
    useK8sWatchResource<ClusterKind[]>({
      kind: referenceForModel(SANClusterModel),
      isList: true,
      namespace: IBM_SCALE_NAMESPACE,
    });

  const flashOperator = getOperatorHealthState(
    ibmCSV?.status?.phase,
    !ibmCsvLoaded,
    ibmCsvLoadError
  );

  const localClusterHealth = getLocalClusterHealth(
    localCluster?.[0],
    !localClusterLoaded,
    localClusterLoadError
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
            <HealthItem title={t('Connection')} state={localClusterHealth} />
          </GalleryItem>
        </Gallery>
      </CardBody>
    </Card>
  );
};

export default StatusCard;
