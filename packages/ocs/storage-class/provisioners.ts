import { CEPH_RBD_EC_METADATA_POOL_SESSION_STORAGE } from '@odf/ocs/constants';
import { ProvisionerDetails } from '@openshift-console/dynamic-plugin-sdk';

type Parameters = ProvisionerDetails['parameters'];

export const isEncryptionVisible = () =>
  !sessionStorage.getItem(CEPH_RBD_EC_METADATA_POOL_SESSION_STORAGE);

export const isEncryptionKMSIdVisibleOrRequired = (params: Parameters) =>
  params?.encrypted?.value === 'true' && isEncryptionVisible();
