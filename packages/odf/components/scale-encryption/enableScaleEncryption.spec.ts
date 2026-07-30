import {
  K8sResourceCommon,
  k8sCreate,
  k8sDelete,
} from '@openshift-console/dynamic-plugin-sdk';
import {
  enableScaleEncryption,
  ScaleEncryptionInput,
} from './enableScaleEncryption';

jest.mock('@openshift-console/dynamic-plugin-sdk', () => ({
  ...jest.requireActual('@openshift-console/dynamic-plugin-sdk'),
  k8sCreate: jest.fn(),
  k8sDelete: jest.fn(),
}));

const input: ScaleEncryptionInput = {
  certificate: 'certificate',
  client: 'scale-client',
  password: 'password',
  port: '9444',
  remoteRKM: 'rkm.example.com',
  server: 'keyserver.example.com',
  tenant: 'tenant',
  username: 'encryption-user',
};

const createdResource = ({ data }: { data: K8sResourceCommon }) =>
  Promise.resolve(data);

describe('enableScaleEncryption', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (k8sCreate as jest.Mock).mockImplementation(createdResource);
    (k8sDelete as jest.Mock).mockResolvedValue(undefined);
  });

  it('creates the encryption resources in dependency order', async () => {
    await enableScaleEncryption(input);

    expect(
      (k8sCreate as jest.Mock).mock.calls.map(([request]) => request.data)
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
          remoteRKM: 'rkm.example.com',
          secret: 'encryption-secret',
          server: 'keyserver.example.com',
          tenant: 'tenant',
        },
      }),
    ]);
  });

  it('removes created dependencies when setup fails', async () => {
    (k8sCreate as jest.Mock)
      .mockImplementationOnce(createdResource)
      .mockImplementationOnce(createdResource)
      .mockRejectedValueOnce(new Error('EncryptionConfig failed'));

    await expect(enableScaleEncryption(input)).rejects.toThrow(
      'EncryptionConfig failed'
    );

    expect(
      (k8sDelete as jest.Mock).mock.calls.map(
        ([request]) => request.resource.metadata.name
      )
    ).toEqual(['encryption-secret', 'encryption-config']);
  });
});
