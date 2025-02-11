import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
// eslint-disable-next-line jest/no-mocks-import
import {
  mockApplicationSet1,
  mockApplicationSet2,
} from '../../../../__mocks__/applicationset';
// eslint-disable-next-line jest/no-mocks-import
import {
  mockDRClusterEast1,
  mockDRClusterWest1,
} from '../../../../__mocks__/drcluster';
// eslint-disable-next-line jest/no-mocks-import
import { mockDRPC1 } from '../../../../__mocks__/drplacementcontrol';
// eslint-disable-next-line jest/no-mocks-import
import { mockDRPolicy1 } from '../../../../__mocks__/drpolicy';
// eslint-disable-next-line jest/no-mocks-import
import {
  mockPlacement1,
  mockPlacement2,
} from '../../../../__mocks__/placement';
// eslint-disable-next-line jest/no-mocks-import
import {
  mockPlacementDecision1,
  mockPlacementDecision2,
} from '../../../../__mocks__/placementdecision';
import { ArgoApplicationSetResourceKind } from '../../../../hooks';
import { DisasterRecoveryResourceKind } from '../../../../hooks/disaster-recovery';
import { SearchResult } from '../../../../types';
import AppManagePoliciesModal from '../app-manage-policies-modal';

let testCase = 1;

const searchResult: SearchResult = {
  data: {
    searchResult: [
      {
        related: [
          {
            items: [
              {
                apiversion: 'v1',
                cluster: 'local-cluster',
                created: '2023-07-04T17:14:10Z',
                kind: 'PersistentVolumeClaim',
                label: 'app=mock-appset-2',
                name: 'busybox-pvc',
                namespace: 'test-ns',
                _uid: 'local-cluster/683b0a87-85bf-4743-96d2-565863752e53',
              },
            ],
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

jest.mock('@odf/shared/useCustomTranslationHook', () => ({
  useCustomTranslation: () => ({
    t: (text: string, valueObj: any) => {
      if (!!valueObj) {
        let result = text;
        Object.keys(valueObj).forEach((key) => {
          result = result.replace(`{{${key}}}`, valueObj[key]);
        });
        return result;
      } else {
        return text;
      }
    },
  }),
}));

jest.mock('@odf/mco/hooks/disaster-recovery', () => ({
  __esModule: true,
  useDisasterRecoveryResourceWatch: jest.fn(() => {
    if ([1].includes(testCase)) {
      return [drResources2, true, ''];
    }
    if ([3].includes(testCase)) {
      return [drResources3, true, ''];
    } else {
      return [drResources1, true, ''];
    }
  }),
}));

jest.mock('@odf/mco/hooks/argo-application-set', () => ({
  __esModule: true,
  useArgoApplicationSetResourceWatch: jest.fn(() => {
    if ([1, 3].includes(testCase)) {
      return [appResources2, true, ''];
    } else {
      return [appResources1, true, ''];
    }
  }),
}));

jest.mock('@odf/mco/hooks/acm-safe-fetch', () => ({
  __esModule: true,
  useACMSafeFetch: jest.fn(() => {
    return [searchResult, '', true];
  }),
}));

jest.mock('@openshift-console/dynamic-plugin-sdk', () => ({
  ...jest.requireActual('@openshift-console/dynamic-plugin-sdk'),
  useK8sWatchResource: jest.fn(() => [[], true, undefined]),
}));

describe('ApplicationSet manage disaster recovery modal', () => {
  test('Empty manage policy page test', async () => {
    testCase = 1;
    render(
      <AppManagePoliciesModal
        resource={mockApplicationSet2}
        close={onClose}
        isOpen={true}
      />
    );
    // Ensure empty state
    expect(
      screen.getByText('No assigned disaster recovery policy found')
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /You have not enrolled this application yet. To protect your application,/i
      )
    ).toBeInTheDocument();
    // Check primary action is enabled
    expect(screen.getByText('Enroll application')).toBeEnabled();
  });

  test('manage policy view test', async () => {
    testCase = 2;
    render(
      <AppManagePoliciesModal
        resource={mockApplicationSet1}
        close={onClose}
        isOpen={true}
      />
    );

    // Modal headers
    expect(screen.getByText('Manage disaster recovery')).toBeInTheDocument();

    // DR information
    expect(
      screen.getByText('Disaster recovery policy details')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Name: mock-policy-1 (Validated)')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Replication policy: async, 5 minutes')
    ).toBeInTheDocument();
    expect(screen.getByText('Cluster: east-1, west-1')).toBeInTheDocument();
    expect(screen.getByText('Placement: mock-placement-1')).toBeInTheDocument();
    expect(screen.getByText('Label selector:')).toBeInTheDocument();
    expect(screen.getByText('pvc=pvc1')).toBeInTheDocument();
    expect(screen.getByText('Status:')).toBeInTheDocument();
  });

  test('Assign policy action test', async () => {
    const user = userEvent.setup();
    testCase = 3;
    render(
      <AppManagePoliciesModal
        resource={mockApplicationSet2}
        close={onClose}
        isOpen={true}
      />
    );
    // Open assign policy wizard
    await user.click(screen.getByText('Enroll application'));

    // Step 1 - select a policy
    // Buttons
    expect(screen.getByText('Next')).toBeEnabled();
    expect(screen.getByText('Back')).toBeDisabled();
    // Policy selector
    expect(screen.getByText('Select a policy')).toBeEnabled();
    await user.click(screen.getByText('Select a policy'));
    expect(screen.getByText('mock-policy-1')).toBeInTheDocument();
    expect(screen.getByText('mock-policy-1')).toBeInTheDocument();
    await user.click(screen.getByText('mock-policy-1'));
    expect(screen.getByText('mock-policy-1')).toBeInTheDocument();
    await user.click(screen.getByText('Next'));

    // Step 2 - select a placement and labels
    // Buttons
    expect(screen.getByText('Next')).toBeEnabled();
    expect(screen.getByText('Back')).toBeEnabled();
    // PVC selector
    screen.getByText(
      /Use PVC label selectors to effortlessly specify the application resources that need protection. You can also create a custom PVC label selector if one doesn’t exists. For more information,/i
    );

    expect(screen.getByText('Application resource')).toBeInTheDocument();
    expect(screen.getByText('PVC label selector')).toBeInTheDocument();
    expect(screen.getByText('Select a placement')).toBeInTheDocument();
    expect(screen.getByText('Select labels')).toBeInTheDocument();

    await user.click(screen.getByText('Select a placement'));
    expect(screen.getByText('mock-placement-2')).toBeInTheDocument();
    await user.click(screen.getByText('mock-placement-2'));
    expect(screen.getByText('mock-placement-2')).toBeInTheDocument();
    await user.click(screen.getByText('Select labels'));
    screen.getByText('app=mock-appset-2');
    await user.click(screen.getByText('app=mock-appset-2'));
    expect(screen.getByText('app=mock-appset-2')).toBeInTheDocument();
    await user.click(screen.getByText('Next'));

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
