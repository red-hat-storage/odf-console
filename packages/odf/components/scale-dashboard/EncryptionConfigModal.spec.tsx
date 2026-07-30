import * as React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { enableScaleEncryption } from '../scale-encryption/enableScaleEncryption';
import EncryptionConfigModal from './EncryptionConfigModal';

jest.mock('../scale-encryption/enableScaleEncryption', () => ({
  ...jest.requireActual('../scale-encryption/enableScaleEncryption'),
  enableScaleEncryption: jest.fn(),
}));

jest.mock('@odf/shared/useCustomTranslationHook', () => ({
  useCustomTranslation: () => ({ t: (key: string) => key }),
}));

const renderModal = () => {
  const closeModal = jest.fn();
  render(<EncryptionConfigModal closeModal={closeModal} isOpen />);
  return { closeModal };
};

const fillAndSubmit = async () => {
  await userEvent.click(screen.getByLabelText('Enable data encryption'));
  await userEvent.type(
    screen.getByLabelText(/Username/, { selector: 'input' }),
    'encryption-user'
  );
  await userEvent.type(
    screen.getByLabelText(/Password/, { selector: 'input' }),
    'password'
  );
  await userEvent.type(
    screen.getByLabelText(/Port/, { selector: 'input' }),
    '9444'
  );
  await userEvent.type(
    screen.getByLabelText(/Client/, { selector: 'input' }),
    'scale-client'
  );
  await userEvent.type(
    screen.getByLabelText(/Remote RKM/, { selector: 'input' }),
    'rkm.example.com'
  );
  await userEvent.upload(
    document.querySelector('input[type="file"]') as HTMLInputElement,
    new File(['certificate'], 'ca.crt')
  );
  await userEvent.type(
    screen.getByLabelText(/Server information/, { selector: 'input' }),
    'keyserver.example.com'
  );
  await userEvent.type(
    screen.getByLabelText(/Tenant ID/, { selector: 'input' }),
    'tenant'
  );
  const saveButton = screen.getByRole('button', { name: 'Save' });
  await waitFor(() => expect(saveButton).toBeEnabled());
  await userEvent.click(saveButton);
};

describe('EncryptionConfigModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (enableScaleEncryption as jest.Mock).mockResolvedValue(undefined);
  });

  it('submits the encryption configuration', async () => {
    const { closeModal } = renderModal();

    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    await fillAndSubmit();

    await waitFor(() => expect(closeModal).toHaveBeenCalled());
    expect(enableScaleEncryption).toHaveBeenCalledWith({
      certificate: 'Y2VydGlmaWNhdGU=',
      client: 'scale-client',
      password: 'password',
      port: '9444',
      remoteRKM: 'rkm.example.com',
      server: 'keyserver.example.com',
      tenant: 'tenant',
      username: 'encryption-user',
    });
  });

  it('keeps the modal open when encryption fails', async () => {
    (enableScaleEncryption as jest.Mock).mockRejectedValue(
      new Error('EncryptionConfig creation failed')
    );
    const { closeModal } = renderModal();

    await fillAndSubmit();

    expect(
      await screen.findByText('EncryptionConfig creation failed')
    ).toBeInTheDocument();
    expect(closeModal).not.toHaveBeenCalled();
  });
});
