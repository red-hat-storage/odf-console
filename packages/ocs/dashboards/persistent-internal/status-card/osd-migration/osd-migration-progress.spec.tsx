import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import { getOSDMigrationStatus } from '../../../../utils/osd-migration';
import { OSDMigrationProgress } from './osd-migration-progress';

jest.mock('@openshift-console/dynamic-plugin-sdk-internal', () => ({
  HealthBody: 'div',
  HealthItem: ({ title }: { title: string }) => <div>{title}</div>,
}));

jest.mock('../../../../utils/osd-migration');

describe('OSDMigrationProgress', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('renders the component with COMPLETED status', async () => {
    const cephData = {
      status: {
        storage: {
          osd: {
            storeType: {
              'bluestore-rdr': 5,
            },
          },
        },
      },
    };

    getOSDMigrationStatus.mockReturnValue('Completed');

    render(<OSDMigrationProgress cephData={cephData} />);

    await waitFor(() => {
      expect(
        screen.getByText('Cluster ready for Regional-DR setup.')
      ).toBeInTheDocument();
    });
  });

  test('renders the component with PENDING status', async () => {
    const cephData = {
      status: {
        storage: {
          osd: {
            storeType: {
              bluestore: 10,
              'bluestore-rdr': 5,
            },
          },
        },
      },
    };

    getOSDMigrationStatus.mockReturnValue('In Progress');

    render(<OSDMigrationProgress cephData={cephData} />);

    await waitFor(() => {
      expect(
        screen.getByText('Cluster OSDs are being migrated')
      ).toBeInTheDocument();
    });
  });
});
