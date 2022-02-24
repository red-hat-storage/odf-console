export const getPVJSON = (id: number, nodeName: string, scName: string) => {
  return {
    kind: 'PersistentVolume',
    apiVersion: 'v1',
    metadata: { name: `test-pv-${id}` },
    spec: {
      capacity: {
        storage: '10Mi',
      },
      local: { path: `/mnt/local-storage/test-${id}/` },
      accessModes: ['ReadWriteOnce'],
      persistentVolumeReclaimPolicy: 'Delete',
      storageClassName: scName,
      nodeAffinity: {
        required: {
          nodeSelectorTerms: [
            {
              matchExpressions: [
                {
                  key: 'kubernetes.io/hostname',
                  operator: 'In',
                  values: [nodeName],
                },
              ],
            },
          ],
        },
      },
    },
  };
};
