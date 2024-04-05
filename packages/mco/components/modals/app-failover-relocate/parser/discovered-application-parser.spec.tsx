import * as React from 'react';
import { DRActionType } from '@odf/mco/constants';
import { DisasterRecoveryResourceKind } from '@odf/mco/hooks';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
// eslint-disable-next-line jest/no-mocks-import
import {
  mockDRClusterEast1,
  mockDRClusterEast2,
  mockDRClusterWest1,
} from '../../../../__mocks__/drcluster';
// eslint-disable-next-line jest/no-mocks-import
import { mockDRPC1, mockDRPC2 } from '../../../../__mocks__/drplacementcontrol';
// eslint-disable-next-line jest/no-mocks-import
import { mockDRPolicy1, mockDRPolicy2 } from '../../../../__mocks__/drpolicy';
// eslint-disable-next-line jest/no-mocks-import
import {
  mockManagedClusterEast1,
  mockManagedClusterEast2,
  mockManagedClusterWest1,
  mockManagedClusterWest1Down,
} from '../../../../__mocks__/managedcluster';
import { DiscoveredApplicationParser as DiscoveredApplicationModal } from './discovered-application-parser';

let type = 1;
let patchObj = {};

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
      drPlacementControls: [mockDRPC1],
    },
  ],
};

const drResources3: DisasterRecoveryResourceKind = {
  formattedResources: [
    {
      drClusters: [mockDRClusterEast1, mockDRClusterWest1],
      drPolicy: mockDRPolicy1,
      drPlacementControls: [mockDRPC2],
    },
  ],
};

const drResources4: DisasterRecoveryResourceKind = {
  formattedResources: [
    {
      drClusters: [mockDRClusterEast1, mockDRClusterEast2],
      drPolicy: mockDRPolicy2,
      drPlacementControls: [mockDRPC1],
    },
  ],
};

