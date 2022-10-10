export const compressionPool = {
  apiVersion: 'ceph.rook.io/v1',
  kind: 'CephBlockPool',
  metadata: { name: 'plasma-reactor-pool', namespace: 'openshift-storage' },
  spec: {
    compressionMode: 'aggressive',
    deviceClass: 'ssd',
    failureDomain: 'zone',
    parameters: { compression_mode: 'aggressive' },
    replicated: { size: 2 },
  },
};

export const compressionStorageClass = {
  kind: 'StorageClass',
  apiVersion: 'storage.k8s.io/v1',
  metadata: {
    name: 'compression-class',
    namespace: 'openshift-storage',
  },
  provisioner: 'openshift-storage.rbd.csi.ceph.com',
  parameters: {
    'csi.storage.k8s.io/fstype': 'ext4',
    'csi.storage.k8s.io/provisioner-secret-namespace': 'openshift-storage',
    'csi.storage.k8s.io/provisioner-secret-name': 'rook-csi-rbd-provisioner',
    'csi.storage.k8s.io/node-stage-secret-name': 'rook-csi-rbd-node',
    'csi.storage.k8s.io/controller-expand-secret-name':
      'rook-csi-rbd-provisioner',
    imageFormat: '2',
    clusterID: 'openshift-storage',
    imageFeatures: 'layering,deep-flatten,exclusive-lock,object-map,fast-diff',
    'csi.storage.k8s.io/controller-expand-secret-namespace':
      'openshift-storage',
    pool: 'plasma-reactor-pool',
    'csi.storage.k8s.io/node-stage-secret-namespace': 'openshift-storage',
  },
  reclaimPolicy: 'Delete',
  allowVolumeExpansion: true,
  volumeBindingMode: 'Immediate',
};

export const fioPVC = {
  kind: 'PersistentVolumeClaim',
  apiVersion: 'v1',
  metadata: {
    name: 'fio-claim',
    namespace: 'openshift-storage',
  },
  spec: {
    storageClassName: 'compression-class',
    accessModes: ['ReadWriteOnce'],
    volumeMode: 'Filesystem',
    resources: {
      requests: {
        storage: '5Gi',
      },
    },
  },
};

export const fioConfig = `kind: ConfigMap 
apiVersion: v1 
metadata:
  name: fio-job-config
  namespace: openshift-storage
data:
  fio.job: |-
    [global]
    ioengine=psync
    direct=1
    buffered=0
    size=1G
    iodepth=1000
    numjobs=2
    group_reporting
    refill_buffers
    rwmixread=80
    norandommap
    randrepeat=0
    percentage_random=0
    bs=512K
    buffer_compress_percentage=50
    rw=read
    [testjob]
`;

export const fioJob = {
  apiVersion: 'batch/v1',
  kind: 'Job',
  metadata: {
    name: 'fio',
    namespace: 'openshift-storage',
    labels: {
      app: 'fio',
    },
  },
  spec: {
    template: {
      spec: {
        containers: [
          {
            name: 'fio',
            image: 'quay.io/badhikar/fio:latest',
            command: ['sh'],
            args: [
              '-c',
              // eslint-disable-next-line no-template-curly-in-string
              'echo ${HOSTNAME} && mkdir -p /scratch/${HOSTNAME} && fio /configs/fio.job --eta=never --directory=/scratch/${HOSTNAME}',
            ],
            volumeMounts: [
              {
                name: 'fio-config-vol',
                mountPath: '/configs',
              },
              {
                name: 'fio-data',
                mountPath: '/scratch',
              },
            ],
            imagePullPolicy: 'Always',
          },
        ],
        restartPolicy: 'OnFailure',
        volumes: [
          {
            name: 'fio-config-vol',
            configMap: {
              name: 'fio-job-config',
            },
          },
          {
            name: 'fio-data',
            persistentVolumeClaim: {
              claimName: 'fio-claim',
            },
          },
        ],
      },
    },
  },
};
