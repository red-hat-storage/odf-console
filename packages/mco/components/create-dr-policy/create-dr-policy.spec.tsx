import * as React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import {
  ACMManagedClusterModel,
  DRPolicyModel,
  MirrorPeerModel,
} from '../../models';
import { ACMManagedClusterKind } from '../../types';
import CreateDRPolicy from './create-dr-policy';

let drPolicyObj = {};
let mirrorPeerObj = {};

const managedClusters: ACMManagedClusterKind[] = [
  {
    apiVersion: 'cluster.open-cluster-management.io/v1',
    kind: 'ManagedCluster',
    metadata: {
      name: 'east-1',
    },
    status: {
      clusterClaims: [
        {
          name: 'region.open-cluster-management.io',
          value: 'us-east-1',
        },
      ],
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
  },
  {
    apiVersion: 'cluster.open-cluster-management.io/v1',
    kind: 'ManagedCluster',
    metadata: {
      name: 'west-1',
    },
    status: {
      clusterClaims: [
        {
          name: 'region.open-cluster-management.io',
          value: 'us-west-1',
        },
      ],
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
  },
  {
    apiVersion: 'cluster.open-cluster-management.io/v1',
    kind: 'ManagedCluster',
    metadata: {
      name: 'east-2',
    },
    status: {
      clusterClaims: [
        {
          name: 'region.open-cluster-management.io',
          value: 'us-east-2',
        },
      ],
      conditions: [
        {
          type: 'ManagedClusterJoined',
          lastTransitionTime: '2023-11-29T04:30:13Z',
          message: 'Managed cluster joined',
          reason: 'ManagedClusterJoined',
          status: 'False',
        },
      ],
    },
  },
  {
    apiVersion: 'cluster.open-cluster-management.io/v1',
    kind: 'ManagedCluster',
    metadata: {
      name: 'west-2',
    },
    status: {
      clusterClaims: [
        {
          name: 'region.open-cluster-management.io',
          value: 'us-west-2',
        },
      ],
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
  },
  {
    apiVersion: 'cluster.open-cluster-management.io/v1',
    kind: 'ManagedCluster',
    metadata: {
      name: 'east-3',
    },
    status: {
      clusterClaims: [
        {
          name: 'region.open-cluster-management.io',
          value: 'us-east-3',
        },
      ],
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
  },
  {
    apiVersion: 'cluster.open-cluster-management.io/v1',
    kind: 'ManagedCluster',
    metadata: {
      name: 'west-3',
    },
    status: {
      clusterClaims: [
        {
          name: 'region.open-cluster-management.io',
          value: 'us-west-3',
        },
      ],
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
  },
  {
    apiVersion: 'cluster.open-cluster-management.io/v1',
    kind: 'ManagedCluster',
    metadata: {
      name: 'east-4',
    },
    status: {
      clusterClaims: [
        {
          name: 'region.open-cluster-management.io',
          value: 'us-east-4',
        },
      ],
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
  },
  {
    apiVersion: 'cluster.open-cluster-management.io/v1',
    kind: 'ManagedCluster',
    metadata: {
      name: 'west-4',
    },
    status: {
      clusterClaims: [
        {
          name: 'region.open-cluster-management.io',
          value: 'us-west-4',
        },
      ],
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
  },
  {
    apiVersion: 'cluster.open-cluster-management.io/v1',
    kind: 'ManagedCluster',
    metadata: {
      name: 'east-5',
    },
    status: {
      clusterClaims: [
        {
          name: 'region.open-cluster-management.io',
          value: 'us-east-5',
        },
      ],
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
  },
];

const csv = {
  apiVersion: 'operators.coreos.com/v1alpha1',
  kind: 'ClusterServiceVersion',
  spec: {
    version: '4.14.0',
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
}));

jest.mock('@odf/shared/hooks/use-fetch-csv', () => ({
  useFetchCsv: jest.fn(() => [csv]),
}));

// todo(bipuladh): Enable tests
// eslint-disable-next-line
xdescribe('Test drpolicy list page', () => {
  beforeEach(() => {
    render(<CreateDRPolicy />);
  });
  test('DR policy creation test', async () => {
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
    fireEvent.change(screen.getByTestId('policy-name'), {
      target: { value: 'policy-1' },
    });

    // Managed cluster paring
    expect(screen.getByText('Connect clusters')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Enables mirroring/replication between two selected clusters, ensuring failover or relocation between the two clusters in the event of an outage or planned maintenance.'
      )
    ).toBeInTheDocument();
    await waitFor(() => {
      fireEvent.click(screen.getAllByText('Region')[0]);
      expect(screen.getByText('us-east-1')).toBeInTheDocument();
      expect(screen.getByText('us-east-3')).toBeInTheDocument();
      expect(screen.getByText('us-east-4')).toBeInTheDocument();
      expect(screen.getByText('us-west-1')).toBeInTheDocument();
      expect(screen.getByText('us-west-2')).toBeInTheDocument();
      expect(screen.getByText('us-west-3')).toBeInTheDocument();
      expect(screen.getByText('us-west-4')).toBeInTheDocument();
    });
    // Managed cluster listing
    expect(screen.getByText('east-1')).toBeInTheDocument();
    expect(screen.getByText('east-3')).toBeInTheDocument();
    expect(screen.getByText('east-4')).toBeInTheDocument();
    expect(screen.getByText('west-1')).toBeInTheDocument();
    expect(screen.getByText('west-2')).toBeInTheDocument();
    expect(screen.getByText('west-3')).toBeInTheDocument();
    expect(screen.getByText('west-4')).toBeInTheDocument();

    // Select east-1
    await waitFor(() => fireEvent.click(screen.getByTestId('east-1')));
    // Select west-1
    await waitFor(() => fireEvent.click(screen.getByTestId('west-1')));
    // Verify selected cluster info
    expect(screen.getByText('Selected clusters')).toBeInTheDocument();
    expect(screen.getAllByText('east-1').length === 2).toBeTruthy();
    expect(screen.getAllByText('west-1').length === 2).toBeTruthy();
    expect(
      screen.getAllByText('ocs-storagecluster-storagesystem').length === 2
    ).toBeTruthy();
    expect(screen.getAllByText('us-east-1').length === 2).toBeTruthy();
    expect(screen.getAllByText('us-west-1').length === 2).toBeTruthy();

    // Replication type
    expect(screen.getByText('Replication policy')).toBeInTheDocument();
    expect(screen.getByText('Asynchronous')).toBeInTheDocument();

    // Sync interval
    expect(screen.getByText('Sync schedule')).toBeInTheDocument();
    expect(screen.getByText('minutes')).toBeInTheDocument();

    // Create button should be enabled
    expect(screen.getByTestId('create-button')).toBeEnabled();
    await waitFor(() => fireEvent.click(screen.getByTestId('create-button')));
    expect(
      JSON.stringify(drPolicyObj) ===
        '{"apiVersion":"ramendr.openshift.io/v1alpha1","kind":"DRPolicy","metadata":{"name":"policy-1"},"spec":{"schedulingInterval":"5m","drClusters":["east-1","west-1"]}}'
    ).toBeTruthy();
    expect(
      JSON.stringify(mirrorPeerObj) ===
        '{"apiVersion":"multicluster.odf.openshift.io/v1alpha1","kind":"MirrorPeer","metadata":{"generateName":"mirrorpeer-"},"spec":{"manageS3":true,"type":"async","items":[{"clusterName":"east-1","storageClusterRef":{"name":"ocs-storagecluster","namespace":"openshift-storage"}},{"clusterName":"west-1","storageClusterRef":{"name":"ocs-storagecluster","namespace":"openshift-storage"}}]}}'
    ).toBeTruthy();
  });

  test('Partially imported cluster test', async () => {
    let nonExist = false;
    // Enter policy name
    expect(screen.getByText('Policy name')).toBeInTheDocument();
    fireEvent.change(screen.getByTestId('policy-name'), {
      target: { value: 'policy-1' },
    });
    try {
      // east-2 is partially imported cluster
      screen.getByText('east-2');
    } catch (_error) {
      nonExist = true;
    }
    expect(nonExist).toBe(true);
    // Create button should be disabled
    expect(screen.getByTestId('create-button')).toBeDisabled();
  });

  test('Down cluser selection test', async () => {
    // Enter policy name
    expect(screen.getByText('Policy name')).toBeInTheDocument();
    fireEvent.change(screen.getByTestId('policy-name'), {
      target: { value: 'policy-1' },
    });
    // Select west-2 down cluster
    await waitFor(() => fireEvent.click(screen.getByTestId('west-2')));
    // Error message for down cluster
    expect(
      screen.getByText('1 or more managed clusters are offline')
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'The status for both the managed clusters must be available for creating a DR policy. To restore a cluster to an available state, refer to the instructions in the ACM documentation.'
      )
    ).toBeInTheDocument();
    // Create button should be disabled
    expect(screen.getByTestId('create-button')).toBeDisabled();
  });

  test('Multiple ODF cluster selection test', async () => {
    // Enter policy name
    expect(screen.getByText('Policy name')).toBeInTheDocument();
    fireEvent.change(screen.getByTestId('policy-name'), {
      target: { value: 'policy-1' },
    });
    // East-3 multiple ODF cluster
    expect(screen.getByTestId('east-3')).toBeDisabled();
    // Create button should be disabled
    expect(screen.getByTestId('create-button')).toBeDisabled();
  });

  test('Non ODF cluster selection test', async () => {
    // Enter policy name
    expect(screen.getByText('Policy name')).toBeInTheDocument();
    fireEvent.change(screen.getByTestId('policy-name'), {
      target: { value: 'policy-1' },
    });
    // Select west-3 non ODF cluster
    await waitFor(() => fireEvent.click(screen.getByTestId('west-3')));
    // Error message for non ODF detection
    expect(
      screen.getByText('Cannot proceed with one or more selected clusters')
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'We could not retrieve any information about the managed cluster {{names}}. Check the documentation for potential causes and follow the steps mentioned and try again.'
      )
    ).toBeInTheDocument();
    // Create button should be disabled
    expect(screen.getByTestId('create-button')).toBeDisabled();
  });

  test('Select partially deployed ODF cluster test', async () => {
    // Enter policy name
    expect(screen.getByText('Policy name')).toBeInTheDocument();
    fireEvent.change(screen.getByTestId('policy-name'), {
      target: { value: 'policy-1' },
    });
    // Select west-4 ceph cluster creation inprogress
    await waitFor(() => fireEvent.click(screen.getByTestId('west-4')));
    // Error message for cephFSID not found
    expect(
      screen.getByText('{{ names }} is not connected to RHCS')
    ).toBeInTheDocument();
    // Create button should be disabled
    expect(screen.getByTestId('create-button')).toBeDisabled();
  });

  test('Select unsupported ODF version cluster test', async () => {
    // Enter policy name
    expect(screen.getByText('Policy name')).toBeInTheDocument();
    fireEvent.change(screen.getByTestId('policy-name'), {
      target: { value: 'policy-1' },
    });
    // Select east-4 unsupported ODF operator version
    await waitFor(() => fireEvent.click(screen.getByTestId('east-4')));
    // Error message for unsupported ODF version
    expect(
      screen.getByText(
        '{{ names }} has either an unsupported Data Foundation version or the Data Foundation operator is missing, install or update to Data Foundation {{ version }} or the latest version to enable DR protection.'
      )
    ).toBeInTheDocument();
    // Create button should be disabled
    expect(screen.getByTestId('create-button')).toBeDisabled();
  });
});
