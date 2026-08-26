import { IBM_SCALE_NAMESPACE } from '@odf/core/constants';
import { FileSystemKind, RemoteClusterKind } from '@odf/core/types/scale';
import { SecretKind, SecretModel } from '@odf/shared';
import { FileSystemModel, RemoteClusterModel } from '@odf/shared/models/scale';
import { k8sCreate } from '@openshift-console/dynamic-plugin-sdk';

export const createScaleRemoteClusterPayload = (
  name: string,
  hostNames: string[],
  port: string,
  secretName: string,
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
        secretName,
        insecureSkipVerify: !!caCert ? false : true,
        hosts: hostNames,
        passwordRotation: {},
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

export const createFileSystem = (
  remoteClusterName: string,
  remoteFileSystemName: string
) => {
  const payload: FileSystemKind = {
    apiVersion: 'scale.spectrum.ibm.com/v1beta1',
    kind: 'Filesystem',
    metadata: {
      name: `${remoteClusterName}-${remoteFileSystemName}`,
      namespace: IBM_SCALE_NAMESPACE,
    },
    spec: {
      remote: {
        cluster: remoteClusterName,
        fs: remoteFileSystemName,
      },
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
