import * as React from 'react';
import { useDeepCompareMemoize } from '@odf/shared/hooks/deep-compare-memoize';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { getValidatedProp } from '@odf/shared/utils';
import { useModal } from '@openshift-console/dynamic-plugin-sdk';
import * as _ from 'lodash-es';
import { TFunction } from 'react-i18next';
import {
  FormGroup,
  FormSelect,
  FormSelectOption,
  Button,
  FormHelperText,
  HelperText,
  HelperTextItem,
  ValidatedOptions,
  Icon,
} from '@patternfly/react-core';
import { PencilAltIcon } from '@patternfly/react-icons';
import { t_color_blue_40 as blueInfoColor } from '@patternfly/react-tokens';
import { ProviderStateMap } from '../../constants';
import {
  VaultConfig,
  ProviderNames,
  VaultAuthMethods,
  KmsEncryptionLevel,
  VaultAuthMethodMapping,
} from '../../types';
import { NameAddrPort } from './name-address-port';
import { KMSConfigureProps, EncryptionDispatch } from './providers';
import { kmsConfigValidation, isLengthUnity } from './utils';
import {
  VaultTokenConfigure,
  VaultServiceAccountConfigure,
  VaultAuthMethodProps,
} from './vault-auth-methods';
import './kms-config.scss';

const AdvancedVaultModal = React.lazy(
  () => import('../../modals/advanced-kms-modal/advanced-vault-modal')
);

export const VaultConfigure: React.FC<KMSConfigureProps> = ({
  state,
  dispatch,
  className,
  isWizardFlow,
  isMCG,
  systemNamespace,
}) => {
  const { t } = useCustomTranslation();

  const launchModal = useModal();

  const vaultState = useDeepCompareMemoize(
    state.kms.providerState,
    true
  ) as VaultConfig;
  const vaultStateClone: VaultConfig = React.useMemo(
    () => _.cloneDeep(vaultState),
    [vaultState]
  );

  const { encryption } = state;
  const isScEncryption = encryption.storageClass;

  const openAdvancedModal = () =>
    launchModal(AdvancedVaultModal, {
      state,
      dispatch,
      isWizardFlow,
      systemNamespace,
    });

  const updateVaultState = React.useCallback(
    (vaultConfig: VaultConfig) =>
      dispatch({
        type: 'securityAndNetwork/setKmsProviderState',
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
        vaultStateClone.authValue =
          ProviderStateMap[ProviderNames.VAULT].authValue;
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
      if (vaultAuthMethods.includes(VaultAuthMethods.KUBERNETES)) {
        // From 4.10 kubernetes is default auth method
        setAuthMethod(VaultAuthMethods.KUBERNETES);
      } else {
        // upto 4.9 token is the default auth method
        setAuthMethod(VaultAuthMethods.TOKEN);
      }
    }
  }, [setAuthMethod, vaultAuthMethods, vaultState.authMethod]);

  const getValidatedAuthMethodProp = getValidatedProp(!vaultState.authMethod);

  return (
    <>
      <FormGroup
        fieldId="authentication-method"
        label={t('Authentication method')}
        className={`${className}__form-body`}
        isRequired
      >
        <FormSelect
          value={vaultState.authMethod}
          onChange={(_ev, value) => setAuthMethod(value as VaultAuthMethods)}
          id="authentication-method"
          name="authentication-method"
          aria-label={t('authentication-method')}
          isDisabled={isLengthUnity(vaultAuthMethods)}
          data-test="vault-config-auth-method"
        >
          {filteredVaultAuthMethodMapping.map((authMethod) => (
            <FormSelectOption
              value={authMethod.value}
              label={authMethod.name}
              key={authMethod.name}
            />
          ))}
        </FormSelect>
        <FormHelperText>
          <HelperText>
            <HelperTextItem variant={getValidatedAuthMethodProp}>
              {getValidatedAuthMethodProp === ValidatedOptions.error &&
                t('This is a required field')}
            </HelperTextItem>
          </HelperText>
        </FormHelperText>
      </FormGroup>
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
    // only need to pass authValue for wizard flow
    const validAuthValue: boolean = isWizardFlow
      ? vaultState.authValue?.valid && vaultState.authValue?.value !== ''
      : true;
    const hasHandled: boolean =
      validAuthValue && kmsConfigValidation(vaultState, ProviderNames.VAULT);
    if (vaultState.hasHandled !== hasHandled) {
      dispatch({
        type: 'securityAndNetwork/setKmsProviderState',
        payload: {
          ...vaultState,
          hasHandled,
        },
      });
    }
  }, [dispatch, vaultState, isWizardFlow]);

  return (
    <>
      <NameAddrPort
        className={className}
        kmsState={vaultState}
        kmsStateClone={vaultStateClone}
        updateKmsState={updateVaultState}
        canAcceptIP={false}
      />
      {isWizardFlow && (
        <Component
          {...{
            t,
            className: `${className}__form-body`,
            vaultState,
            setAuthValue,
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
          <Icon size="sm">
            <PencilAltIcon data-test="edit-icon" color={blueInfoColor.value} />
          </Icon>
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
