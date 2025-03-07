import * as React from 'react';
import { DRActionType } from '@odf/mco/constants';
import { DisasterRecoveryResourceKind } from '@odf/mco/hooks';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
/* eslint-disable jest/no-mocks-import */
import { mockApplicationSet1 } from '../../../../__mocks__/applicationset';
import {
  mockDRClusterEast1,
  mockDRClusterWest1,
} from '../../../../__mocks__/drcluster';
import { mockDRPC1, mockDRPC3 } from '../../../../__mocks__/drplacementcontrol';
import { mockDRPolicy1 } from '../../../../__mocks__/drpolicy';
import {
  mockManagedClusterEast1,
  mockManagedClusterWest1,
} from '../../../../__mocks__/managedcluster';
import { mockPlacement1 } from '../../../../__mocks__/placement';
import { mockPlacementDecision1 } from '../../../../__mocks__/placementdecision';
import { ArogoApplicationSetParser } from './argo-application-set-parser';
/* eslint-enable jest/no-mocks-import */

let type = 1;
let patchObj = {};

const aroAppSetResources = (drPlacementControl) => ({
  formattedResources: [
    {
      application: mockApplicationSet1,
      managedClusters: [mockManagedClusterEast1, mockManagedClusterWest1],
      siblingApplications: [],
      placements: [
        {
          placementDecision: mockPlacementDecision1,
          drPlacementControl,
          drClusters: [mockDRClusterEast1, mockDRClusterWest1],
          drPolicy: mockDRPolicy1,
          placement: mockPlacement1,
        },
      ],
    },
  ],
});

const drResources1: DisasterRecoveryResourceKind = {
  formattedResources: [
    {
      drClusters: [mockDRClusterEast1, mockDRClusterWest1],
      drPolicy: mockDRPolicy1,
      drPlacementControls: [mockDRPC1],
    },
  ],
};

const drResources2: DisasterRecoveryResourceKind = {
  formattedResources: [
    {
      drClusters: [mockDRClusterEast1, mockDRClusterWest1],
      drPolicy: mockDRPolicy1,
      drPlacementControls: [mockDRPC3],
    },
  ],
};

jest.mock('@odf/mco/hooks', () => ({
  ...jest.requireActual('@odf/mco/hooks'),
  useArgoApplicationSetResourceWatch: jest.fn(() => [
    aroAppSetResources(type === 1 ? mockDRPC1 : mockDRPC3),
    true,
    '',
  ]),
}));

jest.mock('@odf/mco/hooks/disaster-recovery', () => ({
  __esModule: true,
  useDisasterRecoveryResourceWatch: jest.fn(() => {
    if (type === 1) {
      return [drResources1, true, ''];
    } else {
      return [drResources2, true, ''];
    }
  }),
}));

jest.mock(
  '@openshift-console/dynamic-plugin-sdk/lib/api/dynamic-core-api',
  () => ({
    ...jest.requireActual(
      '@openshift-console/dynamic-plugin-sdk/lib/api/dynamic-core-api'
    ),
    useK8sWatchResource: jest.fn(() => {
      return [[mockManagedClusterEast1, mockManagedClusterWest1], true, ''];
    }),
    k8sPatch: jest.fn(({ data }) => {
      patchObj = data;
      return Promise.resolve({ data: {} });
    }),
  })
);

jest.mock('@odf/shared/hooks', () => ({
  ...jest.requireActual('@odf/shared/hooks'),
  DOC_VERSION: '1.2',
  useDocVersion: jest.fn(() => '1.2'),
}));

