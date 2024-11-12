import * as React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { STATUS_QUERIES, StorageDashboard } from '../../queries';
import { StatusCard } from './status-card';

let testCaseId = 1;

const healthStatus = {
  status: 'success',
  data: {
    resultType: 'vector',
    result: [
      {
        metric: {
          __name__: `${STATUS_QUERIES[StorageDashboard.HEALTH]}`,
          cluster: 'cluster-1',
          clusterID: '23b41e13-5668-4fe9-83ab-ce109efb0634',
          container: 'core',
          endpoint: 'mgmt',
          instance: '10.131.0.32:8080',
          job: 'noobaa-mgmt',
          target_namespace: 'namespace-1',
          namespace: 'namespace-1',
          pod: 'noobaa-core-0',
          receive: 'true',
          service: 'noobaa-mgmt',
          system_type: 'OCS',
          system_vendor: 'Red Hat',
          tenant_id: '0a4c8828-9b16-42fc-9195-056d96cbe66f',
        },
        value: [1700478807.019, '0'],
      },
      {
        metric: {
          __name__: `${STATUS_QUERIES[StorageDashboard.HEALTH]}`,
          cluster: 'cluster-1',
          clusterID: '23b41e13-5668-4fe9-83ab-ce109efb0634',
          container: 'mgr',
          endpoint: 'http-metrics',
          instance: '10.131.0.27:9283',
          job: 'rook-ceph-mgr',
          managedBy: 'ocs-storagecluster',
          target_namespace: 'namespace-1',
          namespace: 'namespace-1',
          pod: 'rook-ceph-mgr-a-d4d78778d-2zxmh',
          receive: 'true',
          service: 'rook-ceph-mgr',
          system_type: 'OCS',
          system_vendor: 'Red Hat',
          tenant_id: '0a4c8828-9b16-42fc-9195-056d96cbe66f',
        },
        value: [1700478807.019, '0'],
      },
      {
        metric: {
          __name__: `${STATUS_QUERIES[StorageDashboard.HEALTH]}`,
          cluster: 'cluster-2',
          clusterID: 'b3e8ac99-3ebf-4c39-b3af-7902b14669fe',
          container: 'core',
          endpoint: 'mgmt',
          instance: '10.133.2.39:8080',
          job: 'noobaa-mgmt',
          target_namespace: 'namespace-1',
          namespace: 'namespace-1',
          pod: 'noobaa-core-0',
          receive: 'true',
          service: 'noobaa-mgmt',
          system_type: 'OCS',
          system_vendor: 'Red Hat',
          tenant_id: '0a4c8828-9b16-42fc-9195-056d96cbe66f',
        },
        value: [1700478807.019, '0'],
      },
      {
        metric: {
          __name__: `${STATUS_QUERIES[StorageDashboard.HEALTH]}`,
          cluster: 'cluster-2',
          clusterID: 'b3e8ac99-3ebf-4c39-b3af-7902b14669fe',
          container: 'mgr',
          endpoint: 'http-metrics',
          instance: '10.132.2.22:9283',
          job: 'rook-ceph-mgr',
          managedBy: 'ocs-storagecluster',
          target_namespace: 'namespace-1',
          namespace: 'namespace-1',
          pod: 'rook-ceph-mgr-a-7488547d8d-9dx8f',
          receive: 'true',
          service: 'rook-ceph-mgr',
          system_type: 'OCS',
          system_vendor: 'Red Hat',
          tenant_id: '0a4c8828-9b16-42fc-9195-056d96cbe66f',
        },
        value: [1700478807.019, '0'],
      },
    ],
  },
};

