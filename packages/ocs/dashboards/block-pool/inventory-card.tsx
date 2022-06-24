import * as React from 'react';
import { useDeepCompareMemoize } from '@odf/shared/hooks/deep-compare-memoize';
import {
  PersistentVolumeClaimModel,
  StorageClassModel,
} from '@odf/shared/models';
import { getPVCStatusGroups } from '@odf/shared/status/Inventory';
import {
  PersistentVolumeClaimKind,
  StorageClassResourceKind,
} from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';
import { ResourceInventoryItem } from '@openshift-console/dynamic-plugin-sdk-internal';
import { Card, CardBody, CardHeader, CardTitle } from '@patternfly/react-core';
import { getStorageClassName } from '../../utils/common';
import { BlockPoolDashboardContext } from './block-pool-dashboard-context';

export const scResource = {
  kind: StorageClassModel.kind,
  namespaced: false,
  isList: true,
};

export const pvcResource = {
  isList: true,
  kind: PersistentVolumeClaimModel.kind,
};

export const InventoryCard: React.FC = () => {
  const { t } = useCustomTranslation();
  const { obj } = React.useContext(BlockPoolDashboardContext);
  const { name } = obj.metadata;

  // Hooks
  const [scResources, scLoaded, scLoadError] =
    useK8sWatchResource<StorageClassResourceKind[]>(scResource);
  const [pvcResources, pvcLoaded, pvcLoadError] =
    useK8sWatchResource<PersistentVolumeClaimKind[]>(pvcResource);
  const scMemoized: StorageClassResourceKind[] = useDeepCompareMemoize(
    scResources,
    true
  );
  const pvcMemoized: PersistentVolumeClaimKind[] = useDeepCompareMemoize(
    pvcResources,
    true
  );

  const poolSc: StorageClassResourceKind[] = React.useMemo(
    () =>
      scMemoized ? scMemoized.filter((sc) => sc.parameters?.pool === name) : [],
    [scMemoized, name]
  );
  const pvcs: PersistentVolumeClaimKind[] = React.useMemo(() => {
    const scList = poolSc.map((sc) => sc?.metadata.name);
    if (pvcLoaded && !pvcLoadError) {
      return pvcMemoized.filter((pvc) =>
        scList.includes(getStorageClassName(pvc))
      );
    } else return [];
  }, [poolSc, pvcMemoized, pvcLoaded, pvcLoadError]);

  return (
    <Card data-test-id="inventory-card">
      <CardHeader>
        <CardTitle>{t('Inventory')}</CardTitle>
      </CardHeader>
      <CardBody>
        <ResourceInventoryItem
          dataTest="inventory-sc"
          isLoading={!scLoaded}
          error={!!scLoadError}
          kind={StorageClassModel as any}
          resources={poolSc}
          showLink
        />
        <ResourceInventoryItem
          dataTest="inventory-pvc"
          isLoading={!pvcLoaded}
          error={!!pvcLoadError}
          kind={PersistentVolumeClaimModel as any}
          resources={pvcs}
          mapper={getPVCStatusGroups}
          showLink
        />
      </CardBody>
    </Card>
  );
};
