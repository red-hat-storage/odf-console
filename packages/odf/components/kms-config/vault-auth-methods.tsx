import * as React from 'react';
import { TFunction } from 'i18next';
import {
  InputGroup,
  FormGroup,
  TextInput,
  Button,
  ValidatedOptions,
  Tooltip,
  InputGroupItem,
  FormHelperText,
  HelperText,
  HelperTextItem,
} from '@patternfly/react-core';
import { EyeIcon, EyeSlashIcon } from '@patternfly/react-icons';
import { VaultConfig } from '../../types';

export const VaultTokenConfigure: React.FC<VaultAuthMethodProps> = ({
  t,
  className,
  vaultState,
  setAuthValue,
  isValid,
  isScEncryption,
}) => {
  const [revealToken, setRevealToken] = React.useState(false);

  return (
    <FormGroup
      fieldId="vault-token"
      label={t('Token')}
      className={className}
      isRequired
    >
      <InputGroup className="ocs-install-kms__form-token" translate={t}>
        <InputGroupItem isFill>
          <TextInput
            value={vaultState.authValue?.value}
            onChange={setAuthValue}
            type={revealToken ? 'text' : 'password'}
            id="vault-token"
            name="vault-token"
            isRequired
            validated={isValid(vaultState.authValue?.valid)}
          />
        </InputGroupItem>
        <InputGroupItem>
          <Tooltip
            content={
              revealToken
                ? t('plugin__odf-console~Hide token')
                : t('plugin__odf-console~Reveal token')
            }
          >
            <Button
              variant="control"
              onClick={() => setRevealToken(!revealToken)}
            >
              {revealToken ? <EyeSlashIcon /> : <EyeIcon />}
            </Button>
          </Tooltip>
        </InputGroupItem>
      </InputGroup>
      <FormHelperText>
        <HelperText>
          <HelperTextItem variant={isValid(vaultState.authValue.valid)}>
            {isValid(vaultState.authValue.valid) === ValidatedOptions.default
              ? isScEncryption &&
                t(
                  'Create a secret with the token for every namespace using encrypted PVCs.'
                )
              : t('This is a required field')}
          </HelperTextItem>
        </HelperText>
      </FormHelperText>
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
      <FormHelperText>
        <HelperText>
          <HelperTextItem variant={isValid(vaultState.authValue?.valid)}>
            {isValid(vaultState.authValue?.valid) === ValidatedOptions.error &&
              t('This is a required field')}
          </HelperTextItem>
        </HelperText>
      </FormHelperText>
    </FormGroup>
  );
};

export type VaultAuthMethodProps = {
  isScEncryption?: boolean;
  className: string;
  vaultState: VaultConfig;
  t: TFunction;
  setAuthValue: (string) => void;
  isValid: (boolean) => ValidatedOptions.error | ValidatedOptions.default;
};
