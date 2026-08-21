import { IBM_SCALE_NAMESPACE } from '@odf/core/constants';
import { EncryptionConfigKind } from '@odf/core/types/scale';
import { EncryptionConfigModel } from '@odf/shared/models/scale';
import { createOrUpdate } from '@odf/shared/utils/k8s';
import {
  createConfigMapPayload,
  createUserDetailsSecretPayload,
} from '../create-storage-system/external-systems/common/payload';

export const ENCRYPTION_CONFIG_NAME = 'encryption-config';
export const ENCRYPTION_SECRET_NAME = 'encryption-secret';

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
  const secretName = ENCRYPTION_SECRET_NAME;
  const certificate = input.certificate.trim();

  const encryptionConfig: EncryptionConfigKind = {
    apiVersion: 'scale.spectrum.ibm.com/v1beta1',
    kind: 'EncryptionConfig',
    metadata: { name: configName, namespace: IBM_SCALE_NAMESPACE },
    spec: {
      ...(certificate && { cacert: configName }),
      port: Number(input.port),
      remoteRKM: input.remoteRKM.trim(),
      server: input.server.trim(),
      tenant: input.tenant.trim(),
      client: input.client.trim(),
      secret: secretName,
    },
  };

  if (certificate) {
    await createConfigMapPayload(configName, { 'enc-ca.crt': certificate })();
  }
  await createUserDetailsSecretPayload(
    secretName,
    input.username.trim(),
    input.password
  )();
  await createOrUpdate<EncryptionConfigKind>({
    model: EncryptionConfigModel,
    name: configName,
    namespace: IBM_SCALE_NAMESPACE,
    mutate: () => encryptionConfig,
  });
};