const storageSystemStatus = {
  status: 'success',
  data: {
    resultType: 'vector',
    result: [
      {
        metric: {
          cluster: 'cluster-1',
          clusterID: '23b41e13-5668-4fe9-83ab-ce109efb0634',
          container: 'mgr',
          endpoint: 'http-metrics',
          instance: '10.131.0.27:9283',
          job: 'rook-ceph-mgr',
          managedBy: 'ocs-storagecluster',
          target_namespace: 'namespace-1',
          namespace: 'namespace-1',
          pod: 'rook-ceph-mgr-a-d4d78778d-2zxmh',
          receive: 'true',
          service: 'rook-ceph-mgr',
          system_type: 'OCS',
          system_vendor: 'Red Hat',
          tenant_id: '0a4c8828-9b16-42fc-9195-056d96cbe66f',
          storage_system: 'storagesystem-1',
          target_kind: 'storagecluster.ocs.openshift.io/v1',
        },
        value: [1700478807.019, '0'],
      },
      {
        metric: {
          cluster: 'cluster-2',
          clusterID: 'b3e8ac99-3ebf-4c39-b3af-7902b14669fe',
          container: 'mgr',
          endpoint: 'http-metrics',
          instance: '10.132.2.22:9283',
          job: 'rook-ceph-mgr',
          managedBy: 'ocs-storagecluster',
          target_namespace: 'namespace-1',
          namespace: 'namespace-1',
          pod: 'rook-ceph-mgr-a-7488547d8d-9dx8f',
          receive: 'true',
          service: 'rook-ceph-mgr',
          system_type: 'OCS',
          system_vendor: 'Red Hat',
          tenant_id: '0a4c8828-9b16-42fc-9195-056d96cbe66f',
          storage_system: 'storagesystem-2',
          target_kind: 'storagecluster.ocs.openshift.io/v1',
        },
        value: [1700478807.019, '0'],
      },
    ],
  },
};

const csvStatus = {
  status: 'success',
  data: {
    resultType: 'vector',
    result: [
      {
        metric: {
          __name__: 'csv_succeeded',
          cluster: 'cluster-1',
          clusterID: '23b41e13-5668-4fe9-83ab-ce109efb0634',
          container: 'olm-operator',
          endpoint: 'https-metrics',
          exported_namespace: 'namespace-1',
          instance: '10.130.0.33:8443',
          job: 'olm-operator-metrics',
          name: 'odf-operator.v4.14.0-rhodf',
          namespace: 'openshift-operator-lifecycle-manager',
          pod: 'olm-operator-56d5ff6b6b-lhkdv',
          receive: 'true',
          service: 'olm-operator-metrics',
          tenant_id: '0a4c8828-9b16-42fc-9195-056d96cbe66f',
          version: '4.14.0-rhodf',
        },
        value: [1700482361.796, '1'],
      },
      {
        metric: {
          __name__: 'csv_succeeded',
          cluster: 'cluster-2',
          clusterID: 'b3e8ac99-3ebf-4c39-b3af-7902b14669fe',
          container: 'olm-operator',
          endpoint: 'https-metrics',
          exported_namespace: 'namespace-2',
          instance: '10.134.0.31:8443',
          job: 'olm-operator-metrics',
          name: 'odf-operator.v4.14.0-rhodf',
          namespace: 'openshift-operator-lifecycle-manager',
          pod: 'olm-operator-56d5ff6b6b-vmw7c',
          receive: 'true',
          service: 'olm-operator-metrics',
          tenant_id: '0a4c8828-9b16-42fc-9195-056d96cbe66f',
          version: '4.14.0-rhodf',
        },
        value: [1700482361.796, '1'],
      },
    ],
  },
};

const MockHealthBody: React.FC = ({ children }) => (
  <div className="co-status-card__health-body">{children}</div>
);

jest.mock(
  '@odf/shared/hooks/custom-prometheus-poll/custom-prometheus-poll-hook',
  () => ({
    useCustomPrometheusPoll: jest.fn((props: { query: string }) => {
      if (props.query === STATUS_QUERIES[StorageDashboard.SYSTEM_HEALTH]) {
        return [storageSystemStatus, undefined, false];
      } else if (props.query === STATUS_QUERIES[StorageDashboard.HEALTH]) {
        if (testCaseId === 2) {
          healthStatus.data.result[0].value[1] = '1';
        }
        return [healthStatus, undefined, false];
      } else if (props.query === STATUS_QUERIES[StorageDashboard.CSV_STATUS]) {
        if (testCaseId === 2) {
          csvStatus.data.result[0].value[1] = '0';
        }
        return [csvStatus, undefined, false];
      }
    }),
  })
);

jest.mock('@openshift-console/dynamic-plugin-sdk-internal', () => ({
  // HealthBody import is causing error
  HealthBody: (props) => <MockHealthBody {...props} />,
}));

