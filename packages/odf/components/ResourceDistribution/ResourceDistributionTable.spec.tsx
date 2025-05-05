import * as React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { StorageClassRowGenerator } from '../../modals/ResourceDistributionModal/ResourceDistributionModal';
import {
  ResourceDistributionTable,
  SelectedResources,
} from './ResourceDistributionTable';

const resources = [
  {
    apiVersion: 'v1',
    kind: 'StorageClass',
    metadata: {
      name: 'test-storage-class',
      namespace: 'test-namespace',
    },
    provisioner: 'test-provisioner',
  },
  {
    apiVersion: 'v1',
    kind: 'VolumeSnapshotClass',
    metadata: {
      name: 'test-snapshot-class',
      namespace: 'test-namespace',
    },
    driver: 'test-driver',
  },
];

const selectedResources: SelectedResources = {
  storageClass: {
    'test-storage-class': false,
  },
  volumeSnapshotClass: {
    'test-snapshot-class': false,
  },
};

jest.mock('@openshift-console/dynamic-plugin-sdk', () => {
  return {
    ...jest.requireActual('@openshift-console/dynamic-plugin-sdk'),
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
          provisioner: 'test-provisioner',
        },
      ],
      jest.fn(),
    ]),
  };
});

describe('Resource distribution table component renders correctly for a storage class', () => {
  it('Renders basic features correctly', () => {
    render(
      <ResourceDistributionTable
        columns={['Name', 'Provisioner', 'Deletion policy']}
        loaded={true}
        selectedResources={selectedResources}
        setSelectedResources={jest.fn()}
        resources={resources}
        RowGenerator={StorageClassRowGenerator as any}
        resourceType={'storageClass'}
      />
    );
    expect(
      screen.getByTestId('resource-distribution-table')
    ).toBeInTheDocument();

    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Provisioner')).toBeInTheDocument();
    expect(screen.getByText('Deletion policy')).toBeInTheDocument();
    expect(screen.getByText('test-storage-class')).toBeInTheDocument();
  });
  it('Selection invokes setSelectedResources with correct parameters', async () => {
    const setSelectedResourcesMock = jest.fn();
    render(
      <ResourceDistributionTable
        columns={['Name', 'Provisioner', 'Deletion policy']}
        loaded={true}
        selectedResources={selectedResources}
        setSelectedResources={setSelectedResourcesMock}
        resources={resources}
        RowGenerator={StorageClassRowGenerator as any}
        resourceType={'storageClass'}
      />
    );
    const checkbox = screen.getByLabelText('Select row 0');
    expect(checkbox).toBeInTheDocument();
    const user = userEvent.setup();
    await user.click(checkbox);
    expect(setSelectedResourcesMock).toHaveBeenCalledWith({
      volumeSnapshotClass: {
        'test-snapshot-class': false,
      },
      storageClass: {
        'test-storage-class': true,
      },
    });
    // Test select all
    const selectAll = screen.getByLabelText('Select all rows');
    expect(selectAll).toBeInTheDocument();
    await userEvent.click(selectAll);
    expect(setSelectedResourcesMock).toHaveBeenCalledWith({
      volumeSnapshotClass: {
        'test-snapshot-class': false,
      },
      storageClass: {
        'test-storage-class': true,
      },
    });
  });
});
