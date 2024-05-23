/**
 * This hooks is for ODF Client Mode use case only.
 * ODF client mode doesn't deploy ODF StorageCluster hence we will use no storage class prefix. We will rely on provisioners
 *
 */
const getClientFallback = (storageClusterName: string) => {
  if (storageClusterName) {
    return storageClusterName;
  }
  return '';
};

export default getClientFallback;
