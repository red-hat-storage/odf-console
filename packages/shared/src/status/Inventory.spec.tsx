import {
  getNodeStatusGroups,
  getPVCStatusGroups,
  getPVStatusGroups,
  getStatusGroups,
  InventoryStatusGroup,
} from './Inventory';

jest.mock('./Node', () => ({
  nodeStatus: (resource) => resource.status,
}));

describe('tests for getStatusGroups utility function', () => {
  const resources = [
    { id: 1, status: 'Not Ready' },
    { id: 2, status: 'Ready' },
    { id: 3, status: 'UNKNOWN' },
    { id: 4, status: 'Not Ready' },
  ];

  const mapping = {
    [InventoryStatusGroup.NOT_MAPPED]: ['Ready'],
    [InventoryStatusGroup.PROGRESS]: ['Not Ready'],
  };

  const mapper = (resource) => resource.status;

  test('correctly groups resources by status', () => {
    const groups = getStatusGroups(resources, mapping, mapper, 'filterType');
    expect(groups).toEqual({
      [InventoryStatusGroup.UNKNOWN]: { statusIDs: [], count: 1 },
      [InventoryStatusGroup.PROGRESS]: {
        statusIDs: ['Not Ready'],
        count: 2,
        filterType: 'filterType',
      },
      [InventoryStatusGroup.NOT_MAPPED]: {
        statusIDs: ['Ready'],
        count: 1,
        filterType: 'filterType',
      },
    });
  });
});

describe('tests for getNodeStatusGroups utility function', () => {
  const resources = [
    { id: 1, status: 'Not Ready' },
    { id: 2, status: 'Ready' },
    { id: 3, status: 'UNKNOWN' },
    { id: 4, status: 'Not Ready' },
  ];

  test('correctly calls the groups resources by status for node status', () => {
    const groups = getNodeStatusGroups(resources as any);
    expect(groups).toEqual({
      [InventoryStatusGroup.UNKNOWN]: { statusIDs: [], count: 1 },
      [InventoryStatusGroup.PROGRESS]: {
        statusIDs: ['Not Ready'],
        count: 2,
        filterType: 'node-status',
      },
      [InventoryStatusGroup.NOT_MAPPED]: {
        statusIDs: ['Ready'],
        count: 1,
        filterType: 'node-status',
      },
    });
  });
});

describe('tests for getPVCStatusGroups utility function', () => {
  const resources = [
    { id: 1, status: { phase: 'Bound' } },
    { id: 2, status: { phase: 'Lost' } },
    { id: 3, status: { phase: 'Pending' } },
    { id: 4, status: { phase: 'Lost' } },
  ];

  test('correctly calls the groups resources by status for pvc status', () => {
    const groups = getPVCStatusGroups(resources as any);
    expect(groups).toEqual({
      [InventoryStatusGroup.UNKNOWN]: { statusIDs: [], count: 0 },
      [InventoryStatusGroup.NOT_MAPPED]: {
        statusIDs: ['Bound'],
        count: 1,
        filterType: 'pvc-status',
      },
      [InventoryStatusGroup.ERROR]: {
        statusIDs: ['Lost'],
        count: 2,
        filterType: 'pvc-status',
      },
      [InventoryStatusGroup.PROGRESS]: {
        statusIDs: ['Pending'],
        count: 1,
        filterType: 'pvc-status',
      },
    });
  });
});

describe('tests for getPVStatusGroups utility function', () => {
  const resources = [
    { id: 1, status: { phase: 'Bound' } },
    { id: 2, status: { phase: 'Failed' } },
    { id: 3, status: { phase: 'Available' } },
    { id: 4, status: { phase: 'Released' } },
  ];

  test('correctly calls the groups resources by status for pv status', () => {
    const groups = getPVStatusGroups(resources as any);
    expect(groups).toEqual({
      [InventoryStatusGroup.UNKNOWN]: { statusIDs: [], count: 0 },
      [InventoryStatusGroup.NOT_MAPPED]: {
        statusIDs: ['Available', 'Bound'],
        count: 2,
        filterType: 'pv-status',
      },
      [InventoryStatusGroup.ERROR]: {
        statusIDs: ['Failed'],
        count: 1,
        filterType: 'pv-status',
      },
      [InventoryStatusGroup.PROGRESS]: {
        statusIDs: ['Released'],
        count: 1,
        filterType: 'pv-status',
      },
    });
  });
});
