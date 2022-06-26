import * as React from 'react';
import { useDeepCompareMemoize } from '@odf/shared/hooks/deep-compare-memoize';
import { useModalLauncher } from '@odf/shared/modals/modalLauncher';
import { useFlag } from '@openshift-console/dynamic-plugin-sdk';
import { global_palette_blue_300 as blueInfoColor } from '@patternfly/react-tokens/dist/js/global_palette_blue_300';
import classNames from 'classnames';
import { TFunction } from 'i18next';
import * as _ from 'lodash';
import { useTranslation } from 'react-i18next';
import {
  FormGroup,
  FormSelect,
  FormSelectOption,
  TextInput,
  Button,
  ValidatedOptions,
} from '@patternfly/react-core';
import { PencilAltIcon } from '@patternfly/react-icons';
import { VaultEmptyState } from '../../constants';
import { FEATURES } from '../../features';
import {
  VaultConfig,
  ProviderNames,
  VaultAuthMethods,
  KmsEncryptionLevel,
  VaultAuthMethodMapping,
} from '../../types';
import { KMSConfigureProps, EncryptionDispatch } from './providers';
import { parseURL, kmsConfigValidation, isLengthUnity } from './utils';
import {
  VaultTokenConfigure,
  VaultServiceAccountConfigure,
  VaultAuthMethodProps,
} from './vault-auth-methods';
import './kms-config.scss';

const LAUNCH_MODAL_KEY = 'ADVANCED_VAULT';

export const VaultConfigure: React.FC<KMSConfigureProps> = ({
  state,
  dispatch,
  className,
  isWizardFlow,
  isMCG,
}) => {
  const { t } = useTranslation('plugin__odf-console');

  const [Modal, modalProps, launchModal] = useModalLauncher(extraMap);
  const isKmsVaultSASupported = useFlag(FEATURES.ODF_VAULT_SA_KMS);

  const vaultState: VaultConfig = useDeepCompareMemoize(
    state.kms?.[ProviderNames.VAULT],
    true
  );
  const vaultStateClone: VaultConfig = React.useMemo(
    () => _.cloneDeep(vaultState),
    [vaultState]
  );

  const { encryption } = state;
  const isScEncryption = encryption.storageClass;

  const openAdvancedModal = () =>
    launchModal(LAUNCH_MODAL_KEY, {
      state,
      dispatch,
      isWizardFlow,
    });

  const updateVaultState = React.useCallback(
    (vaultConfig: VaultConfig) =>
      dispatch({
        type: 'securityAndNetwork/setVault',
        payload: vaultConfig,
      }),
    [dispatch]
  );

  const setAuthValue = React.useCallback(
    (authValue: string) => {
      vaultStateClone.authValue.value = authValue;
      vaultStateClone.authValue.valid = authValue !== '';
      updateVaultState(vaultStateClone);
    },
    [updateVaultState, vaultStateClone]
  );

  const setAuthMethod = React.useCallback(
    (authMethod: VaultAuthMethods) => {
      if (!!vaultStateClone.authMethod) {
        vaultStateClone.authValue = VaultEmptyState.authValue;
      }
      vaultStateClone.authMethod = authMethod;
      updateVaultState(vaultStateClone);
    },
    [updateVaultState, vaultStateClone]
  );

  const filteredVaultAuthMethodMapping = React.useMemo(
    () =>
      Object.values(VaultAuthMethodMapping).filter(
        (authMethod) =>
          (encryption.clusterWide || isMCG
            ? authMethod.supportedEncryptionType.includes(
                KmsEncryptionLevel.CLUSTER_WIDE
              )
            : false) ||
          (encryption.storageClass
            ? authMethod.supportedEncryptionType.includes(
                KmsEncryptionLevel.STORAGE_CLASS
              )
            : false)
      ),
    [encryption.clusterWide, encryption.storageClass, isMCG]
  );

  const vaultAuthMethods = React.useMemo(
    () => filteredVaultAuthMethodMapping.map((authMethod) => authMethod.value),
    [filteredVaultAuthMethodMapping]
  );

  React.useEffect(() => {
    if (!vaultAuthMethods.includes(vaultState.authMethod)) {
      if (
        isKmsVaultSASupported &&
        vaultAuthMethods.includes(VaultAuthMethods.KUBERNETES)
      ) {
        // From 4.10 kubernetes is default auth method
        setAuthMethod(VaultAuthMethods.KUBERNETES);
      } else {
        // upto 4.9 token is the default auth method
        setAuthMethod(VaultAuthMethods.TOKEN);
      }
    }
  }, [
    isKmsVaultSASupported,
    setAuthMethod,
    vaultAuthMethods,
    vaultState.authMethod,
  ]);

  return (
    <>
      <Modal {...modalProps} />
      {isKmsVaultSASupported && (
        <FormGroup
          fieldId="authentication-method"
          label={t('Authentication method')}
          className={`${className}__form-body`}
          helperTextInvalid={t('This is a required field')}
          isRequired
        >
          <FormSelect
            value={vaultState.authMethod}
            onChange={setAuthMethod}
            id="authentication-method"
            name="authentication-method"
            aria-label={t('authentication-method')}
            isDisabled={isLengthUnity(vaultAuthMethods)}
          >
            {filteredVaultAuthMethodMapping.map((authMethod) => (
              <FormSelectOption
                value={authMethod.value}
                label={authMethod.name}
                key={authMethod.name}
              />
            ))}
          </FormSelect>
        </FormGroup>
      )}
      <ValutConnectionForm
        {...{
          t,
          isScEncryption,
          vaultState,
          className,
          isWizardFlow,
          dispatch,
          updateVaultState,
          setAuthValue,
          openAdvancedModal,
        }}
      />
    </>
  );
};

