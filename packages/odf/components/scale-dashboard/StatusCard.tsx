import * as React from 'react';
import {
  IBM_SCALE_NAMESPACE,
  IBM_SCALE_OPERATOR_NAME,
} from '@odf/core/constants';
import { FileSystemKind } from '@odf/core/types/scale';
import {
  ClusterServiceVersionKind,
  ClusterServiceVersionModel,
  useCustomTranslation,
} from '@odf/shared';
import HealthItem from '@odf/shared/dashboards/status-card/HealthItem';
import { FileSystemModel } from '@odf/shared/models/scale';
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

const getAggregateFileSystemHealth = (
  fileSystems: FileSystemKind[],
  loading: boolean,
  loadError: any
): HealthState => {
  if (loading) {
    return HealthState.LOADING;
  }
  if (loadError) {
    return HealthState.ERROR;
  }
  const fileSystemHealth = fileSystems?.map(
    (fileSystem) => fileSystem.status.conditions[0].status
  );
  if (fileSystemHealth.every((health) => health === HealthState.OK)) {
    return HealthState.OK;
  }
  if (fileSystemHealth.some((health) => health === HealthState.ERROR)) {
    return HealthState.WARNING;
  }
  return HealthState.OK;
};

const StatusCard: React.FC<{}> = () => {
  const { t } = useCustomTranslation();
  const [csvs, csvsLoaded, csvsLoadError] = useK8sWatchResource<
    ClusterServiceVersionKind[]
  >({
    kind: referenceForModel(ClusterServiceVersionModel),
    namespaced: true,
    isList: true,
    namespace: IBM_SCALE_NAMESPACE,
  });

  const [fileSystems, fileSystemsLoaded, fileSystemsLoadError] =
    useK8sWatchResource<FileSystemKind[]>({
      kind: referenceForModel(FileSystemModel),
      isList: true,
    });

  const ibmCSV = csvs?.find((csv) =>
    csv.metadata.name.includes(IBM_SCALE_OPERATOR_NAME)
  );
  const flashOperator = getOperatorHealthState(
    ibmCSV?.status?.phase,
    !csvsLoaded,
    csvsLoadError
  );
  const aggregateFileSystemHealth = getAggregateFileSystemHealth(
    fileSystems,
    !fileSystemsLoaded,
    fileSystemsLoadError
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
              title={t('Connected')}
              state={aggregateFileSystemHealth}
            />
          </GalleryItem>
        </Gallery>
      </CardBody>
    </Card>
  );
};

export default StatusCard;
