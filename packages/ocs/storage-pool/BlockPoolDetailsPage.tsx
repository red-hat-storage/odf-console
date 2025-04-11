import * as React from 'react';
import { CephBlockPoolModel } from '@odf/shared';
import DetailsPage from '@odf/shared/details-page/DetailsPage';
import { Kebab } from '@odf/shared/kebab/kebab';
import { ModalKeys } from '@odf/shared/modals/types';
import { CephClusterModel } from '@odf/shared/models';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { referenceForModel } from '@odf/shared/utils';
import { EventStreamWrapped, YAMLEditorWrapped } from '@odf/shared/utils/Tabs';
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';
import { useParams, useLocation } from 'react-router-dom-v5-compat';
import { BlockPoolDashboard } from '../dashboards/block-pool/block-pool-dashboard';
import { StoragePoolKind } from '../types';

export const cephClusterResource = {
  kind: referenceForModel(CephClusterModel),
  namespaced: false,
  isList: true,
};

export const BlockPoolDetailsPage: React.FC<{}> = () => {
  const { t } = useCustomTranslation();

  const { poolName, namespace: poolNs } = useParams();
  const location = useLocation();
  const kind = referenceForModel(CephBlockPoolModel);

  const [resource, loaded, loadError] = useK8sWatchResource<StoragePoolKind>({
    kind,
    name: poolName,
    namespace: poolNs,
    isList: false,
  });

  const breadcrumbs = [
    {
      name: t('StorageSystems'),
      path: '/odf/systems',
    },
    {
      name: t('StorageSystem details'),
      path: `${location.pathname.split(`/${poolName}`)[0]}`,
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
          namespace: poolNs,
        }}
        customKebabItems={[
          {
            key: ModalKeys.EDIT_RES,
            value: t('Edit BlockPool'),
            component: React.lazy(
              () => import('../modals/storage-pool/update-storage-pool-modal')
            ),
          },
          {
            key: ModalKeys.DELETE,
            value: t('Delete BlockPool'),
            component: React.lazy(
              () => import('../modals/storage-pool/delete-storage-pool-modal')
            ),
          },
        ]}
      />
    );
  }, [resource, poolNs, t]);

  return (
    <DetailsPage
      loaded={loaded}
      loadError={loadError}
      breadcrumbs={breadcrumbs}
      actions={actions}
      resourceModel={CephBlockPoolModel}
      resource={resource}
      pages={[
        {
          href: '',
          name: t('Details'),
          component: BlockPoolDashboard,
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
