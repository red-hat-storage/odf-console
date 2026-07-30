import { IBM_SCALE_NAMESPACE } from '@odf/core/constants';
import { EncryptionConfigKind } from '@odf/core/types/scale';
import {
  ConfigMapKind,
  ConfigMapModel,
  SecretKind,
  SecretModel,
} from '@odf/shared';
import { EncryptionConfigModel } from '@odf/shared/models/scale';
import { k8sCreate, k8sDelete } from '@openshift-console/dynamic-plugin-sdk';
import {
  createConfigMapPayload,
  createUserDetailsSecretPayload,
} from '../create-storage-system/external-systems/common/payload';

export const ENCRYPTION_CONFIG_NAME = 'encryption-config';

export type ScaleEncryptionInput = {
  certificate: string;
  client: string;
  password: string;
  port: string;
  remoteRKM: string;
  server: string;
  tenant: string;
  username: string;
};

export const enableScaleEncryption = async (
  input: ScaleEncryptionInput
): Promise<void> => {
  const configName = ENCRYPTION_CONFIG_NAME;
  const secretName = 'encryption-secret';
  const createConfigMap = createConfigMapPayload(configName, {
    'enc-ca.crt': input.certificate,
  });
  const createSecret = createUserDetailsSecretPayload(
    secretName,
    input.username,
    input.password
  );
  const encryptionConfig: EncryptionConfigKind = {
    apiVersion: 'scale.spectrum.ibm.com/v1beta1',
    kind: 'EncryptionConfig',
    metadata: { name: configName, namespace: IBM_SCALE_NAMESPACE },
    spec: {
      cacert: configName,
      port: Number(input.port),
      remoteRKM: input.remoteRKM,
      server: input.server,
      tenant: input.tenant,
      client: input.client,
      secret: secretName,
    },
  };

  let createdConfigMap: ConfigMapKind;
  let createdSecret: SecretKind;

  try {
    createdConfigMap = await createConfigMap();
    createdSecret = await createSecret();
    await k8sCreate({ model: EncryptionConfigModel, data: encryptionConfig });
  } catch (cause) {
    if (createdSecret) {
      await k8sDelete({
        model: SecretModel,
        resource: createdSecret,
        requestInit: null,
        json: null,
      }).catch(() => undefined);
    }
    if (createdConfigMap) {
      await k8sDelete({
        model: ConfigMapModel,
        resource: createdConfigMap,
        requestInit: null,
        json: null,
      }).catch(() => undefined);
    }
    throw cause;
  }
};
