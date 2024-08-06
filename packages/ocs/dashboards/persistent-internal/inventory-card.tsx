import * as React from 'react';
import { cephStorageLabel } from '@odf/core/constants';
import {
  NodeModel,
  PersistentVolumeClaimModel,
  PersistentVolumeModel,
  StorageClassModel,
} from '@odf/shared/models';
import {
  getNodeStatusGroups,
  getPVCStatusGroups,
  getPVStatusGroups,
} from '@odf/shared/status/Inventory';
import {
  K8sResourceKind,
  StorageClassResourceKind,
  PersistentVolumeClaimKind,
} from '@odf/shared/types';
import { NodeKind } from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { useK8sWatchResources } from '@openshift-console/dynamic-plugin-sdk';
import { ResourceInventoryItem } from '@openshift-console/dynamic-plugin-sdk-internal';
import { useParams } from 'react-router-dom-v5-compat';
import { Card, CardBody, CardHeader, CardTitle } from '@patternfly/react-core';
import { ODFSystemParams } from '../../types';
import {
  getCephNodes,
  filterCephPVCsByCluster,
  filterCephPVsByCluster,
} from '../../utils/common';

const watchResources = {
  nodes: {
    isList: true,
    kind: NodeModel.kind,
  },
  pvcs: {
    isList: true,
    kind: PersistentVolumeClaimModel.kind,
  },
  pvs: {
    isList: true,
    kind: PersistentVolumeModel.kind,
  },
  sc: {
    isList: true,
    kind: StorageClassModel.kind,
  },
};
const InventoryCard: React.FC = () => {
  const { t } = useCustomTranslation();

  const { namespace: clusterNs } = useParams<ODFSystemParams>();

  const resources = useK8sWatchResources(watchResources);

  const nodesLoaded = resources?.nodes?.loaded;
  const nodesLoadError = resources?.nodes?.loadError;
  const nodesData = (resources?.nodes?.data ?? []) as NodeKind[];

  const pvcsLoaded = resources?.pvcs?.loaded;
  const pvcsLoadError = resources?.pvcs?.loadError;
  const pvcsData = (resources?.pvcs?.data ?? []) as PersistentVolumeClaimKind[];

  const pvsLoaded = resources?.pvs?.loaded;
  const pvsLoadError = resources?.pvs?.loadError;
  const pvsData = (resources?.pvs?.data ?? []) as K8sResourceKind[];

  const scData = (resources?.sc?.data ?? []) as StorageClassResourceKind[];
  const ocsNodesHref = `/search?kind=${NodeModel.kind}&q=${cephStorageLabel(
    clusterNs
  )}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('Inventory')}</CardTitle>
      </CardHeader>
      <CardBody>
        <ResourceInventoryItem
          dataTest="inventory-nodes"
          isLoading={!nodesLoaded}
          error={!!nodesLoadError}
          kind={NodeModel as any}
          resources={getCephNodes(nodesData, clusterNs)}
          mapper={getNodeStatusGroups}
          basePath={ocsNodesHref}
        />
        <ResourceInventoryItem
          dataTest="inventory-pvc"
          isLoading={!pvcsLoaded}
          error={!!pvcsLoadError}
          kind={PersistentVolumeClaimModel as any}
          resources={filterCephPVCsByCluster(
            scData,
            pvcsData,
            pvsData,
            clusterNs
          )}
          mapper={getPVCStatusGroups}
          showLink={false}
        />
        <ResourceInventoryItem
          dataTest="inventory-pv"
          isLoading={!pvsLoaded}
          error={!!pvsLoadError}
          kind={PersistentVolumeModel as any}
          resources={filterCephPVsByCluster(pvsData, scData, clusterNs)}
          mapper={getPVStatusGroups}
          showLink={false}
        />
      </CardBody>
    </Card>
  );
};

export default InventoryCard;
