import React from 'react';
import { screen, render, fireEvent } from '@testing-library/react';
import { AzureConfigure } from './azure-config';

const state = {
  kms: {
    providerState: {
      name: {
        value: 'test-connection',
        valid: true,
      },
      azureVaultURL: {
        value: 'https://test.com',
        valid: true,
      },
      clientID: {
        value: 'azure-client-id1',
        valid: true,
      },
      tenantID: {
        value: 'azure-tenant-id1',
        valid: true,
      },
      clientCert: {
        id: 'clientCert',
        value: '',
      },
    },
  },
};

const dispatch = jest.fn();

jest.mock('lodash-es', () => ({
  ...jest.requireActual('lodash-es'),
  cloneDeep: jest.fn((value) => value),
}));

describe('AzureConfigure component', () => {
  it('renders correctly', () => {
    const { container } = render(
      <AzureConfigure state={state} dispatch={dispatch} />
    );
    const serviceName = container.querySelector(
      '[data-test="kms-service-name-text"]'
    ) as HTMLInputElement;
    expect(serviceName).toBeInTheDocument();
    expect(screen.getByText('Connection name')).toBeInTheDocument();
    expect(serviceName.value).toBe('test-connection');
    expect(
      screen.getByText(
        'An unique name for the key management service within the project. Name must only include alphanumeric characters, "-", "_" or "."'
      )
    ).toBeInTheDocument();
    // eslint-disable-next-line testing-library/prefer-user-event
    fireEvent.change(serviceName, {
      target: { value: 'New Connection Name' },
    });
    expect(dispatch).toHaveBeenCalledWith({
      type: 'securityAndNetwork/setKmsProviderState',
      payload: {
        ...state.kms.providerState,
        name: {
          value: 'New Connection Name',
          valid: false,
        },
        hasHandled: false,
      },
    });

    const azureVaultURL = container.querySelector(
      '[data-test="azure-vault-url-text"]'
    ) as HTMLInputElement;
    expect(azureVaultURL).toBeInTheDocument();
    expect(screen.getByText('Azure Vault URL')).toBeInTheDocument();
    expect(azureVaultURL.value).toBe('https://test.com');
    // eslint-disable-next-line testing-library/prefer-user-event
    fireEvent.change(azureVaultURL, {
      target: { value: 'https://new-test.com' },
    });
    expect(dispatch).toHaveBeenCalledWith({
      type: 'securityAndNetwork/setKmsProviderState',
      payload: {
        ...state.kms.providerState,
        azureVaultURL: {
          value: 'https://new-test.com',
          valid: true,
        },
      },
    });

    const clientID = container.querySelector(
      '[data-test="azure-client-id-text"]'
    ) as HTMLInputElement;
    expect(clientID).toBeInTheDocument();
    expect(screen.getByText('Client ID')).toBeInTheDocument();
    expect(clientID.value).toBe('azure-client-id1');
    // eslint-disable-next-line testing-library/prefer-user-event
    fireEvent.change(clientID, { target: { value: 'new-azure-client-id' } });
    expect(dispatch).toHaveBeenCalledWith({
      type: 'securityAndNetwork/setKmsProviderState',
      payload: {
        ...state.kms.providerState,
        clientID: {
          value: 'new-azure-client-id',
          valid: true,
        },
      },
    });

    const tenantID = container.querySelector(
      '[data-test="azure-tenant-id-text"]'
    ) as HTMLInputElement;
    expect(tenantID).toBeInTheDocument();
    expect(screen.getByText('Tenant ID')).toBeInTheDocument();
    expect(tenantID.value).toBe('azure-tenant-id1');
    // eslint-disable-next-line testing-library/prefer-user-event
    fireEvent.change(tenantID, { target: { value: 'new-azure-tenant-id' } });
    expect(dispatch).toHaveBeenCalledWith({
      type: 'securityAndNetwork/setKmsProviderState',
      payload: {
        ...state.kms.providerState,
        tenantID: {
          value: 'new-azure-tenant-id',
          valid: true,
        },
      },
    });

    expect(screen.getByText('Certificate')).toBeInTheDocument();
    expect(serviceName).toBeRequired();
    expect(azureVaultURL).toBeRequired();
    expect(clientID).toBeRequired();
    expect(tenantID).toBeRequired();
  });
});
