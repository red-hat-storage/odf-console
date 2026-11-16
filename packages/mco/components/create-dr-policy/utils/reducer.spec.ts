import { ReplicationType, StorageVendorId } from '@odf/mco/constants';
import { ManagedClusterInfoType } from '@odf/mco/types';
import {
  drPolicyInitialState,
  drPolicyReducer,
  DRPolicyActionType,
  DRPolicyState,
} from './reducer';

const cluster = (name: string, cephFSID: string): ManagedClusterInfoType => ({
  metadata: { name },
  id: name,
  isManagedClusterAvailable: true,
  odfInfo: {
    storageClusterInfo: {
      storageClusterNamespacedName: 'ocs-storagecluster/openshift-storage',
      cephFSID,
      deploymentType: 'internal',
    },
    odfVersion: '4.20.0',
    isValidODFVersion: true,
    storageClusterCount: 1,
  },
});

const withClusters = (fsid1: string, fsid2: string): DRPolicyState =>
  drPolicyReducer(drPolicyInitialState, {
    type: DRPolicyActionType.SET_SELECTED_CLUSTERS,
    payload: [cluster('east-1', fsid1), cluster('west-1', fsid2)],
  });

const selectVendor = (state: DRPolicyState, payload) =>
  drPolicyReducer(state, {
    type: DRPolicyActionType.SET_STORAGE_VENDOR,
    payload,
  });

describe('drPolicyReducer provider choice', () => {
  it('sets the name and Sync for IBM Storage Scale', () => {
    const state = selectVendor(
      withClusters('a', 'b'),
      StorageVendorId.IbmStorageScale
    );
    expect(state.policy.policyName).toBe('ibm-storage-scale-east-1-west-1');
    expect(state.policy.replicationType).toBe(ReplicationType.SYNC);
  });

  it('derives the Data Foundation type from the Ceph FSIDs', () => {
    expect(
      selectVendor(withClusters('a', 'b'), StorageVendorId.DataFoundation)
        .policy.replicationType
    ).toBe(ReplicationType.ASYNC);
    expect(
      selectVendor(withClusters('a', 'a'), StorageVendorId.DataFoundation)
        .policy.replicationType
    ).toBe(ReplicationType.SYNC);
  });

  it('keeps a user name but drops a generated one on a provider change', () => {
    const named = drPolicyReducer(
      selectVendor(withClusters('a', 'b'), StorageVendorId.Generic),
      { type: DRPolicyActionType.SET_POLICY_NAME, payload: 'my-policy' }
    );
    expect(
      selectVendor(named, StorageVendorId.DataFoundation).policy.policyName
    ).toBe('my-policy');

    const scale = selectVendor(named, StorageVendorId.IbmStorageScale);
    const generic = selectVendor(scale, StorageVendorId.Generic);
    expect(generic.policy.policyName).toBe('');
    expect(generic.policy.replicationType).toBe(ReplicationType.ASYNC);
  });

  it('clears the provider defaults when the clusters change', () => {
    const scale = selectVendor(
      withClusters('a', 'b'),
      StorageVendorId.IbmStorageScale
    );
    const reselected = drPolicyReducer(scale, {
      type: DRPolicyActionType.SET_SELECTED_CLUSTERS,
      payload: [cluster('east-2', 'a'), cluster('west-2', 'b')],
    });
    expect(reselected.provider.storageVendor).toBeNull();
    expect(reselected.policy.policyName).toBe('');
    expect(reselected.policy.replicationType).toBeNull();
  });

  it('moves the S3 details onto the new pair by position', () => {
    const filled = drPolicyReducer(withClusters('a', 'b'), {
      type: DRPolicyActionType.SET_CLUSTER1_S3_DETAILS,
      payload: {
        ...drPolicyInitialState.configure.cluster1S3Details,
        clusterName: 'east-1',
        bucketName: 'bucket-east',
      },
    });
    const reselected = drPolicyReducer(filled, {
      type: DRPolicyActionType.SET_SELECTED_CLUSTERS,
      payload: [cluster('east-2', 'a'), cluster('west-2', 'b')],
    });
    // The form shows these under the new clusters, so validation must too.
    expect(reselected.configure.cluster1S3Details).toEqual(
      expect.objectContaining({
        clusterName: 'east-2',
        bucketName: 'bucket-east',
      })
    );
    expect(reselected.configure.cluster2S3Details.clusterName).toBe('west-2');
  });
});