const extraMap = {
  [LAUNCH_MODAL_KEY]: React.lazy(
    () => import('../../modals/advanced-kms-modal/advanced-vault-modal')
  ),
};

const ValutConnectionForm: React.FC<ValutConnectionFormProps> = ({
  t,
  isScEncryption,
  vaultState,
  className,
  isWizardFlow,
  dispatch,
  updateVaultState,
  setAuthValue,
  openAdvancedModal,
}) => {
  const vaultStateClone: VaultConfig = _.cloneDeep(vaultState);
  const Component: React.FC<VaultAuthMethodProps> =
    vaultState.authMethod === VaultAuthMethods.TOKEN
      ? VaultTokenConfigure
      : VaultServiceAccountConfigure;

  React.useEffect(() => {
    const hasHandled: boolean =
      vaultState.authValue?.valid &&
      vaultState.authValue?.value !== '' &&
      kmsConfigValidation(vaultState, ProviderNames.VAULT);
    if (vaultState.hasHandled !== hasHandled) {
      dispatch({
        type: 'securityAndNetwork/setVault',
        payload: {
          ...vaultState,
          hasHandled,
        },
      });
    }
  }, [dispatch, vaultState]);

  // vault state update
  const setServiceName = (name: string) => {
    vaultStateClone.name.value = name;
    vaultStateClone.name.valid = name !== '';
    updateVaultState(vaultStateClone);
  };

  const setAddress = (address: string) => {
    vaultStateClone.address.value = address;
    vaultStateClone.address.valid =
      address !== '' && parseURL(address.trim()) != null;
    updateVaultState(vaultStateClone);
  };

  const setAddressPort = (port: string) => {
    vaultStateClone.port.value = port;
    vaultStateClone.port.valid =
      port !== '' &&
      !_.isNaN(Number(port)) &&
      Number(port) > 0 &&
      Number(port) < 65536;
    updateVaultState(vaultStateClone);
  };

  const validateAddressMessage = () =>
    vaultState.address.value === ''
      ? t('This is a required field')
      : t('Please enter a URL');

  const validatePortMessage = () =>
    vaultState.port.value === ''
      ? t('This is a required field')
      : t('Please enter a valid port');

  const isValid = (value: boolean) =>
    value ? ValidatedOptions.default : ValidatedOptions.error;

  return (
    <>
      <FormGroup
        fieldId="kms-service-name"
        label={t('Connection name')}
        className={`${className}__form-body`}
        helperTextInvalid={t('This is a required field')}
        validated={isValid(vaultState.name?.valid)}
        helperText={t(
          'A unique name for the key management service within the project.'
        )}
        isRequired
      >
        <TextInput
          value={vaultState.name?.value}
          onChange={setServiceName}
          type="text"
          id="kms-service-name"
          name="kms-service-name"
          isRequired
          validated={isValid(vaultState.name?.valid)}
          data-test="kms-service-name-text"
        />
      </FormGroup>
      <div className="ocs-install-kms__form-url">
        <FormGroup
          fieldId="kms-address"
          label={t('Address')}
          className={classNames(
            'ocs-install-kms__form-address',
            `${className}__form-body`
          )}
          helperTextInvalid={validateAddressMessage()}
          validated={isValid(vaultState.address?.valid)}
          isRequired
        >
          <TextInput
            value={vaultState.address?.value}
            onChange={setAddress}
            className="ocs-install-kms__form-address--padding"
            type="url"
            id="kms-address"
            name="kms-address"
            isRequired
            validated={isValid(vaultState.address?.valid)}
            data-test="kms-address-text"
          />
        </FormGroup>
        <FormGroup
          fieldId="kms-address-port"
          label={t('Port')}
          className={classNames(
            'ocs-install-kms__form-port',
            `${className}__form-body--small-padding`
          )}
          helperTextInvalid={validatePortMessage()}
          validated={isValid(vaultState.port?.valid)}
          isRequired
        >
          <TextInput
            value={vaultState.port?.value}
            onChange={setAddressPort}
            type="text"
            id="kms-address-port"
            name="kms-address-port"
            isRequired
            validated={isValid(vaultState.port?.valid)}
            data-test="kms-address-port-text"
          />
        </FormGroup>
      </div>
      {isWizardFlow && (
        <Component
          {...{
            t,
            className: `${className}__form-body`,
            vaultState,
            setAuthValue,
            isValid,
            isScEncryption,
          }}
        />
      )}
      <Button
        variant="link"
        className={`${className}__form-body`}
        onClick={openAdvancedModal}
        data-test="kms-advanced-settings-link"
      >
        {t('Advanced settings')}{' '}
        {(vaultState.backend ||
          vaultState.caCert ||
          vaultState.tls ||
          vaultState.clientCert ||
          vaultState.clientKey ||
          vaultState.providerNamespace) && (
          <PencilAltIcon
            data-test="edit-icon"
            size="sm"
            color={blueInfoColor.value}
          />
        )}
      </Button>
    </>
  );
};

export type ValutConnectionFormProps = {
  isScEncryption?: boolean;
  vaultState: VaultConfig;
  className: string;
  infraType?: string;
  isWizardFlow?: boolean;
  t: TFunction;
  dispatch: EncryptionDispatch;
  updateVaultState: (VaultConfig) => void;
  setAuthValue: (string) => void;
  openAdvancedModal: () => void;
};
