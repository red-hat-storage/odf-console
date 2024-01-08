import * as React from 'react';
import { DISASTER_RECOVERY_TARGET_ANNOTATION_WO_SLASH } from '@odf/core/constants';
import { OCSStorageClusterModel } from '@odf/shared/models';
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
    const button = screen.getByText('Optimise cluster');
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
    const button = screen.queryByText('Optimise cluster');
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
    const button = screen.queryByText('Optimise cluster');
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
    expect(getByText('Optimise cluster for Regional-DR?')).toBeInTheDocument();

    // Check the body text
    expect(
      getByText(
        'Configure the cluster for a Regional-DR setup by migrating OSDs. ' +
          'Migration may take some time depending on several factors. ' +
          'To learn more about OSDs migration best practices and its consequences refer to the documentation.'
      )
    ).toBeInTheDocument();
  });

  test('calls closeModal when the "Close" button is clicked', () => {
    const closeModalMock = jest.fn();
    const { getByText } = render(
      <OSDMigrationModal
        isOpen={true}
        extraProps={ocsData}
        closeModal={closeModalMock}
      />
    );

    fireEvent.click(getByText('Close'));
    expect(closeModalMock).toHaveBeenCalled();
  });

  test('Optimise button calls k8sPatch and closeModal on success', async () => {
    const closeModal = jest.fn();
    render(
      <OSDMigrationModal isOpen={true} extraProps={{ ocsData, closeModal }} />
    );
    await fireEvent.click(screen.getByText('Optimise'));
    await waitFor(() => {
      expect(k8sPatch).toHaveBeenCalledWith({
        model: OCSStorageClusterModel,
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
