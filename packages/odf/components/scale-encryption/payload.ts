import { IBM_SCALE_NAMESPACE } from '@odf/core/constants';
import { EncryptionConfigKind } from '@odf/core/types/scale';
import {
  ConfigMapKind,
  ConfigMapModel,
  SecretKind,
  SecretModel,
} from '@odf/shared';
import { EncryptionConfigModel } from '@odf/shared/models/scale';
import { k8sCreate } from '@openshift-console/dynamic-plugin-sdk';
import { EncryptionFormData } from './useEncryptionFormValidation';

export const createEncryptionSecretPayload = (
  name: string,
  username: string,
  password: string
) => {
  const payload: SecretKind = {
    apiVersion: 'v1',
    kind: SecretModel.kind,
    metadata: { name, namespace: IBM_SCALE_NAMESPACE },
    type: 'Opaque',
    stringData: { username, password },
  };
  return () => k8sCreate({ model: SecretModel, data: payload });
};

export const createEncryptionCertificatePayload = (
  name: string,
  certificate: string
) => {
  const payload: ConfigMapKind = {
    apiVersion: 'v1',
    kind: ConfigMapModel.kind,
    metadata: { name, namespace: IBM_SCALE_NAMESPACE },
    data: { 'enc-ca.crt': certificate },
  };
  return () => k8sCreate({ model: ConfigMapModel, data: payload });
};

export const createEncryptionConfigPayload = (
  name: string,
  values: EncryptionFormData,
  secretName: string,
  certificateConfigMapName?: string
) => {
  const payload: EncryptionConfigKind = {
    apiVersion: 'scale.spectrum.ibm.com/v1beta1',
    kind: 'EncryptionConfig',
    metadata: { name, namespace: IBM_SCALE_NAMESPACE },
    spec: {
      ...(certificateConfigMapName && { cacert: certificateConfigMapName }),
      server: values.serverInformation,
      tenant: values.tenantId,
      client: values.client,
      port: Number(values.encryptionPort || 9443),
      ...(values.remoteRKM && { remoteRKM: values.remoteRKM }),
      secret: secretName,
    },
  };
  return () => k8sCreate({ model: EncryptionConfigModel, data: payload });
};
