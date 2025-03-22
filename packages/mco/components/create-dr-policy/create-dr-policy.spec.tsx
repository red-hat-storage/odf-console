import * as React from 'react';
import { ConfigMapKind } from '@odf/shared';
import {
  ACMManagedClusterModel,
  ACMManagedClusterViewModel,
  DRPolicyModel,
  MirrorPeerModel,
} from '@odf/shared';
import { render, screen } from '@testing-library/react';
/* eslint-disable jest/no-mocks-import */
import userEvent from '@testing-library/user-event';
import { mockDRPolicy2 } from '../../__mocks__/drpolicy';
import {
  mockManagedClusterEast1,
  mockManagedClusterEast2,
  mockManagedClusterWest1,
  mockManagedClusterWest2Down,
} from '../../__mocks__/managedcluster';
import { ACMManagedClusterKind, ACMManagedClusterViewKind } from '../../types';
import CreateDRPolicy from './create-dr-policy';

let drPolicyObj = {};
let mirrorPeerObj = {};
let syncPolicyTest = false;
let testcase = 1;

const managedClusterViews: ACMManagedClusterViewKind[][] = [
  [
    {
      apiVersion: 'cluster.open-cluster-management.io/v1',
      kind: 'ManagedClusterView',
      metadata: {
        name: 'mcv',
        namespace: 'east-1',
      },
      status: {
        result: {
          apiVersion: 'v1',
          data: {
            'openshift-storage_ocs-storagecluster.config.yaml':
              'version: 4.18.0-103.stable\ndeploymentType: internal\nclients: []\nstorageCluster:\n  namespacedName:\n    namespace: openshift-storage\n    name: ocs-storagecluster\n  storageProviderEndpoint: ""\n  cephClusterFSID: 3a9ba188-ce63-11ef-97e4-00505684c451\n  storageClusterUID: 83e0a82f-9300-4e22-bbbe-82c5884fcfea\nstorageSystemName: ocs-storagecluster-storagesystem\n',
          },
          kind: 'ConfigMap',
          metadata: {
            name: 'odf-info',
            namespace: 'openshift-storage',
          },
        } as ConfigMapKind,
      },
    },
    {
      apiVersion: 'cluster.open-cluster-management.io/v1',
      kind: 'ManagedClusterView',
      metadata: {
        name: 'mcv',
        namespace: 'west-1',
      },
      status: {
        result: {
          apiVersion: 'v1',
          data: {
            'openshift-storage_ocs-storagecluster.config.yaml':
              'version: 4.18.0-103.stable\ndeploymentType: internal\nclients: []\nstorageCluster:\n  namespacedName:\n    namespace: openshift-storage\n    name: ocs-storagecluster\n  storageProviderEndpoint: ""\n  cephClusterFSID: cb805a94-bd68-41a7-9a89-6d420ae02002\n  storageClusterUID: 9dd5f858-d6ec-4d38-af41-16cc9cacabd4\nstorageSystemName: ocs-storagecluster-storagesystem\n',
          },
          kind: 'ConfigMap',
          metadata: {
            name: 'odf-info',
            namespace: 'openshift-storage',
          },
        } as ConfigMapKind,
      },
    },
    {
      apiVersion: 'cluster.open-cluster-management.io/v1',
      kind: 'ManagedClusterView',
      metadata: {
        name: 'mcv',
        namespace: 'east-2',
      },
      status: {
        result: {
          apiVersion: 'v1',
          data: {
            'openshift-storage_ocs-storagecluster.config.yaml':
              'version: 4.18.0-103.stable\ndeploymentType: internal\nclients: []\nstorageCluster:\n  namespacedName:\n    namespace: openshift-storage\n    name: ocs-storagecluster\n  storageProviderEndpoint: ""\n  cephClusterFSID: 3a9ba188-ce63-11ef-97e4-00505684c451\n  storageClusterUID: 83e0a82f-9300-4e22-bbbe-82c5884fcfea\nstorageSystemName: ocs-storagecluster-storagesystem\n',
          },
          kind: 'ConfigMap',
          metadata: {
            name: 'odf-info',
            namespace: 'openshift-storage',
          },
        } as ConfigMapKind,
      },
    },
  ],
  [
    {
      apiVersion: 'cluster.open-cluster-management.io/v1',
      kind: 'ManagedClusterView',
      metadata: {
        name: 'mcv',
        namespace: 'east-1',
      },
      status: {
        result: {
          apiVersion: 'v1',
          data: {
            'openshift-storage_ocs-storagecluster.config.yaml':
              'version: 4.18.0-103.stable\ndeploymentType: internal\nclients: []\nstorageCluster:\n  namespacedName:\n    namespace: openshift-storage\n    name: ocs-storagecluster\n  storageProviderEndpoint: ""\n  cephClusterFSID: 3a9ba188-ce63-11ef-97e4-00505684c451\n  storageClusterUID: 83e0a82f-9300-4e22-bbbe-82c5884fcfea\nstorageSystemName: ocs-storagecluster-storagesystem\n',
          },
          kind: 'ConfigMap',
          metadata: {
            name: 'odf-info',
            namespace: 'openshift-storage',
          },
        } as ConfigMapKind,
      },
    },
    {
      apiVersion: 'cluster.open-cluster-management.io/v1',
      kind: 'ManagedClusterView',
      metadata: {
        name: 'mcv',
        namespace: 'east-2',
      },
      status: {
        result: {
          apiVersion: 'v1',
          data: {
            'openshift-storage_ocs-storagecluster.config.yaml':
              'version: 4.18.0-103.stable\ndeploymentType: internal\nclients: []\nstorageCluster:\n  namespacedName:\n    namespace: openshift-storage\n    name: ocs-storagecluster\n  storageProviderEndpoint: ""\n  cephClusterFSID: 3a9ba188-ce63-11ef-97e4-00505684c451\n  storageClusterUID: 83e0a82f-9300-4e22-bbbe-82c5884fcfea\nstorageSystemName: ocs-storagecluster-storagesystem\n',
          },
          kind: 'ConfigMap',
          metadata: {
            name: 'odf-info',
            namespace: 'openshift-storage',
          },
        } as ConfigMapKind,
      },
    },
    {
      apiVersion: 'cluster.open-cluster-management.io/v1',
      kind: 'ManagedClusterView',
      metadata: {
        name: 'mcv',
        namespace: 'west-1',
      },
      status: {
        result: {
          apiVersion: 'v1',
          data: {
            'openshift-storage_ocs-storagecluster.config.yaml':
              'version: 4.17.0-103.stable\ndeploymentType: internal\nclients: []\nstorageCluster:\n  namespacedName:\n    namespace: openshift-storage\n    name: ocs-storagecluster\n  storageProviderEndpoint: ""\n  cephClusterFSID: cb805a94-bd68-41a7-9a89-6d420ae02002\n  storageClusterUID: 9dd5f858-d6ec-4d38-af41-16cc9cacabd4\nstorageSystemName: ocs-storagecluster-storagesystem\n',
          },
          kind: 'ConfigMap',
          metadata: {
            name: 'odf-info',
            namespace: 'openshift-storage',
          },
        } as ConfigMapKind,
      },
    },
  ],
];

