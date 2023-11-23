import * as React from 'react';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  FormGroup,
  FormSelect,
  FormSelectOption,
} from '@patternfly/react-core';
import { ProviderStateMap } from '../../constants';
import { ProviderNames } from '../../types';
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
];

export const KMSConfigure: React.FC<KMSConfigureProps> = ({
  state,
  dispatch,
  className,
  infraType,
  isWizardFlow,
  isMCG,
}) => {
  const { t } = useCustomTranslation();

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
    },
    [dispatch]
  );

  return (
    <div className="odf-m-pane__form">
      {!isWizardFlow && (
        <h3 className="ocs-install-kms__heading">
          {t('Connect to a Key Management Service')}
        </h3>
      )}
      <FormGroup
        fieldId="kms-provider"
        label={t('Key management service provider')}
        className={`${className}__form-body`}
      >
        <FormSelect
          value={kmsProvider}
          onChange={setKMSProvider}
          id="kms-provider"
          name="kms-provider-name"
          aria-label={t('kms-provider-name')}
          isDisabled={isLengthUnity(allowedKMSProviders)}
        >
          {allowedKMSProviders.map((provider) => (
            <FormSelectOption
              value={provider.value}
              label={provider.name}
              key={provider.value}
            />
          ))}
        </FormSelect>
      </FormGroup>
      <Component
        state={state}
        dispatch={dispatch}
        className={className}
        isWizardFlow={isWizardFlow}
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
