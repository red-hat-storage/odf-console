import * as React from 'react';
import {
  CreatePayload,
  StorageClassComponentProps as ExternalComponentProps,
  CanGoToNextStep,
  waitToCreate,
} from '@odf/odf-plugin-sdk/extensions';
import { FormGroupController } from '@odf/shared/form-group-controller';
import { SecretModel, CustomResourceDefinitionModel } from '@odf/shared/models';
import { SecretKind, K8sResourceKind } from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { isValidIP } from '@odf/shared/utils';
import { getAPIVersionForModel } from '@odf/shared/utils';
import { k8sGet } from '@openshift-console/dynamic-plugin-sdk';
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
import { IBMFlashSystemModel } from './system-models';
import { FlashSystemState, IBMFlashSystemKind } from './system-types';

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

  const secretPayload = {
    model: SecretModel,
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

/**
 * The crd status field should be available to proceed with CR creation.
 */
const isCRDAvailable = (crd: K8sResourceKind, plural: string) =>
  crd?.status?.acceptedNames?.plural === plural;

export const waitforCRD: waitToCreate = async (model) => {
  const crdName = [model.plural, model.apiGroup].join('.');
  const POLLING_INTERVAL = 5000;
  const maxAttempts = 30;
  let attempts = 0;
  /**
   * This will poll the CRD for an interval of 5s.
   * This times out after 150s.
   */
  const pollCRD = async (resolve, reject) => {
    try {
      attempts++;
      const crd = await k8sGet({
        model: CustomResourceDefinitionModel,
        name: crdName,
      });
      return isCRDAvailable(crd, model.plural)
        ? resolve()
        : setTimeout(pollCRD, POLLING_INTERVAL, resolve, reject);
    } catch (err) {
      if (err?.response?.status === 404) {
        if (attempts === maxAttempts)
          return reject(
            new Error(`CustomResourceDefintion '${crdName}' not found.`)
          );
        return setTimeout(pollCRD, POLLING_INTERVAL, resolve, reject);
      }
      return reject(err);
    }
  };

  return new Promise(pollCRD);
};
