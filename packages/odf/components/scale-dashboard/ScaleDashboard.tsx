import * as React from 'react';
import { IBM_SCALE_NAMESPACE } from '@odf/core/constants';
import { RemoteClusterKind } from '@odf/core/types/scale';
import {
  RemoteClusterModel,
  Kebab,
  PageHeading,
  useCustomTranslation,
} from '@odf/shared';
import { ModalKeys } from '@odf/shared/modals';
import {
  Overview,
  OverviewGrid,
  OverviewGridCard,
  useK8sWatchResource,
} from '@openshift-console/dynamic-plugin-sdk';
import type { TFunction } from 'i18next';
import { useParams } from 'react-router-dom-v5-compat';
import ActivityCard from './ActivityCard';
import CapacityCard from './CapacityCard';
import DetailsCard from './DetailsCard';
import FileSystemCard from './FileSystems';
import StatusCard from './StatusCard';

const scaleDashboardActions = (
  t: TFunction,
  clusterResource: RemoteClusterKind
) => {
  const actions = [
    {
      key: 'ADD_REMOTE_FILE_SYSTEM',
      value: t('Add remote FileSystem'),
      component: React.lazy(
        () => import('../../modals/add-remote-fs/AddRemoteFileSystemModal')
      ),
    },
  ];
  return (
    <Kebab
      extraProps={{
        resource: clusterResource,
        resourceModel: RemoteClusterModel,
      }}
      customKebabItems={actions}
      toggleType="Dropdown"
      hideItems={[
        ModalKeys.EDIT_RES,
        ModalKeys.DELETE,
        ModalKeys.EDIT_ANN,
        ModalKeys.EDIT_LABELS,
      ]}
    />
  );
};

const ScaleDashboard: React.FC = () => {
  const { t } = useCustomTranslation();
  const mainCards: OverviewGridCard[] = [
    { Card: StatusCard },
    { Card: CapacityCard },
    { Card: FileSystemCard },
  ];

  const { systemName } = useParams<{ systemName: string }>();
  const [resource] = useK8sWatchResource<RemoteClusterKind>({
    groupVersionKind: {
      group: RemoteClusterModel.apiGroup,
      version: RemoteClusterModel.apiVersion,
      kind: RemoteClusterModel.kind,
    },
    name: systemName,
    namespace: IBM_SCALE_NAMESPACE,
    isList: false,
  });

  const leftCards: OverviewGridCard[] = [{ Card: DetailsCard }];

  const rightCards: OverviewGridCard[] = [{ Card: ActivityCard }];

  return (
    <>
      <PageHeading
        title={t('Scale Dashboard')}
        hasUnderline={false}
        breadcrumbs={[
          {
            name: t('External systems'),
            path: '/odf/external-systems',
          },
          {
            name: t('IBM Scale'),
            path: '',
          },
        ]}
        actions={() => scaleDashboardActions(t, resource)}
      />
      <Overview>
        <OverviewGrid
          mainCards={mainCards}
          leftCards={leftCards}
          rightCards={rightCards}
        />
      </Overview>
    </>
  );
};

export default ScaleDashboard;
