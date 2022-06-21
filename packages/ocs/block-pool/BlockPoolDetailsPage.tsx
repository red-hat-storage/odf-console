import * as React from 'react';
import DetailsPage from '@odf/shared/details-page/DetailsPage';
import { LoadingBox } from '@odf/shared/generic/status-box';
import { Kebab } from '@odf/shared/kebab/kebab';
import { useModalLauncher } from '@odf/shared/modals/modalLauncher';
import { referenceForModel } from '@odf/shared/utils';
import { EventStreamWrapped, YAMLEditorWrapped } from '@odf/shared/utils/Tabs';
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';
import { useTranslation } from 'react-i18next';
import { RouteComponentProps, useLocation } from 'react-router-dom';
import { CEPH_NS } from '../constants';
import { BlockPoolDashboard } from '../dashboards/block-pool/block-pool-dashboard';
import { CephBlockPoolModel, CephClusterModel } from '../models';
import { StoragePoolKind } from '../types';

type BlockPoolDetailsPageProps = {
  match: RouteComponentProps<{ poolName: string }>['match'];
  namespace?: string;
};

export const cephClusterResource = {
  kind: referenceForModel(CephClusterModel),
  namespaced: false,
  isList: true,
};

export const BlockPoolDetailsPage: React.FC<BlockPoolDetailsPageProps> = ({
  match,
}) => {
  const { t } = useTranslation();

  const { poolName } = match.params;
  const location = useLocation();
  const kind = referenceForModel(CephBlockPoolModel);

  const [Modal, modalProps, launchModal] = useModalLauncher();

  const [resource, loaded] = useK8sWatchResource<StoragePoolKind>({
    kind,
    name: poolName,
    namespace: CEPH_NS,
    isList: false,
  });

  const breadcrumbs = [
    {
      name: t('StorageSystems'),
      path: '/odf/systems',
    },
    {
      name: t('StorageSystem details'),
      path: location.pathname.split(`/${kind}`)[0],
    },
    {
      name: poolName,
      path: '',
    },
  ];

  const actions = React.useCallback(() => {
    return (
      <Kebab
        toggleType="Dropdown"
        launchModal={launchModal}
        extraProps={{
          resource,
          resourceModel: CephBlockPoolModel,
          namespace: CEPH_NS,
        }}
      />
    );
  }, [launchModal, resource]);

  return (
    <>
      <Modal {...modalProps} />
      {!loaded ? (
        <LoadingBox />
      ) : (
        <DetailsPage
          breadcrumbs={breadcrumbs}
          actions={actions}
          resourceModel={CephBlockPoolModel}
          resource={resource}
          pages={[
            {
              href: '',
              name: 'Details',
              component: BlockPoolDashboard as any,
            },
            {
              href: 'yaml',
              name: 'YAML',
              component: YAMLEditorWrapped,
            },
            {
              href: 'events',
              name: 'Events',
              component: EventStreamWrapped,
            },
          ]}
        />
      )}
    </>
  );
};

export default BlockPoolDetailsPage;
