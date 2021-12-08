import { getGVK, referenceFor, referenceForModel } from '@odf/shared/utils/common';
import { IBMFlashSystemModel, OCSStorageClusterModel } from '../../models';
import { StorageSystemKind } from '../../types';

export const getStorageSystemDashboardLink = (storageSystem: StorageSystemKind) => {
  const { kind, apiGroup, apiVersion } = getGVK(storageSystem.spec.kind);
  return `/odf/system/${referenceFor(apiGroup)(apiVersion)(kind)}/${storageSystem.metadata.name
    }`;
};

export const getVendorDashboardLinkFromMetrics = (systemType: string, systemName: string) => {
  const systemKind = systemType === "OCS" ? referenceForModel(OCSStorageClusterModel) : referenceForModel(IBMFlashSystemModel);
  return `/odf/system/${systemKind}/${systemName}`
}