describe('Test ODF cluster status from different clusters and namespaces', () => {
  test('All healthy case testing', async () => {
    testCaseId = 1;
    render(<StatusCard />);
    // Title
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getAllByText('Healthy').length === 2).toBeTruthy();

    // Operator health
    expect(screen.getByText('Data Foundation')).toBeInTheDocument();
    await waitFor(() => {
      fireEvent.click(screen.getByText('Data Foundation'));
      // Popover
      expect(screen.getByText('Data Foundation status')).toBeInTheDocument();
      expect(
        screen.getByText(
          'The Data Foundation operator is the primary operator of Data Foundation'
        )
      ).toBeInTheDocument();
      expect(screen.getByText('Operator status')).toBeInTheDocument();
      expect(screen.getByText('Running')).toBeInTheDocument();
      expect(screen.getByText('Degraded')).toBeInTheDocument();
      // Running operator count
      expect(screen.getByText('2')).toBeInTheDocument();
      // Degraded operator count
      expect(screen.getByText('0')).toBeInTheDocument();

      // Close popover
      fireEvent.click(screen.getByLabelText('Close'));
    });

    expect(screen.getByText('Systems')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Systems'));
    // Storage system health
    await waitFor(() => {
      // Popover
      expect(screen.getByText('Storage System status')).toBeInTheDocument();
      expect(
        screen.getByText(
          'StorageSystem is responsible for ensuring different types of file and block storage availability, storage capacity management and generic operations on storage.'
        )
      ).toBeInTheDocument();
      expect(screen.getByText('Storage System (2)')).toBeInTheDocument();
      //  Operator status
      expect(screen.getAllByText('Warning').length === 2).toBeTruthy();
      expect(screen.getByText('Critical')).toBeInTheDocument();
      expect(screen.getByText('Error')).toBeInTheDocument();
      expect(screen.getByText('Critical')).toBeInTheDocument();
      expect(screen.getAllByText('Healthy').length === 3).toBeTruthy();
      expect(screen.getByText('Normal')).toBeInTheDocument();
      expect(screen.getAllByText(`(0)`).length === 2).toBeTruthy();
      expect(screen.getByText(`(2)`)).toBeInTheDocument();
    });
  });

  test('Partially healthy case testing', async () => {
    testCaseId = 2;
    render(<StatusCard />);
    // Title
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Error')).toBeInTheDocument();
    expect(screen.getByText('Warning')).toBeInTheDocument();
    expect(screen.getAllByText('Degraded').length === 2).toBeTruthy();

    // Operator health
    expect(screen.getByText('Data Foundation')).toBeInTheDocument();
    await waitFor(() => {
      fireEvent.click(screen.getByText('Data Foundation'));
      // Popover
      expect(screen.getByText('Data Foundation status')).toBeInTheDocument();
      expect(
        screen.getByText(
          'The Data Foundation operator is the primary operator of Data Foundation'
        )
      ).toBeInTheDocument();
      expect(screen.getByText('Operator status')).toBeInTheDocument();
      expect(screen.getByText('Running')).toBeInTheDocument();
      expect(screen.getAllByText('Degraded').length === 3).toBeTruthy();
      // Running and degraded operator count
      expect(screen.getAllByText('1').length === 2).toBeTruthy();

      // Close popover
      fireEvent.click(screen.getByLabelText('Close'));
    });

    expect(screen.getByText('Systems')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Systems'));
    // Storage system health
    await waitFor(() => {
      // Popover
      expect(screen.getByText('Storage System status')).toBeInTheDocument();
      expect(
        screen.getByText(
          'StorageSystem is responsible for ensuring different types of file and block storage availability, storage capacity management and generic operations on storage.'
        )
      ).toBeInTheDocument();
      expect(screen.getByText('Storage System (2)')).toBeInTheDocument();
      //  Operator status
      expect(screen.getAllByText('Warning').length === 3).toBeTruthy();
      expect(screen.getByText('Critical')).toBeInTheDocument();
      expect(screen.getAllByText('Error').length === 2).toBeTruthy();
      expect(screen.getByText('Critical')).toBeInTheDocument();
      expect(screen.getByText('Healthy')).toBeInTheDocument();
      expect(screen.getByText('Normal')).toBeInTheDocument();
      expect(screen.getAllByText(`(1)`).length === 2).toBeTruthy();
      expect(screen.getByText(`(0)`)).toBeInTheDocument();
    });
  });
});
