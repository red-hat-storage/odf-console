import { IBM_SCALE_NAMESPACE } from '@odf/core/constants';
import {
  ClusterKind,
  EncryptionConfigKind,
  FilesystemKind,
  RemoteClusterKind,
} from '@odf/core/types/scale';
import {
  ConfigMapKind,
  ConfigMapModel,
  NodeModel,
  SecretKind,
  SecretModel,
} from '@odf/shared';
import {
  ClusterModel,
  EncryptionConfigModel,
  FileSystemModel,
  RemoteClusterModel,
} from '@odf/shared/models/scale';
import { k8sPatchByName } from '@odf/shared/utils';
import {
  k8sCreate,
  K8sKind,
  Patch,
} from '@openshift-console/dynamic-plugin-sdk';
import { WizardNodeState } from '../../reducer';

export const labelNodes = (nodes: WizardNodeState[]) => {
  const labelPath = `/metadata/labels/scale.spectrum.ibm.com~1daemon-selector`;
  const patch: Patch[] = [
    {
      op: 'add',
      path: labelPath,
      value: '',
    },
  ];
  const requests: Promise<K8sKind>[] = [];
  nodes.forEach((node) => {
    if (!node.labels?.['scale.spectrum.ibm.com/daemon-selector/'])
      requests.push(k8sPatchByName(NodeModel, node.name, null, patch));
  });
  return () => Promise.all(requests);
};

export const createScaleLocalClusterPayload = () => {
  const payload: ClusterKind = {
    apiVersion: 'scale.spectrum.ibm.com/v1beta1',
    kind: 'Cluster',
    metadata: {
      name: 'ibm-spectrum-scale',
    },
    spec: {
      daemon: {
        nodeSelector: {
          'scale.spectrum.ibm.com/daemon-selector': '',
        },
        roles: [],
        clusterProfile: {
          controlSetxattrImmutableSELinux: 'yes',
          enforceFilesetQuotaOnRoot: 'yes',
          ignorePrefetchLUNCount: 'yes',
          initPrefetchBuffers: '128',
          maxblocksize: '16M',
          prefetchPct: '25',
          prefetchTimeout: '30',
        },
      },
      license: {
        accept: true,
        license: 'data-access',
      },
    },
  };
  return () => k8sCreate({ model: ClusterModel, data: payload });
};

export const createUserDetailsSecretPayload = (
  name: string,
  username: string,
  password: string
) => {
  const mySecret: SecretKind = {
    apiVersion: 'v1',
    kind: 'Secret',
    metadata: {
      name: name,
      namespace: IBM_SCALE_NAMESPACE,
    },
    type: 'Opaque',
    stringData: {
      username,
      password,
    },
  };
  return () => k8sCreate({ model: SecretModel, data: mySecret });
};

export const createConfigMapPayload = (
  name: string,
  data: Record<string, string>
) => {
  const myConfigMap: ConfigMapKind = {
    apiVersion: 'v1',
    kind: 'ConfigMap',
    metadata: {
      name,
      namespace: IBM_SCALE_NAMESPACE,
    },
    data,
  };
  return () => k8sCreate({ model: ConfigMapModel, data: myConfigMap });
};

export const createScaleRemoteClusterPayload = (
  name: string,
  hostNames: string[],
  port: string,
  caCert?: string
) => {
  const payload: RemoteClusterKind = {
    apiVersion: 'scale.spectrum.ibm.com/v1beta1',
    kind: 'RemoteCluster',
    metadata: {
      name: name,
      namespace: IBM_SCALE_NAMESPACE,
    },
    spec: {
      gui: {
        port: Number(port),
        ...(caCert && { cacert: caCert }),
        secretName: '',
        insecureSkipVerify: !!caCert ? false : true,
        hosts: hostNames,
      },
    },
  };
  return () => k8sCreate({ model: RemoteClusterModel, data: payload });
};

export const createScaleCaCertSecretPayload = (
  name: string,
  caCert: string
) => {
  const payload: SecretKind = {
    apiVersion: 'v1',
    kind: 'Secret',
    metadata: {
      name: name,
      namespace: IBM_SCALE_NAMESPACE,
    },
    data: {
      'ca.crt': caCert,
    },
  };
  return () => k8sCreate({ model: SecretModel, data: payload });
};

export const createScaleFileSystemPayload = (name: string, hosts: string[]) => {
  const payload: RemoteClusterKind = {
    apiVersion: 'scale.spectrum.ibm.com/v1beta1',
    kind: 'RemoteCluster',
    metadata: {
      name: name,
      namespace: IBM_SCALE_NAMESPACE,
    },
    spec: {
      gui: {
        hosts: hosts,
        secretName: '',
        cacert: '',
      },
    },
  };
  return payload;
};

export const createFileSystem = (name: string) => {
  const payload: FilesystemKind = {
    apiVersion: 'scale.spectrum.ibm.com/v1beta1',
    kind: 'Filesystem',
    metadata: {
      name: name,
      namespace: IBM_SCALE_NAMESPACE,
    },
    spec: {
      seLinuxOptions: {
        level: 's0',
        role: 'object_r',
        type: 'container_file_t',
        user: 'system_u',
      },
    },
  };
  return () => k8sCreate({ model: FileSystemModel, data: payload });
};

export const createEncryptionConfigPayload = (
  name: string,
  server: string,
  tenant: string,
  client: string,
  secret: string,
  configMapName: string
) => {
  const payload: EncryptionConfigKind = {
    apiVersion: 'scale.spectrum.ibm.com/v1beta1',
    kind: 'EncryptionConfig',
    metadata: {
      name: name,
      namespace: IBM_SCALE_NAMESPACE,
    },
    spec: {
      ...(configMapName && { cacert: configMapName }),
      server,
      tenant,
      client,
      secret,
    },
  };
  return () => k8sCreate({ model: EncryptionConfigModel, data: payload });
};
