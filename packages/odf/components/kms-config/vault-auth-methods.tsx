import * as React from 'react';
import { getValidatedProp } from '@odf/shared/utils';
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
  isScEncryption,
}) => {
  const [revealToken, setRevealToken] = React.useState(false);
  const getValidatedAuthValueProp = getValidatedProp(
    !vaultState.authValue?.valid
  );

  return (
    <FormGroup
      fieldId="vault-token"
      label={t('Token')}
      className={className}
      isRequired
    >
      <InputGroup className="ocs-install-kms__form-token">
        <InputGroupItem isFill>
          <TextInput
            value={vaultState.authValue?.value}
            onChange={(_event, authValue: string) => setAuthValue(authValue)}
            type={revealToken ? 'text' : 'password'}
            id="vault-token"
            name="vault-token"
            isRequired
            validated={getValidatedAuthValueProp}
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
          <HelperTextItem variant={getValidatedAuthValueProp}>
            {getValidatedAuthValueProp === ValidatedOptions.default
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
}) => {
  const getValidatedAuthValueProp = getValidatedProp(
    !vaultState.authValue?.valid
  );
  return (
    <FormGroup
      fieldId="vault-sa-role"
      label={t('plugin__odf-console~Role')}
      className={className}
      isRequired
    >
      <TextInput
        value={vaultState.authValue?.value}
        onChange={(_event, authValue: string) => setAuthValue(authValue)}
        type="text"
        id="vault-sa-role"
        name="vault-sa-role"
        isRequired
        validated={getValidatedAuthValueProp}
      />
      <FormHelperText>
        <HelperText>
          <HelperTextItem variant={getValidatedAuthValueProp}>
            {getValidatedAuthValueProp === ValidatedOptions.error &&
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
};
