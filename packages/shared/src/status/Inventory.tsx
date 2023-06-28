import { StatusGroupMapper } from '@openshift-console/dynamic-plugin-sdk';
import { nodeStatus } from './Node';

export enum InventoryStatusGroup {
  WARN = 'WARN',
  ERROR = 'ERROR',
  PROGRESS = 'PROGRESS',
  NOT_MAPPED = 'NOT_MAPPED',
  UNKNOWN = 'UNKNOWN',
}

const NODE_STATUS_GROUP_MAPPING = {
  [InventoryStatusGroup.NOT_MAPPED]: ['Ready'],
  [InventoryStatusGroup.PROGRESS]: ['Not Ready'],
};

export const getStatusGroups = (resources, mapping, mapper, filterType) => {
  const groups = {
    [InventoryStatusGroup.UNKNOWN]: {
      statusIDs: [],
      count: 0,
    },
  };
  Object.keys(mapping).forEach((key) => {
    groups[key] = {
      statusIDs: [...mapping[key]],
      count: 0,
      filterType,
    };
  });

  resources.forEach((resource) => {
    const status = mapper(resource);
    const group =
      Object.keys(mapping).find((key) => mapping[key].includes(status)) ||
      InventoryStatusGroup.UNKNOWN;
    groups[group].count++;
  });

  return groups;
};

export const getNodeStatusGroups: StatusGroupMapper = (resources) =>
  getStatusGroups(
    resources,
    NODE_STATUS_GROUP_MAPPING,
    nodeStatus,
    'node-status'
  );

const PVC_STATUS_GROUP_MAPPING = {
  [InventoryStatusGroup.NOT_MAPPED]: ['Bound'],
  [InventoryStatusGroup.ERROR]: ['Lost'],
  [InventoryStatusGroup.PROGRESS]: ['Pending'],
};

export const getPVCStatusGroups: StatusGroupMapper = (resources) =>
  getStatusGroups(
    resources,
    PVC_STATUS_GROUP_MAPPING,
    (pvc) => pvc.status.phase,
    'pvc-status'
  );

const PV_STATUS_GROUP_MAPPING = {
  [InventoryStatusGroup.NOT_MAPPED]: ['Available', 'Bound'],
  [InventoryStatusGroup.PROGRESS]: ['Released'],
  [InventoryStatusGroup.ERROR]: ['Failed'],
};

export const getPVStatusGroups: StatusGroupMapper = (resources) =>
  getStatusGroups(
    resources,
    PV_STATUS_GROUP_MAPPING,
    (pv) => pv.status.phase,
    'pv-status'
  );
