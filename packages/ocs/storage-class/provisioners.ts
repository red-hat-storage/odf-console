import { CEPH_SC_BLOCK_POOL_IS_EC } from '@odf/ocs/constants';
import { ProvisionerDetails } from '@openshift-console/dynamic-plugin-sdk';

type Parameters = ProvisionerDetails['parameters'];

export const isPvEncryptionVisible = () =>
  sessionStorage.getItem(CEPH_SC_BLOCK_POOL_IS_EC) !== 'true';

export const isEncryptionKMSIdVisibleOrRequired = (params: Parameters) =>
  params?.encrypted?.value === 'true' && isPvEncryptionVisible();
