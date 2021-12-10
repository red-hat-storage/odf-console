import { NodeKind } from '@odf/shared/types';
import { referenceForModel } from '@odf/shared/utils/common';
import * as _ from 'lodash';
import { IBMFlashSystemModel, OCSStorageClusterModel } from '../../models';

export const getVendorDashboardLinkFromMetrics = (systemType: string, systemName: string) => {
  const systemKind = systemType === "OCS" ? referenceForModel(OCSStorageClusterModel) : referenceForModel(IBMFlashSystemModel);
  return `/odf/system/${systemKind}/${systemName}`
}

export const getNodeCPUCapacity = (node: NodeKind): string => _.get(node.status, 'capacity.cpu');

export const getNodeAllocatableMemory = (node: NodeKind): string =>
  _.get(node.status, 'allocatable.memory');

export const hasNoTaints = (node: NodeKind) => {
  return _.isEmpty(node.spec?.taints);
};
