import * as React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
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

jest.mock('@odf/shared/details-page/datetime', () => ({
  ...jest.requireActual('@odf/shared/details-page/datetime'),
  getLastLanguage: () => 'en-US',
  formatTime: (time: string) =>
    time &&
    new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
      timeZoneName: 'short',
    }).format(new Date(time)),
}));

//  Added helper to safely click dropdown item text (PFv5 duplicates)
const clickDropdownItemByText = async (
  text: string,
  user: ReturnType<typeof userEvent.setup>
) => {
  const elements = screen.getAllByText(text);
  await user.click(elements[elements.length - 1]);
};

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
    const enrollButton = screen
      .getByText('Enroll application')
      .closest('button');
    expect(enrollButton).toBeEnabled();
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
    expect(
      screen.getByText(/Volume: Last synced on Jun 6, 2023, 5:50 PM UTC/i)
    ).toBeInTheDocument();
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

    // select a policy
    expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled();

    expect(screen.getByRole('button', { name: 'Back' })).toBeDisabled();

    await user.click(screen.getByText('Select a policy'));

    //  Fixed duplicate text issue here
    await clickDropdownItemByText('mock-policy-1', user);

    screen.getByText((content, element) => {
      return (
        content === 'mock-policy-1' &&
        element !== null &&
        element.classList.contains('pf-v6-c-menu-toggle__text')
      );
    });

    await user.click(screen.getByText('Next'));

    // select a placement and labels
    expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Back' })).toBeEnabled();

    screen.getByText(
      /Use PVC label selectors to effortlessly specify the application resources that need protection. You can also create a custom PVC label selector if one doesn’t exists. For more information,/i
    );

    expect(screen.getByText('Application resource')).toBeInTheDocument();
    expect(screen.getByText('PVC label selector')).toBeInTheDocument();
    expect(screen.getByText('Select a placement')).toBeInTheDocument();

    await user.click(screen.getByText('Select a placement'));
    const placement2Option = await screen.findByText('mock-placement-2');
    await user.click(placement2Option);

    // Wait for placement selection to be processed
    await waitFor(() => {
      expect(screen.getByText('mock-placement-2')).toBeInTheDocument();
    });

    // Find all dropdown buttons and look for the PVC label selector
    const allButtons = screen.getAllByRole('button');
    const labelButtons = allButtons.filter(
      (btn) =>
        btn.getAttribute('aria-expanded') !== null &&
        !btn.textContent?.includes('Next') &&
        !btn.textContent?.includes('Back') &&
        !btn.textContent?.includes('Close') &&
        !btn.textContent?.includes('mock-placement')
    );

    if (labelButtons.length > 0) {
      await user.click(labelButtons[labelButtons.length - 1]);
      const appLabel = await screen.findByText('app=mock-appset-2');
      await user.click(appLabel);
    }

    // Click Next to proceed to review step
    const nextButtons = screen.getAllByText('Next');
    await user.click(nextButtons[nextButtons.length - 1]);

    // Step 3 - review and assign
    expect(screen.getByRole('button', { name: 'Assign' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Back' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeEnabled();

    expect(
      await screen.findByText('Policy', {
        selector: '.pf-v6-c-wizard__nav-link-main',
      })
    ).toBeInTheDocument();
    expect(screen.getByText('Policy name:')).toBeInTheDocument();
    expect(screen.getByText('Clusters:')).toBeInTheDocument();
    expect(screen.getByText('Replication type:')).toBeInTheDocument();
    expect(screen.getByText('Sync interval:')).toBeInTheDocument();
    expect(screen.getByText('Application resource:')).toBeInTheDocument();
    expect(screen.getByText('PVC label selector:')).toBeInTheDocument();

    expect(screen.getByText('mock-policy-1')).toBeInTheDocument();
    expect(screen.getByText('east-1, west-1')).toBeInTheDocument();
    expect(screen.getByText('Asynchronous')).toBeInTheDocument();
    expect(screen.getByText('5 minutes')).toBeInTheDocument();
    expect(screen.getByText('mock-placement-2')).toBeInTheDocument();
    expect(screen.getByText('app=mock-appset-2')).toBeInTheDocument();
  });
});
