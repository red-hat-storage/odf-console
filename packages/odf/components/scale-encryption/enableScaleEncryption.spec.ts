import { createOrUpdate } from '@odf/shared/utils/k8s';
import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk';
import {
  enableScaleEncryption,
  ScaleEncryptionInput,
} from './enableScaleEncryption';

jest.mock('@odf/shared/utils/k8s', () => ({ createOrUpdate: jest.fn() }));

const input: ScaleEncryptionInput = {
  certificate: 'certificate',
  client: 'scale-client',
  password: 'password',
  port: '9444',
  remoteRKM: ' remote_rkm_1 ',
  server: ' keyserver.example.com ',
  tenant: ' tenant ',
  username: ' encryption-user ',
};

const upsertResource = ({
  mutate,
}: {
  mutate: (resource: K8sResourceCommon | null) => K8sResourceCommon;
}) => Promise.resolve(mutate(null));

describe('enableScaleEncryption', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (createOrUpdate as jest.Mock).mockImplementation(upsertResource);
  });

  it('creates the encryption resources in dependency order', async () => {
    await enableScaleEncryption(input);

    expect(
      (createOrUpdate as jest.Mock).mock.calls.map(([request]) =>
        request.mutate(null)
      )
    ).toEqual([
      expect.objectContaining({
        kind: 'ConfigMap',
        data: { 'enc-ca.crt': 'certificate' },
      }),
      expect.objectContaining({
        kind: 'Secret',
        stringData: { password: 'password', username: 'encryption-user' },
      }),
      expect.objectContaining({
        kind: 'EncryptionConfig',
        spec: {
          cacert: 'encryption-config',
          client: 'scale-client',
          port: 9444,
          remoteRKM: 'remote_rkm_1',
          secret: 'encryption-secret',
          server: 'keyserver.example.com',
          tenant: 'tenant',
        },
      }),
    ]);
  });

  it('omits the certificate ConfigMap and cacert when no certificate is provided', async () => {
    await enableScaleEncryption({ ...input, certificate: '  ' });

    expect(
      (createOrUpdate as jest.Mock).mock.calls.map(([request]) =>
        request.mutate(null)
      )
    ).toEqual([
      expect.objectContaining({ kind: 'Secret' }),
      expect.objectContaining({
        kind: 'EncryptionConfig',
        spec: expect.not.objectContaining({ cacert: expect.anything() }),
      }),
    ]);
  });
});
