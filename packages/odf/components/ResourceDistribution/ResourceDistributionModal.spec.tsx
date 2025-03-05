import * as React from 'react';
import { StorageConsumerKind } from '@odf/shared';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ResourceDistributionModal from './ResourceDistributionModal';

jest.mock('@odf/shared', () => ({
  ...jest.requireActual('@odf/shared'),
  useCustomTranslation: jest.fn().mockReturnValue({ t: (key: string) => key }),
}));

jest.mock('@openshift-console/dynamic-plugin-sdk', () => {
  return {
    ...jest.requireActual('@openshift-console/dynamic-plugin-sdk'),
    useK8sWatchResources: jest.fn().mockReturnValue({
      storageClasses: {
        data: [
          {
            apiVersion: 'v1',
            kind: 'StorageClass',
            metadata: {
              name: 'test-storage-class',
              namespace: 'test-namespace',
            },
            provisioner: 'test-provisioner.rbd.csi.ceph.com',
          },
        ],
        loaded: true,
        error: null,
      },
      volumeSnapshotClasses: {
        data: [
          {
            apiVersion: 'v1',
            kind: 'VolumeSnapshotClass',
            metadata: {
              name: 'test-snapshot-class',
              namespace: 'test-namespace',
            },
            driver: 'test-provisioner.rbd.csi.ceph.com',
          },
        ],
        loaded: true,
        error: null,
      },
    }),
    k8sPatch: jest.fn(),
    useListPageFilter: jest.fn().mockReturnValue([
      [],
      [
        {
          apiVersion: 'v1',
          kind: 'StorageClass',
          metadata: {
            name: 'test-storage-class',
            namespace: 'test-namespace',
          },
          provisioner: 'test-provisioner.rbd.csi.ceph.com',
        },
      ],
      jest.fn(),
    ]),
  };
});

const storageConsumerResource: StorageConsumerKind = {
  apiVersion: 'v1',
  kind: 'StorageConsumer',
  metadata: {
    name: 'test-storage-consumer',
    namespace: 'test-namespace',
  },
  spec: {
    storageClasses: [
      {
        name: 'test-storage-class',
      },
    ],
    volumeSnapshotClasses: [],
    storageQuotaInGiB: 0,
  },
  status: {},
};
describe('Test ResourceDistributionModal', () => {
  it('Renders basic features correctly', () => {
    render(
      <ResourceDistributionModal
        isOpen={true}
        extraProps={{ resource: storageConsumerResource }}
        closeModal={jest.fn()}
      />
    );
    expect(
      screen.getByText('Manage distribution of resources')
    ).toBeInTheDocument();

    expect(screen.getByText('Storage classes')).toBeInTheDocument();
    const checkbox = screen.getAllByLabelText('Select row 0')[0];
    expect(checkbox).toBeChecked();
  });
});
