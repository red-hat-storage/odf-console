import * as React from 'react';
import { EncryptionConfigKind } from '@odf/core/types/scale';
import { k8sCreate, k8sDelete } from '@openshift-console/dynamic-plugin-sdk';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EncryptionConfigModal from './EncryptionConfigModal';

jest.mock('@openshift-console/dynamic-plugin-sdk', () => ({
  ...jest.requireActual('@openshift-console/dynamic-plugin-sdk'),
  k8sCreate: jest.fn(),
  k8sDelete: jest.fn(),
}));

jest.mock('@odf/shared/useCustomTranslationHook', () => ({
  useCustomTranslation: () => ({ t: (key: string) => key }),
}));

const enableAndFillRequiredFields = async () => {
  await userEvent.click(
    screen.getByRole('checkbox', { name: 'Enable data encryption' })
  );
  await userEvent.type(
    screen.getByLabelText(/Username/, { selector: 'input' }),
    'encryption-user'
  );
  await userEvent.type(
    screen.getByLabelText(/Password/, { selector: 'input' }),
    'password'
  );
  await userEvent.type(
    screen.getByLabelText(/Client/, { selector: 'input' }),
    'scale-client'
  );
  await userEvent.type(
    screen.getByLabelText(/Remote RKM/, { selector: 'input' }),
    'rkm.example.com'
  );
  await userEvent.type(
    screen.getByLabelText(/Server information/, { selector: 'input' }),
    'keyserver.example.com'
  );
  await userEvent.type(
    screen.getByLabelText(/Tenant ID/, { selector: 'input' }),
    'tenant'
  );
};

const uploadCertificate = async () => {
  const fileInput = document.querySelector(
    'input[type="file"]'
  ) as HTMLInputElement;
  const certificate = new File(['certificate'], 'encryption-ca.pem', {
    type: 'application/x-pem-file',
  });

  await userEvent.upload(fileInput, certificate);
  expect(
    await screen.findByDisplayValue('encryption-ca.pem')
  ).toBeInTheDocument();
};

