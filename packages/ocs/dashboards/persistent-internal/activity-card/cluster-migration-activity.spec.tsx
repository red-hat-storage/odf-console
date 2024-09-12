import * as React from 'react';
import { CephClusterKind } from '@odf/shared/types';
import { render, screen } from '@testing-library/react';
import { ClusterMigrationActivity } from './cluster-migration-activity';

const cephDataPending: CephClusterKind = {
  status: {
    storage: {
      osd: {
        storeType: {
          bluestore: 5,
          'bluestore-rdr': 0,
        },
      },
    },
  },
};

const cephDataInProgress: CephClusterKind = {
  status: {
    storage: {
      osd: {
        storeType: {
          bluestore: 2,
          'bluestore-rdr': 3,
        },
      },
    },
  },
};

const cephDataCompleted: CephClusterKind = {
  status: {
    storage: {
      osd: {
        storeType: {
          bluestore: 0,
          'bluestore-rdr': 5,
        },
      },
    },
  },
};

describe('ClusterMigrationActivity', () => {
  test('renders migration progress correctly for pending migration', () => {
    render(<ClusterMigrationActivity resource={cephDataPending} />);

    expect(screen.getByText('Migrating cluster OSDs')).toBeInTheDocument();
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  test('renders migration progress correctly for ongoing migration', () => {
    render(<ClusterMigrationActivity resource={cephDataInProgress} />);

    expect(screen.getByText('Migrating cluster OSDs')).toBeInTheDocument();
    expect(screen.getByText('60%')).toBeInTheDocument();
  });

  test('renders migration progress correctly for completed migration', () => {
    render(<ClusterMigrationActivity resource={cephDataCompleted} />);

    expect(screen.getByText('Migrating cluster OSDs')).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
  });
});
