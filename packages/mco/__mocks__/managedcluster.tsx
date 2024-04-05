import { ACMManagedClusterModel } from '../models';

export const mockManagedClusterEast1 = {
  apiVersion: `${ACMManagedClusterModel.apiGroup}/${ACMManagedClusterModel.apiVersion}`,
  kind: ACMManagedClusterModel.kind,
  metadata: {
    name: 'east-1',
  },
  status: {
    conditions: [
      {
        type: 'ManagedClusterJoined',
        lastTransitionTime: '2023-11-29T04:30:13Z',
        message: 'Managed cluster joined',
        reason: 'ManagedClusterJoined',
        status: 'True',
      },
      {
        lastTransitionTime: '2023-11-29T04:30:13Z',
        message: 'Managed cluster is available',
        reason: 'ManagedClusterAvailable',
        status: 'True',
        type: 'ManagedClusterConditionAvailable',
      },
    ],
  },
};

export const mockManagedClusterWest1 = {
  apiVersion: `${ACMManagedClusterModel.apiGroup}/${ACMManagedClusterModel.apiVersion}`,
  kind: ACMManagedClusterModel.kind,
  metadata: {
    name: 'west-1',
  },
  status: {
    conditions: [
      {
        type: 'ManagedClusterJoined',
        lastTransitionTime: '2023-11-29T04:30:13Z',
        message: 'Managed cluster joined',
        reason: 'ManagedClusterJoined',
        status: 'True',
      },
      {
        lastTransitionTime: '2023-11-29T04:30:13Z',
        message: 'Managed cluster is available',
        reason: 'ManagedClusterAvailable',
        status: 'True',
        type: 'ManagedClusterConditionAvailable',
      },
    ],
  },
};

export const mockManagedClusterWest1Down = {
  apiVersion: `${ACMManagedClusterModel.apiGroup}/${ACMManagedClusterModel.apiVersion}`,
  kind: ACMManagedClusterModel.kind,
  metadata: {
    name: 'west-1',
  },
  status: {
    conditions: [
      {
        type: 'ManagedClusterJoined',
        lastTransitionTime: '2023-11-29T04:30:13Z',
        message: 'Managed cluster joined',
        reason: 'ManagedClusterJoined',
        status: 'True',
      },
      {
        lastTransitionTime: '2023-11-29T04:30:13Z',
        message: 'Managed cluster is available',
        reason: 'ManagedClusterAvailable',
        status: 'False',
        type: 'ManagedClusterConditionAvailable',
      },
    ],
  },
};

export const mockManagedClusterEast2 = {
  apiVersion: `${ACMManagedClusterModel.apiGroup}/${ACMManagedClusterModel.apiVersion}`,
  kind: ACMManagedClusterModel.kind,
  metadata: {
    name: 'east-2',
  },
  status: {
    conditions: [
      {
        type: 'ManagedClusterJoined',
        lastTransitionTime: '2023-11-29T04:30:13Z',
        message: 'Managed cluster joined',
        reason: 'ManagedClusterJoined',
        status: 'True',
      },
      {
        lastTransitionTime: '2023-11-29T04:30:13Z',
        message: 'Managed cluster is available',
        reason: 'ManagedClusterAvailable',
        status: 'True',
        type: 'ManagedClusterConditionAvailable',
      },
    ],
  },
};