const managedClusters: ACMManagedClusterKind[] = [
  mockManagedClusterEast1,
  mockManagedClusterWest1,
  mockManagedClusterEast2,
  mockManagedClusterWest2Down,
];

const csv = {
  apiVersion: 'operators.coreos.com/v1alpha1',
  kind: 'ClusterServiceVersion',
  spec: {
    version: '4.18.0',
  },
};

jest.mock('react-router-dom-v5-compat', () => ({
  ...jest.requireActual('react-router-dom-v5-compat'),
  useNavigate: () => null,
  useLocation: () => ({ pathname: '/' }),
}));

jest.mock('@openshift-console/dynamic-plugin-sdk', () => ({
  ...jest.requireActual('@openshift-console/dynamic-plugin-sdk'),
  useK8sWatchResource: jest.fn(({ kind }) => {
    if (
      kind ===
      `${ACMManagedClusterModel.apiGroup}~${ACMManagedClusterModel.apiVersion}~${ACMManagedClusterModel.kind}`
    ) {
      return [managedClusters, true, ''];
    }
    if (
      kind ===
      `${ACMManagedClusterViewModel.apiGroup}~${ACMManagedClusterViewModel.apiVersion}~${ACMManagedClusterViewModel.kind}`
    ) {
      if ([1, 3, 4].includes(testcase)) {
        return [managedClusterViews[0], true, ''];
      } else if ([2, 5, 6].includes(testcase)) {
        return [managedClusterViews[1], true, ''];
      }
    }
    if (
      kind ===
      `${DRPolicyModel.apiGroup}~${DRPolicyModel.apiVersion}~${DRPolicyModel.kind}`
    ) {
      return syncPolicyTest ? [[mockDRPolicy2], true, ''] : [[], true, ''];
    } else {
      return [[], true, ''];
    }
  }),
  k8sCreate: jest.fn(({ model, data }) => {
    if (model.kind === DRPolicyModel.kind) {
      drPolicyObj = data;
    } else if (model.kind === MirrorPeerModel.kind) {
      mirrorPeerObj = data;
    }
    return [Promise.resolve({ data: {} })];
  }),
  useListPageFilter: jest.fn((clusters) => [clusters, clusters, jest.fn()]),
  ListPageFilter: jest.fn(() => null),
}));

