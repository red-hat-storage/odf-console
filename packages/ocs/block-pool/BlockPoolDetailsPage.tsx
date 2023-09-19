import * as React from 'react';
import DetailsPage from '@odf/shared/details-page/DetailsPage';
import { LoadingBox } from '@odf/shared/generic/status-box';
import { Kebab } from '@odf/shared/kebab/kebab';
import { ModalKeys } from '@odf/shared/modals/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { referenceForModel } from '@odf/shared/utils';
import { EventStreamWrapped, YAMLEditorWrapped } from '@odf/shared/utils/Tabs';
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';
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
  const { t } = useCustomTranslation();

  const { poolName } = match.params;
  const location = useLocation();
  const kind = referenceForModel(CephBlockPoolModel);

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
      path: `${location.pathname.split(`/${kind}`)[0]}/${kind}`,
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
        extraProps={{
          resource,
          resourceModel: CephBlockPoolModel,
          namespace: CEPH_NS,
        }}
        customKebabItems={[
          {
            key: ModalKeys.EDIT_RES,
            value: t('Edit BlockPool'),
            component: React.lazy(
              () => import('../modals/block-pool/update-block-pool-modal')
            ),
          },
          {
            key: ModalKeys.DELETE,
            value: t('Delete BlockPool'),
            component: React.lazy(
              () => import('../modals/block-pool/delete-block-pool-modal')
            ),
          },
        ]}
      />
    );
  }, [resource, t]);

  return !loaded ? (
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
          name: t('Details'),
          component: BlockPoolDashboard as any,
        },
        {
          href: 'yaml',
          name: t('YAML'),
          component: YAMLEditorWrapped,
        },
        {
          href: 'events',
          name: t('Events'),
          component: EventStreamWrapped,
        },
      ]}
    />
  );
};

export default BlockPoolDetailsPage;
