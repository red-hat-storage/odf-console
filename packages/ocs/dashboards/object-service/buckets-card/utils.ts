import { StatusGroupMapper } from '@openshift-console/dynamic-plugin-sdk-internal/lib/extensions/console-types';

enum InventoryStatusGroup {
  WARN = 'WARN',
  ERROR = 'ERROR',
  PROGRESS = 'PROGRESS',
  NOT_MAPPED = 'NOT_MAPPED',
  UNKNOWN = 'UNKNOWN',
}

const OB_STATUS_GROUP_MAPPING = {
  [InventoryStatusGroup.NOT_MAPPED]: ['Bound'],
  [InventoryStatusGroup.PROGRESS]: ['Released'],
  [InventoryStatusGroup.ERROR]: ['Failed'],
};

const OBC_STATUS_GROUP_MAPPING = {
  [InventoryStatusGroup.NOT_MAPPED]: ['Bound'],
  [InventoryStatusGroup.PROGRESS]: ['Pending', 'Released'],
  [InventoryStatusGroup.ERROR]: ['Failed'],
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
export const getObStatusGroups: StatusGroupMapper = (resources) =>
  getStatusGroups(
    resources,
    OB_STATUS_GROUP_MAPPING,
    (ob) => ob?.status?.phase,
    'ob-status'
  );
export const getObcStatusGroups: StatusGroupMapper = (resources) =>
  getStatusGroups(
    resources,
    OBC_STATUS_GROUP_MAPPING,
    (obc) => obc?.status?.phase,
    'obc-status'
  );
