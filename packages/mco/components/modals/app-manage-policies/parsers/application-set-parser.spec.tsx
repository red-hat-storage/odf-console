import * as React from 'react';
import { screen, render, fireEvent, waitFor } from '@testing-library/react';
import { PLACEMENT_REF_LABEL } from '../../../../constants';
import { ArgoApplicationSetResourceKind } from '../../../../hooks';
import { DisasterRecoveryResourceKind } from '../../../../hooks/disaster-recovery';
import {
  ACMPlacementDecisionModel,
  ACMPlacementModel,
  ArgoApplicationSetModel,
  DRClusterModel,
  DRPlacementControlModel,
  DRPolicyModel,
} from '../../../../models';
import {
  ACMPlacementDecisionKind,
  ACMPlacementKind,
  ArgoApplicationSetKind,
  DRClusterKind,
  DRPlacementControlKind,
  DRPolicyKind,
  SearchResult,
} from '../../../../types';
import { createRefFromK8Resource } from '../../../../utils';
import { ApplicationSetParser } from './application-set-parser';

let testCase = 1;

const mockApplicationSet1: ArgoApplicationSetKind = {
  apiVersion: `${ArgoApplicationSetModel.apiGroup}/${ArgoApplicationSetModel.apiVersion}`,
  kind: ArgoApplicationSetModel.kind,
  metadata: {
    name: 'mock-appset-1',
    namespace: 'mock-appset-1',
  },
  spec: {
    generators: [
      {
        clusterDecisionResource: {
          labelSelector: {
            matchLabels: {
              [PLACEMENT_REF_LABEL]: 'mock-placement-1',
            },
          },
        },
      },
    ],
    template: {
      spec: {
        destination: {
          namespace: 'mock-appset-1',
        },
      },
    },
  },
};

const mockApplicationSet2: ArgoApplicationSetKind = {
  apiVersion: `${ArgoApplicationSetModel.apiGroup}/${ArgoApplicationSetModel.apiVersion}`,
  kind: ArgoApplicationSetModel.kind,
  metadata: {
    name: 'mock-appset-2',
    namespace: 'mock-appset-2',
  },
  spec: {
    generators: [
      {
        clusterDecisionResource: {
          labelSelector: {
            matchLabels: {
              [PLACEMENT_REF_LABEL]: 'mock-placement-2',
            },
          },
        },
      },
    ],
    template: {
      spec: {
        destination: {
          namespace: 'mock-appset-2',
        },
      },
    },
  },
};

const mockPlacement1: ACMPlacementKind = {
  apiVersion: `${ACMPlacementModel.apiGroup}/${ACMPlacementModel.apiVersion}`,
  kind: ACMPlacementModel.kind,
  metadata: {
    name: 'mock-placement-1',
    namespace: 'mock-appset-1',
  },
  spec: {},
};

const mockPlacement2: ACMPlacementKind = {
  apiVersion: `${ACMPlacementModel.apiGroup}/${ACMPlacementModel.apiVersion}`,
  kind: ACMPlacementModel.kind,
  metadata: {
    name: 'mock-placement-2',
    namespace: 'mock-appset-2',
  },
  spec: {},
};

const mockPlacementDecision1: ACMPlacementDecisionKind = {
  apiVersion: `${ACMPlacementDecisionModel.apiGroup}/${ACMPlacementDecisionModel.apiVersion}`,
  kind: ACMPlacementDecisionModel.kind,
  metadata: {
    name: 'mock-placement-decision-1',
    namespace: 'mock-appset-1',
    labels: {
      [PLACEMENT_REF_LABEL]: 'mock-placement-1',
    },
  },
  status: {
    decisions: [
      {
        clusterName: 'east-1',
        reason: '',
      },
    ],
  },
};

const mockPlacementDecision2: ACMPlacementDecisionKind = {
  apiVersion: `${ACMPlacementDecisionModel.apiGroup}/${ACMPlacementDecisionModel.apiVersion}`,
  kind: ACMPlacementDecisionModel.kind,
  metadata: {
    name: 'mock-placement-decision-2',
    namespace: 'mock-appset-2',
    labels: {
      [PLACEMENT_REF_LABEL]: 'mock-placement-2',
    },
  },
  status: {
    decisions: [
      {
        clusterName: 'east-1',
        reason: '',
      },
    ],
  },
};

const mockDRPolicy1: DRPolicyKind = {
  apiVersion: `${DRPolicyModel.apiGroup}/${DRPolicyModel.apiVersion}`,
  kind: DRPolicyModel.kind,
  metadata: {
    uid: '1',
    name: 'mock-policy-1',
  },
  spec: {
    drClusters: ['east-1', 'west-1'],
    schedulingInterval: '5m',
  },
  status: {
    phase: '',
    conditions: [
      {
        status: 'True',
        type: 'Validated',
      },
    ],
  },
};