describe('Discovered application failover/relocate modal test', () => {
  test('Failover test', async () => {
    const user = userEvent.setup();
    type = 1;

    render(
      <ArogoApplicationSetParser
        application={mockApplicationSet1}
        action={DRActionType.FAILOVER}
        isOpen={true}
        close={jest.fn()}
      />
    );

    // Modal title
    expect(
      screen.getByRole('dialog', { name: /Failover application/i })
    ).toBeInTheDocument();

    // Modal description
    expect(
      screen.getByRole('dialog', {
        description:
          /Failing over force stops active replication and deploys your application on the selected target cluster. Recommended only when the primary cluster is down./i,
      })
    ).toBeInTheDocument();

    // DR info
    expect(screen.getByText(/Application:/i)).toBeInTheDocument();
    expect(screen.getByText(/mock-appset-1/i)).toBeInTheDocument();

    expect(screen.getByText(/Target cluster:/i)).toBeInTheDocument();
    expect(screen.getByText(/west-1/i)).toBeInTheDocument();
    expect(screen.getByText(/Last available: /i)).toBeInTheDocument();
    // ToDo: Need to find why Date check failing on CI
    //expect(screen.getByText(/29 Nov 2023, 4:30 am UTC/i)).toBeInTheDocument();

    expect(screen.getByText(/{{actionType}} readiness:/i)).toBeInTheDocument();
    expect(screen.getByText(/Ready/i)).toBeInTheDocument();

    // footer
    expect(screen.getByRole('button', { name: /Cancel/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /Initiate/i })).toBeEnabled();

    // Click initiate
    await user.click(screen.getByRole('button', { name: /Initiate/i }));
    expect(
      JSON.stringify(patchObj) ===
        '[{"op":"replace","path":"/spec/action","value":"Failover"},{"op":"replace","path":"/spec/failoverCluster","value":"west-1"},{"op":"replace","path":"/spec/preferredCluster","value":"east-1"}]'
    ).toBeTruthy();
  });

  test('Relocate test', async () => {
    const user = userEvent.setup();
    type = 1;

    render(
      <ArogoApplicationSetParser
        application={mockApplicationSet1}
        action={DRActionType.RELOCATE}
        isOpen={true}
        close={jest.fn()}
      />
    );

    // Modal title
    expect(
      screen.getByRole('dialog', { name: /Relocate application/i })
    ).toBeInTheDocument();

    // Modal description
    expect(
      screen.getByRole('dialog', {
        description:
          /Relocating terminates your application on its current cluster, syncs its most recent snapshot to the selected target cluster, and then brings up your application./i,
      })
    ).toBeInTheDocument();

    // DR info
    expect(screen.getByText(/Application:/i)).toBeInTheDocument();
    expect(screen.getByText(/mock-appset-1/i)).toBeInTheDocument();

    expect(screen.getByText(/Target cluster:/i)).toBeInTheDocument();
    expect(screen.getByText(/west-1/i)).toBeInTheDocument();
    expect(screen.getByText(/Last available: /i)).toBeInTheDocument();
    //expect(screen.getByText(/29 Nov 2023, 4:30 am UTC/i)).toBeInTheDocument();

    expect(screen.getByText(/{{actionType}} readiness:/i)).toBeInTheDocument();
    expect(screen.getByText(/Ready/i)).toBeInTheDocument();

    // footer
    expect(screen.getByRole('button', { name: /Cancel/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /Initiate/i })).toBeEnabled();

    // Click initiate
    await user.click(screen.getByRole('button', { name: /Initiate/i }));
    expect(
      JSON.stringify(patchObj) ===
        '[{"op":"replace","path":"/spec/action","value":"Relocate"},{"op":"replace","path":"/spec/failoverCluster","value":"east-1"},{"op":"replace","path":"/spec/preferredCluster","value":"west-1"}]'
    ).toBeTruthy();
  });

  test('App set volume synchronization delay during relocate', async () => {
    type = 1;

    render(
      <ArogoApplicationSetParser
        application={mockApplicationSet1}
        action={DRActionType.RELOCATE}
        isOpen={true}
        close={jest.fn()}
      />
    );

    expect(
      screen.getByRole('dialog', { name: /Relocate application/i })
    ).toBeInTheDocument();

    expect(
      screen.getByRole('heading', {
        name: /Warning alert: Inconsistent data on target cluster/i,
      })
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /The target cluster's volumes contain data inconsistencies caused by synchronization delays. Performing relocate could lead to data loss./i
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Refer to the corresponding VolumeSynchronizationDelay OpenShift alert\(s\) for more information./i
      )
    ).toBeInTheDocument();

    expect(screen.getByRole('button', { name: /Cancel/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /Initiate/i })).toBeEnabled();
  });
  test('No volume synchronization delay during relocate', async () => {
    type = 2;

    render(
      <ArogoApplicationSetParser
        application={mockApplicationSet1}
        action={DRActionType.RELOCATE}
        isOpen={true}
        close={jest.fn()}
      />
    );

    expect(
      screen.getByRole('dialog', { name: /Relocate application/i })
    ).toBeInTheDocument();

    expect(
      screen.queryByRole('heading', {
        name: /Warning alert: Inconsistent data on target cluster/i,
      })
    ).not.toBeInTheDocument();

    expect(
      screen.queryByText(
        /The target cluster's volumes contain data inconsistencies caused by synchronization delays. Performing relocate could lead to data loss./i
      )
    ).not.toBeInTheDocument();

    expect(
      screen.queryByText(
        /Refer to the corresponding VolumeSynchronizationDelay OpenShift alert\(s\) for more information./i
      )
    ).not.toBeInTheDocument();

    expect(screen.getByRole('button', { name: /Cancel/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /Initiate/i })).toBeEnabled();
  });
});
