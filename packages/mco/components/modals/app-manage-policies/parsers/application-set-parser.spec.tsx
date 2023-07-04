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
} from '../../../../types';
import { createRefFromK8Resource } from '../../../../utils';
import { ApplicationSetParser } from './application-set-parser';

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

const mockPlacement1: ACMPlacementKind = {
  apiVersion: `${ACMPlacementModel.apiGroup}/${ACMPlacementModel.apiVersion}`,
  kind: ACMPlacementModel.kind,
  metadata: {
    name: 'mock-placement-1',
    namespace: 'mock-appset-1',
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

const drResources: DisasterRecoveryResourceKind = {
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

const appResources: ArgoApplicationSetResourceKind = {
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

const onClose = jest.fn();
jest.mock('@odf/mco/hooks/disaster-recovery', () => ({
  __esModule: true,
  useDisasterRecoveryResourceWatch: () => [drResources, true, ''],
}));
jest.mock('@odf/mco/hooks/argo-application-set', () => ({
  __esModule: true,
  useArgoApplicationSetResourceWatch: () => [appResources, true, ''],
}));
jest.mock('../utils/k8s-utils', () => ({
  unAssignPromises: jest.fn(() => [Promise.resolve({ data: {} })]),
}));

describe('ApplicationSet manage data policy modal', () => {
  beforeEach(async () => {
    render(
      <ApplicationSetParser
        application={mockApplicationSet1}
        close={onClose}
        isOpen={true}
      />
    );
  });

  test('manage data policy list view test', async () => {
    const searchBox = screen.getByPlaceholderText('Search');

    // Modal headers
    expect(screen.getByText('Manage Policy')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Assign policy to protect the application and ensure quick recovery. Unassign policy from an application when they no longer require to be managed.'
      )
    ).toBeInTheDocument();
    expect(screen.getByText('My policies')).toBeInTheDocument();

    // Check primary action is enabled
    expect(screen.getByText('Assign policy')).toBeEnabled();

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
    expect(screen.getByText('Unassign policy')).toBeInTheDocument();
    // 2) Search using invalid policy
    fireEvent.change(searchBox, { target: { value: 'invalid policy' } });
    expect(screen.getByText('Not found')).toBeInTheDocument();
    fireEvent.change(searchBox, { target: { value: '' } });
  });

  // eslint-disable-next-line jest/no-disabled-tests
  test.skip('Bulk unassign policy action test', async () => {
    // Select all policy
    fireEvent.click(screen.getByLabelText('Select all rows'));
    // Check primary action is disabled
    expect(screen.getByText('Assign policy')).toBeDisabled();
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
});
