import * as React from 'react';
import { TFunction } from 'i18next';
import {
  InputGroup,
  FormGroup,
  TextInput,
  Button,
  ValidatedOptions,
  Tooltip,
} from '@patternfly/react-core';
import { EyeIcon, EyeSlashIcon } from '@patternfly/react-icons';
import { VaultConfig } from '../../types';

export const VaultTokenConfigure: React.FC<VaultAuthMethodProps> = ({
  t,
  className,
  vaultState,
  setAuthValue,
  isValid,
}) => {
  const [revealToken, setRevealToken] = React.useState(false);

  return (
    <FormGroup
      fieldId="vault-token"
      label={t('plugin__odf-console~Token')}
      className={className}
      helperTextInvalid={t('plugin__odf-console~This is a required field')}
      validated={isValid(vaultState.authValue?.valid)}
      helperText={t(
        'plugin__odf-console~Create a secret with the token for every namespace using encrypted PVCs.',
      )}
      isRequired
    >
      <InputGroup className="ocs-install-kms__form-token">
        <TextInput
          value={vaultState.authValue?.value}
          onChange={setAuthValue}
          type={revealToken ? 'text' : 'password'}
          id="vault-token"
          name="vault-token"
          isRequired
          validated={isValid(vaultState.authValue?.valid)}
        />
        <Tooltip
          content={
            revealToken
              ? t('plugin__odf-console~Hide token')
              : t('plugin__odf-console~Reveal token')
          }
        >
          <Button variant="control" onClick={() => setRevealToken(!revealToken)}>
            {revealToken ? <EyeSlashIcon /> : <EyeIcon />}
          </Button>
        </Tooltip>
      </InputGroup>
    </FormGroup>
  );
};

export const VaultServiceAccountConfigure: React.FC<VaultAuthMethodProps> = ({
  t,
  className,
  vaultState,
  setAuthValue,
  isValid,
}) => {
  return (
    <FormGroup
      fieldId="vault-sa-role"
      label={t('plugin__odf-console~Role')}
      className={className}
      helperTextInvalid={t('plugin__odf-console~This is a required field')}
      validated={isValid(vaultState.authValue?.valid)}
      isRequired
    >
      <TextInput
        value={vaultState.authValue?.value}
        onChange={setAuthValue}
        type="text"
        id="vault-sa-role"
        name="vault-sa-role"
        isRequired
        validated={isValid(vaultState.authValue?.valid)}
      />
    </FormGroup>
  );
};

export type VaultAuthMethodProps = {
  className: string;
  vaultState: VaultConfig;
  t: TFunction;
  setAuthValue: (string) => void;
  isValid: (boolean) => ValidatedOptions.error | ValidatedOptions.default;
};
