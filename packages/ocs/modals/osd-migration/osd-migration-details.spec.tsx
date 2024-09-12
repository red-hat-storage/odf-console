import * as React from 'react';
import { DISASTER_RECOVERY_TARGET_ANNOTATION_WO_SLASH } from '@odf/core/constants';
import { StorageClusterModel } from '@odf/shared/models';
import { CephClusterKind } from '@odf/shared/src/types/storage';
import { k8sPatch } from '@openshift-console/dynamic-plugin-sdk';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { getOSDMigrationStatus } from '../../utils/osd-migration';
import { OSDMigrationDetails } from './osd-migration-details';
import OSDMigrationModal from './osd-migration-modal';

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

const cephData4 = null;
const ocsData = null;

jest.mock('@openshift-console/dynamic-plugin-sdk-internal', () => ({
  ...jest.requireActual('@openshift-console/dynamic-plugin-sdk-internal'),
  HealthBody: ({ children }) => <div>{children}</div>,
  HealthItem: ({ title }) => <div>{title}</div>,
}));

jest.mock('@openshift-console/dynamic-plugin-sdk', () => ({
  ...jest.requireActual('@openshift-console/dynamic-plugin-sdk'),
  k8sPatch: jest.fn().mockResolvedValue({}),
}));

jest.mock(
  '@openshift-console/dynamic-plugin-sdk/lib/app/components/status/icons',
  () => ({
    GreenCheckCircleIcon: () => <div>MockedGreenCheckCircleIcon</div>,
  })
);

describe('OSDMigrationDetails', () => {
  test('renders OSD migration status and button', () => {
    render(
      <OSDMigrationDetails
        cephData={cephData1}
        ocsData={ocsData}
        loaded={true}
        loadError={null}
      />
    );

    expect(screen.getByText('Pending')).toBeInTheDocument();
    const button = screen.getByText('(Prepare cluster for DR setup)');
    expect(button).toBeEnabled();
  });

  test('renders OSD migration status as in progress', () => {
    render(
      <OSDMigrationDetails
        cephData={cephData2}
        ocsData={ocsData}
        loaded={true}
        loadError={null}
      />
    );
    expect(screen.getByText('In Progress')).toBeInTheDocument();
    // Ensure that the button is not present
    const button = screen.queryByText('(Prepare cluster for DR setup)');
    expect(button).not.toBeInTheDocument();
  });

  test('renders OSD migration status as completed', () => {
    render(
      <OSDMigrationDetails
        cephData={cephData3}
        ocsData={ocsData}
        loaded={true}
        loadError={null}
      />
    );

    expect(screen.getByText('Completed')).toBeInTheDocument();
    const button = screen.queryByText('(Prepare cluster for DR setup)');
    expect(button).not.toBeInTheDocument();
  });

  test('getOSDMigrationStatus returns correct status for different ceph inputs', () => {
    const actualStatus1 = getOSDMigrationStatus(cephData1);
    const actualStatus2 = getOSDMigrationStatus(cephData2);
    const actualStatus3 = getOSDMigrationStatus(cephData3);
    const actualStatus4 = getOSDMigrationStatus(cephData4);

    expect(actualStatus1).toBe('Pending');
    expect(actualStatus2).toBe('In Progress');
    expect(actualStatus3).toBe('Completed');
    expect(actualStatus4).toBe('Failed');
  });

  test('renders correct title and text', () => {
    const { getByText } = render(
      <OSDMigrationModal
        isOpen={true}
        extraProps={ocsData}
        closeModal={() => jest.fn()}
      />
    );

    // Check the title
    expect(
      getByText('Prepare the cluster for Regional DR setup')
    ).toBeInTheDocument();

    // Check the body text
    expect(
      getByText(
        'To prepare the cluster for Regional DR setup, you must migrate the OSDs. ' +
          'Migrating OSDs may take some time to complete based on your cluster.'
      )
    ).toBeInTheDocument();
  });

  test('calls closeModal when the "Cancel" button is clicked', () => {
    const closeModalMock = jest.fn();
    const { getByText } = render(
      <OSDMigrationModal
        isOpen={true}
        extraProps={ocsData}
        closeModal={closeModalMock}
      />
    );

    fireEvent.click(getByText('Cancel'));
    expect(closeModalMock).toHaveBeenCalled();
  });

  test('Optimise button calls k8sPatch and closeModal on success', async () => {
    const closeModal = jest.fn();
    render(
      <OSDMigrationModal isOpen={true} extraProps={{ ocsData, closeModal }} />
    );
    await fireEvent.click(screen.getByText('Yes, migrate OSDs'));
    await waitFor(() => {
      expect(k8sPatch).toHaveBeenCalledWith({
        model: StorageClusterModel,
        resource: {
          metadata: {
            name: undefined,
            namespace: undefined,
          },
        },
        data: [
          {
            op: 'add',
            path: `/metadata/annotations/${DISASTER_RECOVERY_TARGET_ANNOTATION_WO_SLASH}`,
            value: 'true',
          },
        ],
      });
    });
  });
});
