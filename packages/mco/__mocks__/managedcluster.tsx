import { ACMManagedClusterModel } from '@odf/shared';

export const mockManagedClusterEast1 = {
  apiVersion: `${ACMManagedClusterModel.apiGroup}/${ACMManagedClusterModel.apiVersion}`,
  kind: ACMManagedClusterModel.kind,
  metadata: {
    name: 'east-1',
    uid: 'f5302bfd-7c34-42a7-8be7-c410d614a7c3',
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
    uid: '314ec799-647c-47f7-ae3e-b4ea71a8d06f',
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
    uid: 'e2f4fcb4-df5b-4c00-8d31-f918842f1c3a',
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
    uid: '47f8367d-49e1-4b24-9343-aaf6e47bd012',
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

export const mockManagedClusterWest2Down = {
  apiVersion: `${ACMManagedClusterModel.apiGroup}/${ACMManagedClusterModel.apiVersion}`,
  kind: ACMManagedClusterModel.kind,
  metadata: {
    name: 'west-2',
    uid: '817346d9-7886-43b2-821b-7c9eea49089c',
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