describe('EncryptionConfigModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (k8sCreate as jest.Mock).mockResolvedValue({});
    (k8sDelete as jest.Mock).mockResolvedValue({});
  });

  it('enables encryption with the full form and Scale defaults', async () => {
    const closeModal = jest.fn();
    render(
      <EncryptionConfigModal
        closeModal={closeModal}
        isOpen
        systemName="my-scale-system"
      />
    );

    const enable = screen.getByRole('checkbox', {
      name: 'Enable data encryption',
    });
    expect(enable).not.toBeChecked();
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();

    await enableAndFillRequiredFields();

    const save = screen.getByRole('button', { name: 'Save' });
    expect(save).toBeEnabled();
    await userEvent.click(save);

    await waitFor(() => expect(closeModal).toHaveBeenCalled());
    expect(k8sCreate).toHaveBeenCalledTimes(2);
    expect((k8sCreate as jest.Mock).mock.calls[0][0].data).toMatchObject({
      kind: 'Secret',
      metadata: { name: 'my-scale-system-encryption-secret' },
      stringData: {
        username: 'encryption-user',
        password: 'password',
      },
    });
    expect((k8sCreate as jest.Mock).mock.calls[1][0].data).toMatchObject({
      kind: 'EncryptionConfig',
      metadata: { name: 'my-scale-system-encryption-config' },
      spec: {
        server: 'keyserver.example.com',
        tenant: 'tenant',
        client: 'scale-client',
        remoteRKM: 'rkm.example.com',
        port: 9443,
        secret: 'my-scale-system-encryption-secret',
      },
    });
  });

  it('creates an optional certificate and explicit port in dependency order', async () => {
    const closeModal = jest.fn();
    render(
      <EncryptionConfigModal
        closeModal={closeModal}
        isOpen
        systemName="my-scale-system"
      />
    );

    await enableAndFillRequiredFields();
    await userEvent.type(
      screen.getByLabelText(/Port/, { selector: 'input' }),
      '10443'
    );
    await uploadCertificate();
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(closeModal).toHaveBeenCalled());
    expect(
      (k8sCreate as jest.Mock).mock.calls.map(([request]) => request.data.kind)
    ).toEqual(['Secret', 'ConfigMap', 'EncryptionConfig']);
    expect((k8sCreate as jest.Mock).mock.calls[1][0].data).toMatchObject({
      metadata: { name: 'my-scale-system-encryption-config' },
      data: { 'enc-ca.crt': 'Y2VydGlmaWNhdGU=' },
    });
    expect((k8sCreate as jest.Mock).mock.calls[2][0].data).toMatchObject({
      spec: {
        cacert: 'my-scale-system-encryption-config',
        port: 10443,
      },
    });
  });

  it('keeps the modal open when credentials creation fails', async () => {
    (k8sCreate as jest.Mock).mockRejectedValueOnce(
      new Error('Secret creation failed')
    );
    const closeModal = jest.fn();
    render(
      <EncryptionConfigModal
        closeModal={closeModal}
        isOpen
        systemName="my-scale-system"
      />
    );

    await enableAndFillRequiredFields();
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(
      await screen.findByText('Secret creation failed')
    ).toBeInTheDocument();
    expect(k8sDelete).not.toHaveBeenCalled();
    expect(closeModal).not.toHaveBeenCalled();
  });

  it('rolls back credentials when certificate creation fails', async () => {
    (k8sCreate as jest.Mock)
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error('ConfigMap creation failed'));
    const closeModal = jest.fn();
    render(
      <EncryptionConfigModal
        closeModal={closeModal}
        isOpen
        systemName="my-scale-system"
      />
    );

    await enableAndFillRequiredFields();
    await uploadCertificate();
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(
      await screen.findByText('ConfigMap creation failed')
    ).toBeInTheDocument();
    expect(k8sDelete).toHaveBeenCalledTimes(1);
    expect((k8sDelete as jest.Mock).mock.calls[0][0]).toMatchObject({
      model: { kind: 'Secret' },
      resource: {
        metadata: { name: 'my-scale-system-encryption-secret' },
      },
    });
    expect(closeModal).not.toHaveBeenCalled();
  });

  it('rolls back certificate then credentials when config creation fails', async () => {
    (k8sCreate as jest.Mock)
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error('EncryptionConfig creation failed'));
    const closeModal = jest.fn();
    render(
      <EncryptionConfigModal
        closeModal={closeModal}
        isOpen
        systemName="my-scale-system"
      />
    );

    await enableAndFillRequiredFields();
    await uploadCertificate();
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(
      await screen.findByText('EncryptionConfig creation failed')
    ).toBeInTheDocument();
    expect(
      (k8sDelete as jest.Mock).mock.calls.map(([request]) => [
        request.model.kind,
        request.resource.metadata.name,
      ])
    ).toEqual([
      ['ConfigMap', 'my-scale-system-encryption-config'],
      ['Secret', 'my-scale-system-encryption-secret'],
    ]);
    expect(closeModal).not.toHaveBeenCalled();
  });

  it('rolls back resources from a failed enablement attempt', async () => {
    (k8sCreate as jest.Mock)
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error('EncryptionConfig creation failed'));
    const closeModal = jest.fn();
    render(
      <EncryptionConfigModal
        closeModal={closeModal}
        isOpen
        systemName="my-scale-system"
      />
    );

    await enableAndFillRequiredFields();
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(
      await screen.findByText('EncryptionConfig creation failed')
    ).toBeInTheDocument();
    expect(closeModal).not.toHaveBeenCalled();
    expect(k8sDelete).toHaveBeenCalledTimes(1);
    expect((k8sDelete as jest.Mock).mock.calls[0][0]).toMatchObject({
      model: { kind: 'Secret' },
      resource: {
        metadata: { name: 'my-scale-system-encryption-secret' },
      },
    });
  });

  it('disables encryption without confirmation and deletes only UI-owned resources', async () => {
    const encryptionConfig: EncryptionConfigKind = {
      apiVersion: 'scale.spectrum.ibm.com/v1beta1',
      kind: 'EncryptionConfig',
      metadata: {
        name: 'my-scale-system-encryption-config',
        namespace: 'ibm-spectrum-scale',
      },
      spec: {
        server: 'keyserver.example.com',
        tenant: 'tenant',
        client: 'scale-client',
        remoteRKM: 'rkm.example.com',
        port: 9443,
        secret: 'my-scale-system-encryption-secret',
        cacert: 'my-scale-system-encryption-config',
      },
    };
    const closeModal = jest.fn();
    render(
      <EncryptionConfigModal
        closeModal={closeModal}
        encryptionConfig={encryptionConfig}
        isOpen
        systemName="my-scale-system"
      />
    );

    const enable = screen.getByRole('checkbox', {
      name: 'Enable data encryption',
    });
    expect(enable).toBeChecked();
    expect(
      screen.getByLabelText(/Username/, { selector: 'input' })
    ).toHaveValue('********');
    expect(
      screen.getByLabelText(/Server information/, { selector: 'input' })
    ).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();

    await userEvent.click(enable);

    expect(
      screen.queryByLabelText(/Username/, { selector: 'input' })
    ).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(closeModal).toHaveBeenCalled());
    expect(k8sDelete).toHaveBeenCalledTimes(3);
    expect(
      (k8sDelete as jest.Mock).mock.calls.map(([request]) => [
        request.model.kind,
        request.resource.metadata.name,
      ])
    ).toEqual([
      ['EncryptionConfig', 'my-scale-system-encryption-config'],
      ['Secret', 'my-scale-system-encryption-secret'],
      ['ConfigMap', 'my-scale-system-encryption-config'],
    ]);
    expect(screen.queryByText(/confirm/i)).not.toBeInTheDocument();
  });

  it('does not delete supporting resources that do not match UI-owned names', async () => {
    const encryptionConfig: EncryptionConfigKind = {
      apiVersion: 'scale.spectrum.ibm.com/v1beta1',
      kind: 'EncryptionConfig',
      metadata: { name: 'my-scale-system-encryption-config' },
      spec: {
        server: 'keyserver.example.com',
        tenant: 'tenant',
        client: 'scale-client',
        secret: 'administrator-managed-secret',
        cacert: 'administrator-managed-ca',
      },
    };
    const closeModal = jest.fn();
    render(
      <EncryptionConfigModal
        closeModal={closeModal}
        encryptionConfig={encryptionConfig}
        isOpen
        systemName="my-scale-system"
      />
    );

    await userEvent.click(
      screen.getByRole('checkbox', { name: 'Enable data encryption' })
    );
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(closeModal).toHaveBeenCalled());
    expect(k8sDelete).toHaveBeenCalledTimes(1);
    expect((k8sDelete as jest.Mock).mock.calls[0][0]).toMatchObject({
      model: { kind: 'EncryptionConfig' },
      resource: {
        metadata: { name: 'my-scale-system-encryption-config' },
      },
    });
  });

  it('reports supporting-resource cleanup failures without recreating encryption', async () => {
    const encryptionConfig: EncryptionConfigKind = {
      apiVersion: 'scale.spectrum.ibm.com/v1beta1',
      kind: 'EncryptionConfig',
      metadata: { name: 'my-scale-system-encryption-config' },
      spec: {
        server: 'keyserver.example.com',
        tenant: 'tenant',
        client: 'scale-client',
        secret: 'my-scale-system-encryption-secret',
        cacert: 'my-scale-system-encryption-config',
      },
    };
    (k8sDelete as jest.Mock).mockImplementation(({ model }) =>
      model.kind === 'Secret'
        ? Promise.reject(new Error('secret cleanup failed'))
        : Promise.resolve({})
    );
    const closeModal = jest.fn();
    render(
      <EncryptionConfigModal
        closeModal={closeModal}
        encryptionConfig={encryptionConfig}
        isOpen
        systemName="my-scale-system"
      />
    );

    await userEvent.click(
      screen.getByRole('checkbox', { name: 'Enable data encryption' })
    );
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(
      await screen.findByText('Encryption was disabled, but cleanup failed')
    ).toBeInTheDocument();
    expect(closeModal).not.toHaveBeenCalled();
    expect(k8sCreate).not.toHaveBeenCalled();
  });
});
