import * as React from 'react';
import { IBMFlashSystemModel } from '@odf/core/models';
import {
  FlashSystemState,
  IBMFlashSystemKind,
  CreatePayload,
  ExternalComponentProps,
  CanGoToNextStep,
} from '@odf/core/types';
import { FormGroupController } from '@odf/shared/form-group-controller';
import { SecretModel } from '@odf/shared/models';
import { SecretKind } from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { isValidIP } from '@odf/shared/utils';
import { getAPIVersionForModel } from '@odf/shared/utils';
import {
  FormGroup,
  TextInput,
  InputGroup,
  Button,
  Tooltip,
  Select,
  SelectOption,
} from '@patternfly/react-core';
import { EyeSlashIcon, EyeIcon } from '@patternfly/react-icons';

const VOLUME_MODES = ['thick', 'thin'];

export const FlashSystemConnectionDetails: React.FC<
  ExternalComponentProps<FlashSystemState>
> = ({ setFormState, formState, control }) => {
  const { t } = useCustomTranslation();
  const [isOpen, setIsOpen] = React.useState(false);
  const [reveal, setReveal] = React.useState(false);

  const onToggle = () => setIsOpen(!isOpen);

  const onModeSelect = (event, value) => {
    event.preventDefault();
    setFormState('volmode', value);
    setIsOpen(!isOpen);
  };

  return (
    <>
      <FormGroupController
        control={control}
        name="endpoint-input"
        formGroupProps={{
          label: t('IP address'),
          fieldId: 'endpoint-input',
          isRequired: true,
          helperText: t('Rest API IP address of IBM FlashSystem.'),
        }}
        render={({ value, onChange, onBlur }) => (
          <TextInput
            id="endpoint-input"
            type="text"
            value={value}
            onChange={(value: string) => {
              onChange(value);
              setFormState('endpoint', value);
            }}
            onBlur={onBlur}
            isRequired
          />
        )}
      />
      <FormGroupController
        name="username-input"
        control={control}
        formGroupProps={{
          label: t('Username'),
          isRequired: true,
          fieldId: 'username-input',
        }}
        render={({ onChange, onBlur }) => (
          <TextInput
            id="username-input"
            value={formState.username}
            type="text"
            onChange={(value: string) => {
              onChange(value);
              setFormState('username', value);
            }}
            onBlur={onBlur}
            isRequired
          />
        )}
      />
      <FormGroupController
        name="password-input"
        control={control}
        formGroupProps={{
          label: t('Password'),
          isRequired: true,
          fieldId: 'password-input',
        }}
        render={({ onChange, onBlur }) => (
          <InputGroup>
            <TextInput
              id="password-input"
              value={formState.password}
              type={reveal ? 'text' : 'password'}
              onChange={(value: string) => {
                onChange(value);
                setFormState('password', value);
              }}
              onBlur={onBlur}
              isRequired
            />
            <Tooltip
              content={reveal ? t('Hide password') : t('Reveal password')}
            >
              <Button variant="control" onClick={() => setReveal(!reveal)}>
                {reveal ? <EyeSlashIcon /> : <EyeIcon />}
              </Button>
            </Tooltip>
          </InputGroup>
        )}
      />

      <FormGroupController
        name="poolname-input"
        control={control}
        formGroupProps={{
          label: t('Pool name'),
          isRequired: true,
          fieldId: 'poolname-input',
        }}
        render={({ onChange, onBlur }) => (
          <TextInput
            id="poolname-input"
            value={formState.poolname}
            type="text"
            onChange={(value: string) => {
              onChange(value);
              setFormState('poolname', value);
            }}
            onBlur={onBlur}
            isRequired
          />
        )}
      />
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
