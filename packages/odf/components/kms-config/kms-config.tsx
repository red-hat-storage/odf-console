import * as React from 'react';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  FormGroup,
  MenuToggle,
  MenuToggleElement,
  Select,
  SelectOption,
  Content,
  ContentVariants,
} from '@patternfly/react-core';
import { ProviderStateMap } from '../../constants';
import { ProviderNames } from '../../types';
import { AzureConfigure } from './azure-config';
import { HpcsConfigure } from './hpcs-config';
import { KMSConfigureProps } from './providers';
import { ThalesConfigure } from './thales-config';
import { isLengthUnity } from './utils';
import { VaultConfigure } from './vault-config';
import './kms-config.scss';
import '../../style.scss';

const KMSProviders: KMSProvidersType = [
  {
    name: 'Vault',
    value: ProviderNames.VAULT,
    Component: VaultConfigure,
  },
  {
    name: 'Hyper Protect Crypto Services',
    value: ProviderNames.HPCS,
    Component: HpcsConfigure,
    allowedPlatforms: ['IBMCloud'],
  },
  {
    name: 'Thales CipherTrust Manager (using KMIP)',
    value: ProviderNames.THALES,
    Component: ThalesConfigure,
  },
  {
    name: 'Azure Key Vault',
    value: ProviderNames.AZURE,
    Component: AzureConfigure,
    allowedPlatforms: ['Azure'],
  },
];

export const KMSConfigure: React.FC<KMSConfigureProps> = ({
  state,
  dispatch,
  className,
  infraType,
  isWizardFlow,
  isMCG,
  systemNamespace,
}) => {
  const { t } = useCustomTranslation();
  const [isOpen, setIsOpen] = React.useState(false);

  // vault as default KMS
  const kmsProvider: ProviderNames =
    state.kms?.['provider'] || ProviderNames.VAULT;
  const allowedKMSProviders = KMSProviders.filter(
    (provider) =>
      !provider.allowedPlatforms ||
      provider?.allowedPlatforms.includes(infraType)
  );
  const { Component } = allowedKMSProviders.find(
    (provider) => provider.value === kmsProvider
  );

  const selectedProvider =
    allowedKMSProviders.find((provider) => provider.value === kmsProvider) ||
    allowedKMSProviders[0];

  const setKMSProvider = React.useCallback(
    (provider: ProviderNames) => {
      dispatch({
        type: 'securityAndNetwork/setKmsProviderState',
        payload: ProviderStateMap[provider],
      });
      dispatch({
        type: 'securityAndNetwork/setKmsProvider',
        payload: provider,
      });
      setIsOpen(false);
    },
    [dispatch]
  );

  const onToggleClick = () => {
    setIsOpen(!isOpen);
  };

  const toggle = (toggleRef: React.Ref<MenuToggleElement>) => (
    <MenuToggle
      ref={toggleRef}
      onClick={onToggleClick}
      isDisabled={isLengthUnity(allowedKMSProviders)}
      isExpanded={isOpen}
      className="pf-v6-c-form-control"
    >
      {selectedProvider.name}
    </MenuToggle>
  );

  return (
    <div className="ocs-storage-class-encryption__form-dropdown--padding">
      {!isWizardFlow && (
        <Content className="ocs-install-kms__heading">
          <Content component={ContentVariants.h3}>
            {t('Connect to a Key Management Service')}
          </Content>
        </Content>
      )}
      <FormGroup
        fieldId="kms-provider"
        label={t('Key management service provider')}
        className={`${className}__form-body`}
      >
        <Select
          onSelect={(_event, value) => setKMSProvider(value as ProviderNames)}
          onOpenChange={setIsOpen}
          toggle={toggle}
          isOpen={isOpen}
          id="kms-provider"
          aria-label={t('kms-provider-name')}
          selected={kmsProvider}
        >
          {allowedKMSProviders.map((provider) => (
            <SelectOption key={provider.value} value={provider.value}>
              {provider.name}
            </SelectOption>
          ))}
        </Select>
      </FormGroup>
      <Component
        state={state}
        dispatch={dispatch}
        className={className}
        isWizardFlow={isWizardFlow}
        systemNamespace={systemNamespace}
        isMCG={isMCG}
      />
    </div>
  );
};

type KMSProvidersType = {
  name: string;
  value: ProviderNames;
  Component: React.FC<KMSConfigureProps>;
  allowedPlatforms?: string[];
}[];