const mockDRClusterEast1: DRClusterKind = {
  apiVersion: `${DRClusterModel.apiGroup}/${DRClusterModel.apiVersion}`,
  kind: DRClusterModel.kind,
  metadata: {
    name: 'east-1',
  },
  spec: {
    region: 'east-1',
    S3ProfileName: '',
  },
};

const mockDRClusterWest1: DRClusterKind = {
  apiVersion: `${DRClusterModel.apiGroup}/${DRClusterModel.apiVersion}`,
  kind: DRClusterModel.kind,
  metadata: {
    name: 'west-1',
  },
  spec: {
    region: 'west-1',
    S3ProfileName: '',
  },
};

const mockDRPC1: DRPlacementControlKind = {
  apiVersion: `${DRPlacementControlModel.apiGroup}/${DRPlacementControlModel.apiVersion}`,
  kind: DRPlacementControlModel.kind,
  metadata: {
    name: 'mock-placement-1-drpc',
    namespace: 'mock-appset-1',
    creationTimestamp: '2023-06-06T17:50:56Z',
  },
  spec: {
    drPolicyRef: createRefFromK8Resource(mockDRPolicy1),
    placementRef: createRefFromK8Resource(mockPlacement1),
    pvcSelector: {
      matchLabels: {
        pvc: 'pvc1',
      },
    },
  },
  status: {
    phase: 'Relocating',
    lastGroupSyncTime: '2023-06-06T17:50:56Z',
  },
};

const searchResult: SearchResult = {
  data: {
    searchResult: [
      {
        items: [
          {
            accessMode: 'readwriteonce',
            apiversion: 'v1',
            capacity: '5Gi',
            cluster: 'local-cluster',
            created: '2023-07-04T17:14:10Z',
            kind: 'PersistentVolumeClaim',
            kind_plural: 'persistentvolumeclaims',
            label: 'app=mock-appset-2',
            name: 'busybox-pvc',
            namespace: 'appset1',
            request: '5Gi',
            status: 'Bound',
            storageClassName: 'ocs-storagecluster-ceph-rbd',
            volumeName: 'pvc-683b0a87-85bf-4743-96d2-565863752e53',
            _clusterNamespace: '',
            _hubClusterResource: 'true',
            _uid: 'local-cluster/683b0a87-85bf-4743-96d2-565863752e53',
          },
        ],
      },
    ],
  },
};

const drResources1: DisasterRecoveryResourceKind = {
  drClusters: [mockDRClusterEast1, mockDRClusterWest1],
  drPolicies: [mockDRPolicy1],
  drPlacementControls: [mockDRPC1],
  formattedResources: [
    {
      drClusters: [mockDRClusterEast1, mockDRClusterWest1],
      drPolicy: mockDRPolicy1,
      drPlacementControls: [mockDRPC1],
    },
  ],
};

const drResources2: DisasterRecoveryResourceKind = {
  drClusters: [],
  drPolicies: [],
  drPlacementControls: [],
  formattedResources: [
    {
      drClusters: [],
      drPolicy: {},
      drPlacementControls: [],
    },
  ],
};

const drResources3: DisasterRecoveryResourceKind = {
  drClusters: [mockDRClusterEast1, mockDRClusterWest1],
  drPolicies: [mockDRPolicy1],
  drPlacementControls: [],
  formattedResources: [
    {
      drClusters: [mockDRClusterEast1, mockDRClusterWest1],
      drPolicy: mockDRPolicy1,
      drPlacementControls: [],
    },
  ],
};

const appResources1: ArgoApplicationSetResourceKind = {
  formattedResources: [
    {
      application: mockApplicationSet1,
      placements: [
        {
          placement: mockPlacement1,
          placementDecision: mockPlacementDecision1,
          drClusters: [mockDRClusterEast1, mockDRClusterWest1],
          drPlacementControl: mockDRPC1,
          drPolicy: mockDRPolicy1,
        },
      ],
      managedClusters: [],
      siblingApplications: [],
    },
  ],
};

const appResources2: ArgoApplicationSetResourceKind = {
  formattedResources: [
    {
      application: mockApplicationSet2,
      placements: [
        {
          placement: mockPlacement2,
          placementDecision: mockPlacementDecision2,
        },
      ],
      managedClusters: [],
      siblingApplications: [],
    },
  ],
};

const onClose = jest.fn();

jest.mock('@odf/mco/hooks/disaster-recovery', () => ({
  __esModule: true,
  useDisasterRecoveryResourceWatch: jest.fn(() => {
    if ([1].includes(testCase)) {
      return [drResources2, true, ''];
    }
    if ([4].includes(testCase)) {
      return [drResources3, true, ''];
    } else {
      return [drResources1, true, ''];
    }
  }),
}));