jest.mock('@odf/mco/hooks/disaster-recovery', () => ({
  __esModule: true,
  useDisasterRecoveryResourceWatch: jest.fn(() => {
    if (type === 1) {
      return [drResources2, true, ''];
    } else if (type === 2) {
      return [drResources1, true, ''];
    } else if (type === 3) {
      return [drResources3, true, ''];
    } else if (type === 4) {
      return [drResources4, true, ''];
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
      if (type === 1) {
        return [[mockManagedClusterEast1, mockManagedClusterWest1], true, ''];
      } else if (type === 4) {
        return [[mockManagedClusterEast1, mockManagedClusterEast2], true, ''];
      } else {
        return [
          [mockManagedClusterEast1, mockManagedClusterWest1Down],
          true,
          '',
        ];
      }
    }),
    k8sPatch: jest.fn(({ data }) => {
      patchObj = data;
      return Promise.resolve({ data: {} });
    }),
  })
);

jest.mock('react-i18next', () => ({
  ...jest.requireActual('react-i18next'),
  useTranslation: (_ns: string) => ({ t: (children: any) => children }),
  Trans: ({ children }: any) => children,
}));

jest.mock('@odf/shared/hooks', () => ({
  ...jest.requireActual('@odf/shared/hooks'),
  DOC_VERSION: '1.2',
  useDocVersion: jest.fn(() => '1.2'),
}));

describe('Discovered application failover/relocate modal test', () => {
  test('Failover happy path test', async () => {
    type = 1;

    render(
      <DiscoveredApplicationModal
        extraProps={{ application: mockDRPC1, action: DRActionType.FAILOVER }}
        closeModal={jest.fn()}
        isOpen={true}
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

    // Info alert
    expect(
      screen.getByRole('heading', { name: 'Info alert: Attention' })
    ).toBeInTheDocument();
    expect(
      screen
        .getAllByRole('listitem')
        .find(
          (listitem) =>
            listitem.textContent ===
            'A failover will occur for all namespaces currently under this DRPC.'
        )
    ).toBeTruthy();
    expect(
      screen
        .getAllByRole('listitem')
        .find(
          (listitem) =>
            listitem.textContent ===
            'You need to clean up manually to begin replication after a successful failover.'
        )
    ).toBeTruthy();

    // DR info
    expect(screen.getByText(/Application:/i)).toBeInTheDocument();
    expect(screen.getByText(/mock-drpc-1/i)).toBeInTheDocument();

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
    fireEvent.click(screen.getByRole('button', { name: /Initiate/i }));
    await waitFor(() =>
      expect(
        JSON.stringify(patchObj) ===
          '[{"op":"replace","path":"/spec/action","value":"Failover"},{"op":"replace","path":"/spec/failoverCluster","value":"west-1"},{"op":"replace","path":"/spec/preferredCluster","value":"east-1"}]'
      ).toBeTruthy()
    );
  });

  test('Relocate happy path test', async () => {
    type = 1;

    render(
      <DiscoveredApplicationModal
        extraProps={{ application: mockDRPC1, action: DRActionType.RELOCATE }}
        closeModal={jest.fn()}
        isOpen={true}
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

    // Info alert
    expect(
      screen.getByRole('heading', { name: 'Info alert: Attention' })
    ).toBeInTheDocument();
    expect(
      screen
        .getAllByRole('listitem')
        .find(
          (listitem) =>
            listitem.textContent ===
            'A relocation will occur for all namespaces currently under this DRPC.'
        )
    ).toBeTruthy();

    // DR info
    expect(screen.getByText(/Application:/i)).toBeInTheDocument();
    expect(screen.getByText(/mock-drpc-1/i)).toBeInTheDocument();

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
    fireEvent.click(screen.getByRole('button', { name: /Initiate/i }));
    await waitFor(() =>
      expect(
        JSON.stringify(patchObj) ===
          '[{"op":"replace","path":"/spec/action","value":"Relocate"},{"op":"replace","path":"/spec/failoverCluster","value":"east-1"},{"op":"replace","path":"/spec/preferredCluster","value":"west-1"}]'
      ).toBeTruthy()
    );
  });

  test('Target cluster down for failover test', async () => {
    type = 2;

    render(
      <DiscoveredApplicationModal
        extraProps={{ application: mockDRPC1, action: DRActionType.FAILOVER }}
        closeModal={jest.fn()}
        isOpen={true}
      />
    );

    expect(
      screen.getByRole('heading', {
        name: /Danger alert: Target cluster is offline./i,
      })
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /To begin failover, the target cluster must be available. Check the status and try again. If the managed cluster status is offline, follow the instructions in the documentation/i
      )
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /Troubleshoot/i })
    ).toBeInTheDocument();

    // footer
    expect(screen.getByRole('button', { name: /Cancel/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /Initiate/i })).toBeDisabled();
  });

  test('1 or more cluster down for relocate test', async () => {
    type = 2;

    render(
      <DiscoveredApplicationModal
        extraProps={{ application: mockDRPC1, action: DRActionType.RELOCATE }}
        closeModal={jest.fn()}
        isOpen={true}
      />
    );

    expect(
      screen.getByRole('heading', {
        name: /Danger alert: 1 or more managed clusters are offline./i,
      })
    ).toBeInTheDocument();
    expect(
      screen
        .getAllByRole('listitem')
        .find(
          (listitem) =>
            listitem.textContent ===
            'The status for both the primary and target clusters must be available for relocating. Check the status and try again.'
        )
    ).toBeTruthy();
    expect(
      screen
        .getAllByRole('listitem')
        .find((listitem) =>
          listitem.textContent?.includes(
            'To bring the cluster online, refer to the instructions in the documentationTroubleshoot'
          )
        )
    ).toBeTruthy();
    expect(
      screen.getByRole('link', { name: /Troubleshoot/i })
    ).toBeInTheDocument();

    // footer
    expect(screen.getByRole('button', { name: /Cancel/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /Initiate/i })).toBeDisabled();
  });

  test('Failover readiness fail test', async () => {
    type = 3;

    render(
      <DiscoveredApplicationModal
        extraProps={{ application: mockDRPC1, action: DRActionType.FAILOVER }}
        closeModal={jest.fn()}
        isOpen={true}
      />
    );

    expect(
      screen.getByRole('heading', { name: /Danger alert: Cannot failover./i })
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Failover cannot be initiated as the readiness checks are failing. Refer to workaround mentioned in known issues section of/i
      )
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /release notes/i })
    ).toBeInTheDocument();

    // footer
    expect(screen.getByRole('button', { name: /Cancel/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /Initiate/i })).toBeDisabled();
  });

  test('Relocate readiness fail test', async () => {
    type = 3;

    render(
      <DiscoveredApplicationModal
        extraProps={{ application: mockDRPC1, action: DRActionType.RELOCATE }}
        closeModal={jest.fn()}
        isOpen={true}
      />
    );

    expect(
      screen.getByRole('heading', { name: /Danger alert: Cannot relocate./i })
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Relocation cannot be initiated as the readiness checks are failing. Refer to workaround mentioned in known issues section of/i
      )
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /release notes/i })
    ).toBeInTheDocument();

    // footer
    expect(screen.getByRole('button', { name: /Cancel/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /Initiate/i })).toBeDisabled();
  });

  test('Primary cluster not fenced test', async () => {
    type = 4;

    render(
      <DiscoveredApplicationModal
        extraProps={{ application: mockDRPC1, action: DRActionType.FAILOVER }}
        closeModal={jest.fn()}
        isOpen={true}
      />
    );

    expect(
      screen.getByRole('heading', {
        name: /Danger alert: Primary cluster is unfenced./i,
      })
    ).toBeInTheDocument();
    expect(
      screen
        .getAllByRole('listitem')
        .find(
          (listitem) =>
            listitem.textContent ===
            'The status for your primary cluster must be fenced for initiating failover. Check the status and try again.'
        )
    ).toBeTruthy();
    expect(
      screen
        .getAllByRole('listitem')
        .find((listitem) =>
          listitem.textContent?.includes(
            'To fence your cluster, follow the instructions in the documentation'
          )
        )
    ).toBeTruthy();
    expect(
      screen.getByRole('link', { name: /View documentation/i })
    ).toBeInTheDocument();

    // footer
    expect(screen.getByRole('button', { name: /Cancel/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /Initiate/i })).toBeDisabled();
  });

  test('Some cluster are fenced test', async () => {
    type = 4;

    render(
      <DiscoveredApplicationModal
        extraProps={{ application: mockDRPC1, action: DRActionType.RELOCATE }}
        closeModal={jest.fn()}
        isOpen={true}
      />
    );

    expect(
      screen.getByRole('heading', {
        name: /Danger alert: Some clusters are fenced./i,
      })
    ).toBeInTheDocument();
    expect(
      screen
        .getAllByRole('listitem')
        .find(
          (listitem) =>
            listitem.textContent ===
            'Check the fencing status for your primary and target cluster. Both clusters should be unfenced for initiating relocation.'
        )
    ).toBeTruthy();
    expect(
      screen
        .getAllByRole('listitem')
        .find((listitem) =>
          listitem.textContent?.includes(
            'To unfence your cluster, refer to the documentation'
          )
        )
    ).toBeTruthy();
    expect(
      screen.getByRole('link', { name: /View documentation/i })
    ).toBeInTheDocument();

    // footer
    expect(screen.getByRole('button', { name: /Cancel/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /Initiate/i })).toBeDisabled();
  });
});
