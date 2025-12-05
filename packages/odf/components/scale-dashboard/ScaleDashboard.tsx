import * as React from 'react';
import {
  ClusterModel,
  Kebab,
  PageHeading,
  useCustomTranslation,
} from '@odf/shared';
import { ModalKeys } from '@odf/shared/modals';
import {
  Overview,
  OverviewGrid,
  OverviewGridCard,
} from '@openshift-console/dynamic-plugin-sdk';
import { TFunction } from 'react-i18next';
import ActivityCard from './ActivityCard';
import CapacityCard from './CapacityCard';
import DetailsCard from './DetailsCard';
import FileSystemCard from './FileSystems';
import StatusCard from './StatusCard';

const scaleDashboardActions = (t: TFunction) => {
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
        resource: null,
        resourceModel: ClusterModel,
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
        actions={() => scaleDashboardActions(t)}
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