jest.mock('@odf/mco/hooks/argo-application-set', () => ({
  __esModule: true,
  useArgoApplicationSetResourceWatch: jest.fn(() => {
    if ([1, 4].includes(testCase)) {
      return [appResources2, true, ''];
    } else {
      return [appResources1, true, ''];
    }
  }),
}));

jest.mock('../utils/k8s-utils', () => ({
  unAssignPromises: jest.fn(() => [Promise.resolve({ data: {} })]),
  assignPromises: jest.fn(() => [Promise.resolve({ data: {} })]),
}));
jest.mock('@odf/mco/hooks/acm-safe-fetch', () => ({
  __esModule: true,
  useACMSafeFetch: jest.fn(() => {
    return [searchResult, ''];
  }),
}));

describe('ApplicationSet manage data policy modal', () => {
  test('Empty list page test', async () => {
    testCase = 1;
    render(
      <ApplicationSetParser
        application={mockApplicationSet2}
        close={onClose}
        isOpen={true}
      />
    );
    // Ensure empty state
    expect(
      screen.getByText('No assigned data policy found')
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "You haven't set a data policy for your application yet. To protect your application, click the 'Assign data policy' button and select a policy from the available templates."
      )
    ).toBeInTheDocument();
  });

  test('manage data policy list view test', async () => {
    testCase = 2;
    render(
      <ApplicationSetParser
        application={mockApplicationSet1}
        close={onClose}
        isOpen={true}
      />
    );

    const searchBox = screen.getByPlaceholderText('Search');

    // Modal headers
    expect(screen.getByText('Manage data policy')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Assign a policy to protect the application and to ensure a quick recovery.'
      )
    ).toBeInTheDocument();
    expect(screen.getByText('My assigned policies')).toBeInTheDocument();

    // Check primary action is enabled
    expect(screen.getByText('Assign data policy')).toBeEnabled();

    // Policy list table
    expect(screen.getByLabelText('Selectable table')).toBeInTheDocument();
    // 1) Search using valid policy
    fireEvent.change(searchBox, { target: { value: 'mock-policy-1' } });
    // Header
    expect(screen.getByLabelText('Selectable table')).toBeInTheDocument();
    expect(screen.getByText('Policy name')).toBeInTheDocument();
    expect(screen.getByText('Policy type')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Activity')).toBeInTheDocument();
    // Row
    expect(screen.getByText('mock-policy-1')).toBeInTheDocument();
    expect(screen.getByText('DRPolicy')).toBeInTheDocument();
    expect(screen.getByText('Validated')).toBeInTheDocument();
    expect(screen.getByText('Relocate in progress')).toBeInTheDocument();
    // Row actions
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Actions',
      })
    );
    expect(screen.getByText('View configurations')).toBeInTheDocument();
    // 2) Search using invalid policy
    fireEvent.change(searchBox, { target: { value: 'invalid policy' } });
    expect(
      screen.getByText('No assigned data policy found')
    ).toBeInTheDocument();
    fireEvent.change(searchBox, { target: { value: '' } });
  });

  // eslint-disable-next-line jest/no-disabled-tests
  test.skip('Bulk unassign policy action test', async () => {
    // Select all policy
    fireEvent.click(screen.getByLabelText('Select all rows'));
    // Check primary action is disabled
    expect(screen.getByText('Assign data policy')).toBeDisabled();
    // Check secondary action is enabled
    expect(screen.getByLabelText('Select input')).toBeEnabled();
    // Trigger bulk unassign
    fireEvent.click(screen.getByLabelText('Select input'));
    fireEvent.click(screen.getByText('Unassign policy'));
    expect(
      screen.getByText(
        'Selected policies ({{ count }}) will be removed for your application. This may have some affect on other applications sharing the placement.'
      )
    ).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.getByText('Confirm unassign')).toBeInTheDocument();
    await waitFor(() => {
      fireEvent.click(screen.getByText('Confirm unassign'));
    });
    // Confirm unassign is successful
    expect(
      screen.getByText(
        'Selected policies ({{ count }}) unassigned for the application.'
      )
    ).toBeInTheDocument();
  });

  test('Policy configuration view test', async () => {
    testCase = 3;
    render(
      <ApplicationSetParser
        application={mockApplicationSet1}
        close={onClose}
        isOpen={true}
      />
    );
    // Row actions
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Actions',
      })
    );
    // Policy config view
    fireEvent.click(screen.getByText('View configurations'));
    // Title
    expect(
      screen.getByText('Policy configuration details')
    ).toBeInTheDocument();
    // All placement view
    expect(screen.getByText('All placements')).toBeInTheDocument();
    // Headers
    expect(screen.getByText('Policy name')).toBeInTheDocument();
    expect(screen.getByText('Replication type')).toBeInTheDocument();
    expect(screen.getByText('Sync interval')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Cluster')).toBeInTheDocument();
    expect(
      screen.getByText('Application resources protected')
    ).toBeInTheDocument();
    expect(screen.getByText('PVC label selector')).toBeInTheDocument();
    // Values
    expect(screen.getByText('mock-policy-1')).toBeInTheDocument();
    expect(screen.getByText('Asynchronous')).toBeInTheDocument();
    expect(screen.getByText('5 minutes')).toBeInTheDocument();
    expect(screen.getByText('Validated')).toBeInTheDocument();
    expect(screen.getByText('east-1')).toBeInTheDocument();
    expect(screen.getByText('west-1')).toBeInTheDocument();
    expect(screen.getByText('1 placement')).toBeInTheDocument();
    expect(screen.getByText('pvc=pvc1')).toBeInTheDocument();
    // Placement view
    fireEvent.click(screen.getByLabelText('Options menu'));
    fireEvent.click(screen.getByText('mock-placement-1'));
    // Added headers
    expect(screen.getByText('Replication status')).toBeInTheDocument();
    // Added values
    expect(screen.getAllByText('mock-placement-1').length === 2).toBeTruthy();
    // Footer
    fireEvent.click(screen.getByText('Back'));
    // Make sure context is switched to list view
    expect(screen.getByText('My assigned policies')).toBeInTheDocument();
  });

  test('Assign policy action test', async () => {
    testCase = 4;
    render(
      <ApplicationSetParser
        application={mockApplicationSet2}
        close={onClose}
        isOpen={true}
      />
    );
    // Open assign policy wizard
    fireEvent.click(screen.getByText('Assign data policy'));

    // Step 1 - select a policy
    // Buttons
    expect(screen.getByText('Next')).toBeEnabled();
    expect(screen.getByText('Back')).toBeDisabled();
    // Policy selector
    expect(screen.getByText('Select a policy')).toBeEnabled();
    fireEvent.click(screen.getByText('Select a policy'));
    expect(screen.getByText('mock-policy-1')).toBeInTheDocument();
    expect(screen.getByText('mock-policy-1')).toBeInTheDocument();
    fireEvent.click(screen.getByText('mock-policy-1'));
    expect(screen.getByText('mock-policy-1')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Next'));

    // Step 2 - select a placement and labels
    // Buttons
    expect(screen.getByText('Next')).toBeEnabled();
    expect(screen.getByText('Back')).toBeEnabled();
    // PVC selector
    screen.getByText(
      'Use PVC label selectors to effortlessly specify the application resources that need protection.'
    );
    await waitFor(() => {
      expect(screen.getByText('Application resource')).toBeInTheDocument();
      expect(screen.getByText('PVC label selector')).toBeInTheDocument();
      expect(screen.getByText('Select a placement')).toBeInTheDocument();
      expect(screen.getByText('Select labels')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Select a placement'));
    expect(screen.getByText('mock-placement-2')).toBeInTheDocument();
    fireEvent.click(screen.getByText('mock-placement-2'));
    expect(screen.getByText('mock-placement-2')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Select labels'));
    screen.getByText('app=mock-appset-2');
    fireEvent.click(screen.getByText('app=mock-appset-2'));
    expect(screen.getByText('app=mock-appset-2')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Next'));

    // Step 3 - review and assign
    // Buttons
    expect(screen.getByText('Assign')).toBeEnabled();
    expect(screen.getByText('Back')).toBeEnabled();
    expect(screen.getByText('Cancel')).toBeEnabled();

    // Headers
    expect(screen.getByText('Data policy')).toBeInTheDocument();
    expect(screen.getByText('Data policy')).toBeInTheDocument();
    // Labels
    expect(screen.getByText('Policy name:')).toBeInTheDocument();
    expect(screen.getByText('Clusters:')).toBeInTheDocument();
    expect(screen.getByText('Replication type:')).toBeInTheDocument();
    expect(screen.getByText('Sync interval:')).toBeInTheDocument();
    expect(screen.getByText('Application resource:')).toBeInTheDocument();
    expect(screen.getByText('PVC label selector:')).toBeInTheDocument();
    // Values
    expect(screen.getByText('mock-policy-1')).toBeInTheDocument();
    expect(screen.getByText('east-1, west-1')).toBeInTheDocument();
    expect(screen.getByText('Asynchronous')).toBeInTheDocument();
    expect(screen.getByText('5 minutes')).toBeInTheDocument();
    expect(screen.getByText('mock-placement-2')).toBeInTheDocument();
    expect(screen.getByText('app=mock-appset-2')).toBeInTheDocument();
  });
});