jest.mock('@odf/shared/hooks/use-fetch-csv', () => ({
  useFetchCsv: jest.fn(() => [csv]),
}));

describe('Test drpolicy list page', () => {
  test('Regional-DR policy creation happy path testing', async () => {
    render(<CreateDRPolicy />);
    testcase = 1;
    // Title
    expect(screen.getByText('Create DRPolicy')).toBeInTheDocument();

    // Description
    expect(
      screen.getByText(
        'Get a quick recovery in a remote or secondary cluster with a disaster recovery (DR) policy'
      )
    ).toBeInTheDocument();

    // Create button should be disabled
    expect(screen.getByTestId('create-button')).toBeDisabled();

    // Enter policy name
    expect(screen.getByText('Policy name')).toBeInTheDocument();

    await userEvent.type(screen.getByTestId('policy-name'), 'policy-1');

    // Managed cluster pairing
    expect(screen.getByText('Connect clusters')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Enables mirroring/replication between two selected clusters, ensuring failover or relocation between the two clusters in the event of an outage or planned maintenance.'
      )
    ).toBeInTheDocument();

    await userEvent.click(screen.getByLabelText('Select row 0'));
    expect(screen.getByLabelText('Select row 0')).toBeChecked();
    await userEvent.click(screen.getByLabelText('Select row 1'));
    expect(screen.getByLabelText('Select row 1')).toBeChecked();

    // Verify successful cluster selection
    expect(screen.getAllByText('east-1')).toHaveLength(2);
    expect(screen.getAllByText('west-1')).toHaveLength(2);
    expect(
      screen.getAllByText('ocs-storagecluster-storagesystem').length === 2
    ).toBeTruthy();
    expect(screen.getByText('Asynchronous')).toBeInTheDocument();
    expect(
      screen.getByText(
        'All disaster recovery prerequisites met for both clusters.'
      )
    ).toBeInTheDocument();

    // Create button should be enabled
    expect(screen.getByTestId('create-button')).toBeEnabled();

    // Create DRPolicy
    await userEvent.click(screen.getByTestId('create-button'));

    // Validate kube object creation
    expect(
      JSON.stringify(drPolicyObj) ===
        '{"apiVersion":"ramendr.openshift.io/v1alpha1","kind":"DRPolicy","metadata":{"name":"policy-1"},"spec":{"replicationClassSelector":{},"schedulingInterval":"5m","drClusters":["east-1","west-1"]}}'
    ).toBeTruthy();
    expect(
      JSON.stringify(mirrorPeerObj) ===
        '{"apiVersion":"multicluster.odf.openshift.io/v1alpha1","kind":"MirrorPeer","metadata":{"generateName":"mirrorpeer-"},"spec":{"manageS3":true,"type":"async","items":[{"clusterName":"east-1","storageClusterRef":{"name":"ocs-storagecluster","namespace":"openshift-storage"}},{"clusterName":"west-1","storageClusterRef":{"name":"ocs-storagecluster","namespace":"openshift-storage"}}]}}'
    ).toBeTruthy();
  });

  test('Metro-DR policy creation happy path testing', async () => {
    render(<CreateDRPolicy />);
    testcase = 2;
    // Create button should be disabled
    expect(screen.getByTestId('create-button')).toBeDisabled();

    // Enter policy name
    expect(screen.getByText('Policy name')).toBeInTheDocument();
    await userEvent.type(screen.getByTestId('policy-name'), 'policy-1');

    // Managed cluster pairing
    await userEvent.click(screen.getByLabelText('Select row 0'));
    expect(screen.getByLabelText('Select row 0')).toBeChecked();
    await userEvent.click(screen.getByLabelText('Select row 2'));
    expect(screen.getByLabelText('Select row 2')).toBeChecked();

    // Verify successful cluster selection
    expect(screen.getAllByText('east-1')).toHaveLength(2);
    expect(screen.getAllByText('east-2')).toHaveLength(2);
    expect(
      screen.getAllByText('ocs-storagecluster-storagesystem')
    ).toHaveLength(2);
    expect(screen.getByText('Synchronous')).toBeInTheDocument();
    expect(
      screen.getByText(
        'All disaster recovery prerequisites met for both clusters.'
      )
    ).toBeInTheDocument();

    // Create button should be enabled
    expect(screen.getByTestId('create-button')).toBeEnabled();

    // Create DRPolicy
    await userEvent.click(screen.getByTestId('create-button'));

    // Validate kube object creation
    expect(
      JSON.stringify(drPolicyObj) ===
        '{"apiVersion":"ramendr.openshift.io/v1alpha1","kind":"DRPolicy","metadata":{"name":"policy-1"},"spec":{"replicationClassSelector":{},"schedulingInterval":"0m","drClusters":["east-1","east-2"]}}'
    ).toBeTruthy();
    expect(
      JSON.stringify(mirrorPeerObj) ===
        '{"apiVersion":"multicluster.odf.openshift.io/v1alpha1","kind":"MirrorPeer","metadata":{"generateName":"mirrorpeer-"},"spec":{"manageS3":true,"type":"sync","items":[{"clusterName":"east-1","storageClusterRef":{"name":"ocs-storagecluster","namespace":"openshift-storage"}},{"clusterName":"east-2","storageClusterRef":{"name":"ocs-storagecluster","namespace":"openshift-storage"}}]}}'
    ).toBeTruthy();
  });

  test('Managed cluster down check', async () => {
    render(<CreateDRPolicy />);
    testcase = 3;
    // Managed cluster paring
    await userEvent.click(screen.getByLabelText('Select row 0'));
    expect(screen.getByLabelText('Select row 0')).toBeChecked();
    await userEvent.click(screen.getByLabelText('Select row 3'));
    expect(screen.getByLabelText('Select row 3')).toBeChecked();
    expect(screen.getByText('Offline')).toBeInTheDocument();
    expect(
      screen.getByText(
        '1 or more clusters do not meet disaster recovery cluster prerequisites.'
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'The selected managed cluster(s) does not meet all necessary conditions ' +
          'to be eligible for disaster recovery policy. Resolve the following ' +
          'issues to proceed with policy creation.'
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'We could not retrieve any information about the managed cluster {{clusterName}}'
      )
    ).toBeInTheDocument();
    // Create button should be disabled
    expect(screen.getByTestId('create-button')).toBeDisabled();
  });

  test('More than two cluster selection', async () => {
    render(<CreateDRPolicy />);
    testcase = 4;
    // Managed cluster paring
    await userEvent.click(screen.getByLabelText('Select row 0'));
    expect(screen.getByLabelText('Select row 0')).toBeChecked();
    await userEvent.click(screen.getByLabelText('Select row 1'));
    expect(screen.getByLabelText('Select row 1')).toBeChecked();

    // Rest of row selections should be disabled
    expect(screen.getByLabelText('Select row 2')).toBeDisabled();
    expect(screen.getByLabelText('Select row 3')).toBeDisabled();
  });

  test('MDR single policy check', async () => {
    render(<CreateDRPolicy />);
    testcase = 5;
    syncPolicyTest = true;
    // Managed cluster paring
    await userEvent.click(screen.getByLabelText('Select row 0'));
    expect(screen.getByLabelText('Select row 0')).toBeChecked();
    await userEvent.click(screen.getByLabelText('Select row 2'));
    expect(screen.getByLabelText('Select row 2')).toBeChecked();
    expect(
      screen.getByText('Selected clusters cannot be used to create a DRPolicy.')
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'A mirror peer configuration already exists for one or more of the selected clusters, ' +
          'either from an existing or deleted DR policy. To create a new DR policy with these clusters, ' +
          'delete any existing mirror peer configurations associated with them and try again.'
      )
    ).toBeInTheDocument();
  });

  test('Unsupported ODF version check', async () => {
    render(<CreateDRPolicy />);
    testcase = 6;
    syncPolicyTest = true;
    // Managed cluster paring
    await userEvent.click(screen.getByLabelText('Select row 0'));
    expect(screen.getByLabelText('Select row 0')).toBeChecked();
    await userEvent.click(screen.getByLabelText('Select row 1'));
    expect(screen.getByLabelText('Select row 1')).toBeChecked();
    expect(
      screen.getByText(
        '1 or more clusters do not meet disaster recovery cluster prerequisites.'
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'The selected managed cluster(s) does not meet all necessary conditions ' +
          'to be eligible for disaster recovery policy. Resolve the following ' +
          'issues to proceed with policy creation.'
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText('1 check unsuccessful on the {{clusterName}}:')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Data foundation must be {{version}} or above.')
    ).toBeInTheDocument();
  });
});
