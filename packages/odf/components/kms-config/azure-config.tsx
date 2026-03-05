import * as React from 'react';
import { FieldLevelHelp } from '@odf/shared/generic/FieldLevelHelp';
import { useDeepCompareMemoize } from '@odf/shared/hooks/deep-compare-memoize';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { getValidatedProp } from '@odf/shared/utils';
import * as _ from 'lodash-es';
import { Trans } from 'react-i18next';
import {
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  TextInput,
  ValidatedOptions,
} from '@patternfly/react-core';
import { validateConnectionName } from '../../constants';
import { AzureConfig, ProviderNames } from '../../types';
import { FileUploadInput } from './file-upload-input';
import { KMSConfigureProps } from './providers';
import { kmsConfigValidation, parseURL, isValidName } from './utils';

export const AzureConfigure: React.FC<KMSConfigureProps> = ({
  state,
  dispatch,
  className,
}) => {
  const { t } = useCustomTranslation();
  const azureState = useDeepCompareMemoize(
    state.kms.providerState,
    true
  ) as AzureConfig;
  const azureStateClone: AzureConfig = React.useMemo(
    () => _.cloneDeep(azureState),
    [azureState]
  );

  const updateAzureState = React.useCallback(
    (kmsConfig: AzureConfig) =>
      dispatch({
        type: 'securityAndNetwork/setKmsProviderState',
        payload: kmsConfig,
      }),
    [dispatch]
  );

  const setServiceName = (name: string) => {
    azureStateClone.name.value = name;
    azureStateClone.name.valid = isValidName(name);
    updateAzureState(azureStateClone);
  };

  const setAzureVaultURL = (address: string) => {
    const trimAddress = address.trim();
    const isValidAddress = parseURL(trimAddress) != null;
    azureStateClone.azureVaultURL.value = trimAddress;
    azureStateClone.azureVaultURL.valid = address !== '' && isValidAddress;
    updateAzureState(azureStateClone);
  };

  const setClientID = (clientID: string) => {
    azureStateClone.clientID.value = clientID;
    azureStateClone.clientID.valid = clientID !== '';
    updateAzureState(azureStateClone);
  };

  const setTenantID = (tenantId: string) => {
    azureStateClone.tenantID.value = tenantId;
    azureStateClone.tenantID.valid = tenantId !== '';
    updateAzureState(azureStateClone);
  };

  const validateAzureVaultURLMessage =
    azureState.azureVaultURL.value === ''
      ? t('This is a required field')
      : t('Please enter a valid Azure Vault URL');

  const validateClientIDMessage =
    azureState.clientID.value === ''
      ? t('This is a required field')
      : t('Please enter a valid Client ID');

  const validateTenantIDMessage =
    azureState.tenantID.value === ''
      ? t('This is a required field')
      : t('Please enter a valid Tenant ID');

  React.useEffect(() => {
    const hasHandled: boolean = kmsConfigValidation(
      azureState,
      ProviderNames.AZURE
    );
    if (azureState.hasHandled !== hasHandled) {
      updateAzureState({ ...azureState, hasHandled });
    }
  }, [updateAzureState, azureState]);

  const getValidatedNameProp = getValidatedProp(!azureState.name.valid);
  const getValidatedVaultURLProp = getValidatedProp(
    !azureState.azureVaultURL?.valid
  );
  const getValidatedClientIDProp = getValidatedProp(
    !azureState.clientID?.valid
  );
  const getValidatedTenantIDProp = getValidatedProp(
    !azureState.tenantID?.valid
  );

  return (
    <>
      <FormGroup
        fieldId="kms-service-name"
        label={t('Connection name')}
        className={`${className}__form-body`}
        isRequired
      >
        <TextInput
          value={azureState.name.value}
          onChange={(_event, name: string) => {
            setServiceName(name);
          }}
          type="text"
          id="kms-service-name"
          name="kms-service-name"
          isRequired
          validated={getValidatedNameProp}
          data-test="kms-service-name-text"
        />
        <FormHelperText>
          <HelperText>
            <HelperTextItem variant={getValidatedNameProp}>
              {getValidatedNameProp === ValidatedOptions.default
                ? t(
                    'An unique name for the key management service within the project. Name must only include alphanumeric characters, "-", "_" or "."'
                  )
                : validateConnectionName(azureState.name.value, t)}
            </HelperTextItem>
          </HelperText>
        </FormHelperText>
      </FormGroup>

      <FormGroup
        fieldId="azure-vault-url"
        label={t('Azure Vault URL')}
        labelHelp={
          <FieldLevelHelp>
            {t(
              'This URL is used to access and manage secrets, keys, and certificates stored in Azure Key Vault.'
            )}
          </FieldLevelHelp>
        }
        className={`${className}__form-body`}
        isRequired
      >
        <TextInput
          value={azureState.azureVaultURL?.value}
          onChange={(_event, address: string) => setAzureVaultURL(address)}
          type="url"
          id="azure-vault-url"
          name="azure-vault-url"
          isRequired
          validated={getValidatedVaultURLProp}
          data-test="azure-vault-url-text"
        />
        <FormHelperText>
          <HelperText>
            <HelperTextItem variant={getValidatedVaultURLProp}>
              {getValidatedVaultURLProp === ValidatedOptions.error &&
                validateAzureVaultURLMessage}
            </HelperTextItem>
          </HelperText>
        </FormHelperText>
      </FormGroup>
      <FormGroup
        fieldId="azure-client-id"
        label={t('Client ID')}
        labelHelp={
          <FieldLevelHelp>
            <Trans t={t}>
              <div>
                Client ID is the unique identifier of an application created in
                Azure AD (Active Directory).
              </div>
              <div className="pf-v6-u-mt-md">
                You can locate the client ID within Azure Active Directory by
                accessing the <strong>App registrations</strong> section.
              </div>
            </Trans>
          </FieldLevelHelp>
        }
        className={`${className}__form-body`}
        isRequired
      >
        <TextInput
          value={azureState.clientID?.value}
          onChange={(_event, clientID: string) => setClientID(clientID)}
          type="text"
          id="azure-client-id"
          name="azure-client-id"
          isRequired
          validated={getValidatedClientIDProp}
          data-test="azure-client-id-text"
        />
        <FormHelperText>
          <HelperText>
            <HelperTextItem variant={getValidatedClientIDProp}>
              {getValidatedClientIDProp === ValidatedOptions.error &&
                validateClientIDMessage}
            </HelperTextItem>
          </HelperText>
        </FormHelperText>
      </FormGroup>
      <FormGroup
        fieldId="azure-tenant-id"
        label={t('Tenant ID')}
        labelHelp={
          <FieldLevelHelp>
            <Trans t={t}>
              <div>
                The tenant ID determines the Azure AD instance where the
                application is hosted - it is the same as the organization ID.
                Also referred to as the Microsoft Entra tenant ID.
              </div>
              <div className="pf-v6-u-mt-md">
                You can find it by searching for{' '}
                <strong>Microsoft Entra ID</strong> in the Azure portal.
              </div>
            </Trans>
          </FieldLevelHelp>
        }
        className={`${className}__form-body`}
        isRequired
      >
        <TextInput
          value={azureState.tenantID?.value}
          onChange={(_event, tenantID: string) => setTenantID(tenantID)}
          type="text"
          id="azure-tenant-id"
          name="azure-tenant-id"
          isRequired
          validated={getValidatedTenantIDProp}
          data-test="azure-tenant-id-text"
        />
        <FormHelperText>
          <HelperText>
            <HelperTextItem variant={getValidatedTenantIDProp}>
              {getValidatedTenantIDProp === ValidatedOptions.error &&
                validateTenantIDMessage}
            </HelperTextItem>
          </HelperText>
        </FormHelperText>
      </FormGroup>
      <FileUploadInput
        key="azure-client-cert"
        id="clientCert"
        inputName={t('Certificate')}
        labelIcon={
          <FieldLevelHelp>
            {t(
              "Certificates serve as secrets to authenticate the application's identity when requesting a token. They are also known as public keys."
            )}
          </FieldLevelHelp>
        }
        helperText={t(
          'File must include a client certificate and a private key.'
        )}
        className={className}
        kmsState={azureState}
        kmsStateClone={azureStateClone}
        updateKmsState={updateAzureState}
      />
    </>
  );
};
