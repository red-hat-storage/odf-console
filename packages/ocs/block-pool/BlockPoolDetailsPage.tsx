import * as React from 'react';
import { useSafeK8sWatchResource } from '@odf/core/hooks';
import { useODFNamespaceSelector } from '@odf/core/redux';
import DetailsPage from '@odf/shared/details-page/DetailsPage';
import { Kebab } from '@odf/shared/kebab/kebab';
import { ModalKeys } from '@odf/shared/modals/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { referenceForModel } from '@odf/shared/utils';
import { EventStreamWrapped, YAMLEditorWrapped } from '@odf/shared/utils/Tabs';
import { useParams, useLocation } from 'react-router-dom-v5-compat';
import { BlockPoolDashboard } from '../dashboards/block-pool/block-pool-dashboard';
import { CephBlockPoolModel, CephClusterModel } from '../models';
import { StoragePoolKind } from '../types';

export const cephClusterResource = {
  kind: referenceForModel(CephClusterModel),
  namespaced: false,
  isList: true,
};

export const BlockPoolDetailsPage: React.FC<{}> = () => {
  const { t } = useCustomTranslation();

  const { poolName } = useParams();
  const location = useLocation();
  const kind = referenceForModel(CephBlockPoolModel);

  const { odfNamespace, isODFNsLoaded, odfNsLoadError } =
    useODFNamespaceSelector();

  const [resource, loaded, loadError] =
    useSafeK8sWatchResource<StoragePoolKind>((ns: string) => ({
      kind,
      name: poolName,
      namespace: ns,
      isList: false,
    }));

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
          namespace: odfNamespace,
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
  }, [resource, odfNamespace, t]);

  return (
    <DetailsPage
      loaded={loaded && isODFNsLoaded}
      loadError={loadError || odfNsLoadError}
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
