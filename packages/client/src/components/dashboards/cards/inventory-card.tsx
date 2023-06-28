import * as React from 'react';
import { getCephPVCs, getCephPVs, getCephSC } from '@odf/ocs/utils';
import {
  PersistentVolumeClaimModel,
  PersistentVolumeModel,
  StorageClassModel,
} from '@odf/shared/models';
import { getName } from '@odf/shared/selectors';
import {
  getPVCStatusGroups,
  getPVStatusGroups,
} from '@odf/shared/status/Inventory';
import { K8sResourceKind, StorageClassResourceKind } from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { useK8sWatchResources } from '@openshift-console/dynamic-plugin-sdk';
import { ResourceInventoryItem } from '@openshift-console/dynamic-plugin-sdk-internal';
import { Card, CardBody, CardHeader, CardTitle } from '@patternfly/react-core';

const watchResources = {
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
export const InventoryCard: React.FC = () => {
  const { t } = useCustomTranslation();

  const resources = useK8sWatchResources(watchResources);

  const pvcsLoaded = resources?.pvcs?.loaded;
  const pvcsLoadError = resources?.pvcs?.loadError;
  const pvcsData = (resources?.pvcs?.data ?? []) as K8sResourceKind[];

  const pvsLoaded = resources?.pvs?.loaded;
  const pvsLoadError = resources?.pvs?.loadError;
  const pvsData = (resources?.pvs?.data ?? []) as K8sResourceKind[];

  const scData = (resources?.sc?.data ?? []) as StorageClassResourceKind[];
  const filteredCephSC = getCephSC(scData);
  const filteredSCNames = filteredCephSC.map(getName);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('Inventory')}</CardTitle>
      </CardHeader>
      <CardBody>
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
