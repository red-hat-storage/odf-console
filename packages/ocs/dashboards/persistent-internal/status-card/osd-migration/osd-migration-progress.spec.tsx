import React from 'react';
import { BLUESTORE, BLUESTORE_RDR } from '@odf/core/constants';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import { MemoryRouter } from 'react-router-dom';
import { getOSDMigrationStatus } from '../../../../utils/osd-migration';
import { OSDMigrationProgress } from './osd-migration-progress';

jest.mock('@odf/shared/status/icons', () => ({
  RedExclamationCircleIcon: 'div',
}));

jest.mock('@openshift-console/dynamic-plugin-sdk-internal', () => ({
  HealthBody: 'div',
  HealthItem: ({ title }) => <div>{title}</div>,
  ViewDocumentation: ({ text, doclink }) => <a href={doclink}>{text}</a>,
  HealthState: {
    NOT_AVAILABLE: 'NOT_AVAILABLE',
    OK: 'OK',
  },
}));

jest.mock('../../../../utils/osd-migration');
afterEach(cleanup);

describe('OSDMigrationStatus', () => {
  test('renders the component with COMPLETED status', async () => {
    const cephData = {
      status: {
        storage: {
          osd: {
            storeType: {
              [BLUESTORE_RDR]: 5,
            },
          },
        },
      },
    };

    getOSDMigrationStatus.mockReturnValue('Completed');

    render(
      <MemoryRouter>
        <OSDMigrationProgress cephData={cephData} />
      </MemoryRouter>
    );

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
              [BLUESTORE]: 10,
              [BLUESTORE_RDR]: 5,
            },
          },
        },
      },
    };

    getOSDMigrationStatus.mockReturnValue('In Progress');

    render(
      <MemoryRouter>
        <OSDMigrationProgress cephData={cephData} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(
        screen.getByText('Cluster OSDs are being migrated')
      ).toBeInTheDocument();
    });
  });
});
