/**
 * This is for ODF Client Mode use case only.
 * ODF client mode doesn't deploy ODF StorageCluster hence we will use no storage class prefix. We will rely on provisioners.
 * For scenarios where Client & Provider are on same OCP, client-console will be disabled.
 */
const getClientFallback = (storageClusterName: string) => {
  if (storageClusterName) {
    return storageClusterName;
  }
  return '';
};

export default getClientFallback;
