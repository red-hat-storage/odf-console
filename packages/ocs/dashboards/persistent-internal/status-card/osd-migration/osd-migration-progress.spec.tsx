import React from 'react';
import { CephClusterKind } from '@odf/shared/src/types/storage';
import { render, screen } from '@testing-library/react';
import { OSDMigrationProgress } from './osd-migration-progress';

const cephData1: CephClusterKind = {
  status: {
    storage: {
      osd: {
        storeType: {
          bluestore: 3,
          'bluestore-rdr': 0,
        },
      },
      deviceClasses: [],
    },
    ceph: {
      fsid: '1020',
    },
    phase: 'starting',
  },
};

const cephData2: CephClusterKind = {
  status: {
    storage: {
      osd: {
        storeType: {
          bluestore: 7,
          'bluestore-rdr': 3,
        },
      },
      deviceClasses: [],
    },
    ceph: {
      fsid: '1020',
    },
    phase: 'starting',
  },
};

const cephData3: CephClusterKind = {
  status: {
    storage: {
      osd: {
        storeType: {
          bluestore: 0,
          'bluestore-rdr': 3,
        },
      },
      deviceClasses: [],
    },
    ceph: {
      fsid: '1020',
    },
    phase: 'starting',
  },
};

jest.mock('@openshift-console/dynamic-plugin-sdk-internal', () => ({
  ...jest.requireActual('@openshift-console/dynamic-plugin-sdk-internal'),
  HealthBody: ({ children }) => <div>{children}</div>,
  HealthItem: ({ title }) => <div>{title}</div>,
}));

jest.mock('@odf/shared/hooks', () => ({
  ...jest.requireActual('@odf/shared/hooks'),
  DOC_VERSION: '1.2',
}));

describe('OSDMigrationProgress', () => {
  test('does not render anything if data not loaded', () => {
    const cephData = cephData1;
    const dataLoaded = false;
    const dataLoadError = null;
    const { container } = render(
      <OSDMigrationProgress
        cephData={cephData}
        dataLoaded={dataLoaded}
        dataLoadError={dataLoadError}
      />
    );
    expect(container).toBeInTheDocument();
    expect(container).toBeEmptyDOMElement();
  });

  test('renders the correct message when migration status is in progress', () => {
    const ceph = cephData2;
    const dataLoaded = true;
    const dataLoadError = null;
    render(
      <OSDMigrationProgress
        cephData={ceph}
        dataLoaded={dataLoaded}
        dataLoadError={dataLoadError}
      />
    );

    expect(screen.getByText('Migrating cluster OSDs')).toBeInTheDocument();
  });

  test('renders the correct message when migration status is completed', () => {
    const ceph = cephData3;
    const dataLoaded = true;
    const dataLoadError = null;
    const { getByText } = render(
      <OSDMigrationProgress
        cephData={ceph}
        dataLoaded={dataLoaded}
        dataLoadError={dataLoadError}
      />
    );
    const message = getByText((content) => {
      const hasStartsWith = (text) => content.startsWith(text);
      return hasStartsWith('Cluster ready for Regional-DR setup');
    });

    expect(message).toBeInTheDocument();
    const documentationLink = screen.getByText('Setting up disaster recovery');
    expect(documentationLink).toBeInTheDocument();
    expect(documentationLink).toHaveAttribute(
      'href',
      expect.stringContaining(
        'configuring_openshift_data_foundation_disaster_recovery_for_openshift_workloads/index#apply-drpolicy-to-sample-application_manage-dr'
      )
    );
  });

  test('renders the correct message when migration status is failed', () => {
    const ceph = undefined;
    const dataLoaded = true;
    const dataLoadError = null;
    render(
      <OSDMigrationProgress
        cephData={ceph}
        dataLoaded={dataLoaded}
        dataLoadError={dataLoadError}
      />
    );

    expect(
      screen.getByText('Could not migrate cluster OSDs. Check logs')
    ).toBeInTheDocument();
  });
});
