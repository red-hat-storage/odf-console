import * as React from 'react';
import {
  NodeModel,
  PersistentVolumeClaimModel,
  PersistentVolumeModel,
  StorageClassModel,
} from '@odf/shared/models';
import { getName } from '@odf/shared/selectors';
import {
  getNodeStatusGroups,
  getPVCStatusGroups,
  getPVStatusGroups,
} from '@odf/shared/status/Inventory';
import { K8sResourceKind, StorageClassResourceKind } from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { useK8sWatchResources } from '@openshift-console/dynamic-plugin-sdk';
import { ResourceInventoryItem } from '@openshift-console/dynamic-plugin-sdk-internal';
import { Card, CardBody, CardHeader, CardTitle } from '@patternfly/react-core';
import { cephStorageLabel } from '../../constants';
import {
  getCephNodes,
  getCephPVCs,
  getCephPVs,
  getCephSC,
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

  const resources = useK8sWatchResources(watchResources);

  const nodesLoaded = resources?.nodes?.loaded;
  const nodesLoadError = resources?.nodes?.loadError;
  const nodesData = (resources?.nodes?.data ?? []) as K8sResourceKind[];

  const pvcsLoaded = resources?.pvcs?.loaded;
  const pvcsLoadError = resources?.pvcs?.loadError;
  const pvcsData = (resources?.pvcs?.data ?? []) as K8sResourceKind[];

  const pvsLoaded = resources?.pvs?.loaded;
  const pvsLoadError = resources?.pvs?.loadError;
  const pvsData = (resources?.pvs?.data ?? []) as K8sResourceKind[];

  const scData = (resources?.sc?.data ?? []) as StorageClassResourceKind[];
  const filteredCephSC = getCephSC(scData);
  const filteredSCNames = filteredCephSC.map(getName);
  const ocsNodesHref = `/search?kind=${NodeModel.kind}&q=${cephStorageLabel}`;

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
          resources={getCephNodes(nodesData)}
          mapper={getNodeStatusGroups}
          basePath={ocsNodesHref}
        />
        <ResourceInventoryItem
          dataTest="inventory-pvc"
          isLoading={!pvcsLoaded}
          error={!!pvcsLoadError}
          kind={PersistentVolumeClaimModel as any}
          resources={getCephPVCs(filteredSCNames, pvcsData, pvsData)}
          mapper={getPVCStatusGroups}
          showLink={false}
        />
        <ResourceInventoryItem
          dataTest="inventory-pv"
          isLoading={!pvsLoaded}
          error={!!pvsLoadError}
          kind={PersistentVolumeModel as any}
          resources={getCephPVs(pvsData)}
          mapper={getPVStatusGroups}
          showLink={false}
        />
      </CardBody>
    </Card>
  );
};

export default InventoryCard;
