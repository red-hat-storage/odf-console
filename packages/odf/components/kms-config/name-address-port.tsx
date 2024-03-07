import * as React from 'react';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import classNames from 'classnames';
import * as _ from 'lodash-es';
import {
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  TextInput,
  ValidatedOptions,
} from '@patternfly/react-core';
import { validateConnectionName } from '../../constants';
import { VaultConfig, ThalesConfig } from '../../types';
import { parseURL, isValidEndpoint, isValidName } from './utils';

export const isValid = (value: boolean) =>
  value ? ValidatedOptions.default : ValidatedOptions.error;

export const NameAddrPort: React.FC<NameAddrPortProps> = ({
  className,
  kmsState,
  kmsStateClone,
  updateKmsState,
  canAcceptIP,
}) => {
  const { t } = useCustomTranslation();

  const setServiceName = (name: string) => {
    kmsStateClone.name.value = name;
    kmsStateClone.name.valid = name !== '' && isValidName(name);
    updateKmsState(kmsStateClone);
  };

  const setAddress = (address: string) => {
    const trimAddress = address.trim();
    const validAddress: boolean = canAcceptIP
      ? isValidEndpoint(trimAddress)
      : parseURL(trimAddress) != null;
    kmsStateClone.address.value = trimAddress;
    kmsStateClone.address.valid = address !== '' && validAddress;
    updateKmsState(kmsStateClone);
  };

  const setAddressPort = (port: string) => {
    kmsStateClone.port.value = port;
    kmsStateClone.port.valid =
      port !== '' &&
      !_.isNaN(Number(port)) &&
      Number(port) > 0 &&
      Number(port) < 65536;
    updateKmsState(kmsStateClone);
  };

  const validateAddressMessage = () =>
    kmsState.address.value === ''
      ? t('This is a required field')
      : canAcceptIP
      ? t('Please enter a valid address')
      : t('Please enter a URL');

  const validatePortMessage = () =>
    kmsState.port.value === ''
      ? t('This is a required field')
      : t('Please enter a valid port');

  return (
    <>
      <FormGroup
        fieldId="kms-service-name"
        label={t('Connection name')}
        className={`${className}__form-body`}
        isRequired
      >
        <TextInput
          value={kmsState.name.value}
          onChange={(_event, name: string) => setServiceName(name)}
          type="text"
          id="kms-service-name"
          name="kms-service-name"
          isRequired
          validated={isValid(kmsState.name.valid)}
          data-test="kms-service-name-text"
        />
        <FormHelperText>
          <HelperText>
            <HelperTextItem variant={isValid(kmsState.name.valid)}>
              {isValid(kmsState.name.valid) === ValidatedOptions.default
                ? t(
                    'An unique name for the key management service within the project. Name must only include alphanumeric characters, "-", "_" or "."'
                  )
                : validateConnectionName(kmsState.name.value, t)}
            </HelperTextItem>
          </HelperText>
        </FormHelperText>
      </FormGroup>
      <div className="ocs-install-kms__form-url">
        <FormGroup
          fieldId="kms-address"
          label={t('Address')}
          className={classNames(
            'ocs-install-kms__form-address',
            `${className}__form-body`
          )}
          isRequired
        >
          <TextInput
            value={kmsState.address.value}
            onChange={(_event, address: string) => setAddress(address)}
            className="ocs-install-kms__form-address--padding"
            type="url"
            id="kms-address"
            name="kms-address"
            isRequired
            validated={isValid(kmsState.address.valid)}
            data-test="kms-address-text"
          />
          <FormHelperText>
            <HelperText>
              <HelperTextItem variant={isValid(kmsState.address.valid)}>
                {isValid(kmsState.address.valid) === ValidatedOptions.error &&
                  validateAddressMessage()}
              </HelperTextItem>
            </HelperText>
          </FormHelperText>
        </FormGroup>
        <FormGroup
          fieldId="kms-address-port"
          label={t('Port')}
          className={classNames(
            'ocs-install-kms__form-port',
            `${className}__form-body--small-padding`
          )}
          isRequired
        >
          <TextInput
            value={kmsState.port.value}
            onChange={(_event, port: string) => setAddressPort(port)}
            type="text"
            id="kms-address-port"
            name="kms-address-port"
            isRequired
            validated={isValid(kmsState.port.valid)}
            data-test="kms-address-port-text"
          />
          <FormHelperText>
            <HelperText>
              <HelperTextItem variant={isValid(kmsState.port.valid)}>
                {isValid(kmsState.port.valid) === ValidatedOptions.error &&
                  validatePortMessage()}
              </HelperTextItem>
            </HelperText>
          </FormHelperText>
        </FormGroup>
      </div>
    </>
  );
};

export type NameAddrPortProps = {
  kmsState: VaultConfig | ThalesConfig;
  className: string;
  kmsStateClone: VaultConfig | ThalesConfig;
  updateKmsState: (kmsConfig: VaultConfig | ThalesConfig) => void;
  canAcceptIP: boolean;
};
