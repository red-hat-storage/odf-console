import * as React from 'react';
import { IBMFlashSystemModel } from '@odf/core/models';
import {
  FlashSystemState,
  IBMFlashSystemKind,
  CreatePayload,
  ExternalComponentProps,
  CanGoToNextStep,
} from '@odf/core/types';
import { SecretModel } from '@odf/shared/models';
import { SecretKind } from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { getAPIVersionForModel } from '@odf/shared/utils';
import { isValidIP } from '@odf/shared/utils';
import {
  FormGroup,
  TextInput,
  InputGroup,
  Button,
  Tooltip,
  ValidatedOptions,
  Select,
  SelectOption,
} from '@patternfly/react-core';
import { EyeSlashIcon, EyeIcon } from '@patternfly/react-icons';

const VOLUME_MODES = ['thick', 'thin'];

export const FlashSystemConnectionDetails: React.FC<
  ExternalComponentProps<FlashSystemState>
> = ({ setFormState, formState }) => {
  const { t } = useCustomTranslation();
  const [isOpen, setIsOpen] = React.useState(false);
  const [reveal, setReveal] = React.useState(false);
  const [endpointValid, setEndpointValid] = React.useState(
    ValidatedOptions.default
  );

  const onChange = (value: string) => {
    setFormState('endpoint', value);
    value && isValidIP(value)
      ? setEndpointValid(ValidatedOptions.success)
      : setEndpointValid(ValidatedOptions.error);
  };

  const onToggle = () => setIsOpen(!isOpen);

  const onModeSelect = (event, value) => {
    event.preventDefault();
    setFormState('volmode', value);
    setIsOpen(!isOpen);
  };

  return (
    <>
      <FormGroup
        label={t('IP address')}
        fieldId="endpoint-input"
        isRequired
        validated={endpointValid}
        helperText={t('Rest API IP address of IBM FlashSystem.')}
        helperTextInvalid={t('The endpoint is not a valid IP address')}
      >
        <TextInput
          id="endpoint-input"
          value={formState.endpoint}
          type="text"
          onChange={onChange}
          isRequired
        />
      </FormGroup>
      <FormGroup label={t('Username')} isRequired fieldId="username-input">
        <TextInput
          id="username-input"
          value={formState.username}
          type="text"
          onChange={(value: string) => setFormState('username', value)}
          isRequired
        />
      </FormGroup>
      <FormGroup label={t('Password')} isRequired fieldId="password-input">
        <InputGroup>
          <TextInput
            id="password-input"
            value={formState.password}
            type={reveal ? 'text' : 'password'}
            onChange={(value: string) => setFormState('password', value)}
            isRequired
          />
          <Tooltip content={reveal ? t('Hide password') : t('Reveal password')}>
            <Button variant="control" onClick={() => setReveal(!reveal)}>
              {reveal ? <EyeSlashIcon /> : <EyeIcon />}
            </Button>
          </Tooltip>
        </InputGroup>
      </FormGroup>
      <FormGroup label={t('Pool name')} isRequired fieldId="poolname-input">
        <TextInput
          id="poolname-input"
          value={formState.poolname}
          type="text"
          onChange={(value: string) => setFormState('poolname', value)}
          isRequired
        />
      </FormGroup>
      <FormGroup label={t('Volume mode')} fieldId="volume-mode-input">
        <Select
          onSelect={onModeSelect}
          id="volume-mode-input"
          selections={formState.volmode}
          onToggle={onToggle}
          isOpen={isOpen}
          isDisabled={false}
          placeholderText={VOLUME_MODES[0]}
        >
          {VOLUME_MODES.map((mode) => (
            <SelectOption key={mode} value={mode} />
          ))}
        </Select>
      </FormGroup>
    </>
  );
};

export const createFlashSystemPayload: CreatePayload<FlashSystemState> = ({
  systemName,
  state,
  model,
  storageClassName,
}) => {
  const namespace = 'openshift-storage';
  const defaultFilesystem = 'ext4';
  const defaultVolumeMode = 'thick';
  const defaultVolumePrefix = 'odf';

  const IBMFlashSystemTemplate: IBMFlashSystemKind = {
    apiVersion: getAPIVersionForModel(IBMFlashSystemModel),
    kind: IBMFlashSystemModel.kind,
    metadata: {
      name: systemName,
      namespace,
    },
    spec: {
      name: systemName,
      insecureSkipVerify: true,
      secret: {
        name: systemName,
        namespace,
      },
      defaultPool: {
        poolName: state.poolname,
        storageclassName: storageClassName,
        spaceEfficiency: state.volmode ? state.volmode : defaultVolumeMode,
        fsType: defaultFilesystem,
        volumeNamePrefix: defaultVolumePrefix,
      },
    },
  };
  const flashSystemPayload = {
    model,
    payload: IBMFlashSystemTemplate,
  };

  const storageSecretTemplate: SecretKind = {
    apiVersion: getAPIVersionForModel(SecretModel),
    stringData: {
      management_address: state.endpoint,
      password: state.password,
      username: state.username,
    },
    kind: 'Secret',
    metadata: {
      name: systemName,
      namespace,
    },
    type: 'Opaque',
  };
  const { apiVersion, apiGroup, kind, plural } = SecretModel;
  const secretPayload = {
    model: {
      apiGroup,
      apiVersion,
      kind,
      plural,
    },
    payload: storageSecretTemplate,
  };

  return [secretPayload, flashSystemPayload];
};

export const flashSystemCanGoToNextStep: CanGoToNextStep<FlashSystemState> = (
  state
) =>
  !!state.endpoint &&
  isValidIP(state.endpoint) &&
  !!state.username &&
  !!state.password &&
  !!state.poolname;
