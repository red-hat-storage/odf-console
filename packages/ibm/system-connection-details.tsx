import * as React from 'react';
import { useSafeK8sList } from '@odf/core/hooks';
import { useODFNamespaceSelector } from '@odf/core/redux';
import {
  CreatePayload,
  StorageClassComponentProps as ExternalComponentProps,
  CanGoToNextStep,
  waitToCreate,
} from '@odf/odf-plugin-sdk/extensions';
import { FormGroupController } from '@odf/shared/form-group-controller';
import { useK8sList } from '@odf/shared/hooks/useK8sList';
import { SecretModel, CustomResourceDefinitionModel } from '@odf/shared/models';
import { getName, getNamespace } from '@odf/shared/selectors';
import { SecretKind, K8sResourceKind } from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { getAPIVersionForModel, isValidIP } from '@odf/shared/utils';
import { k8sGet } from '@openshift-console/dynamic-plugin-sdk';
import { Select, SelectOption } from '@patternfly/react-core/deprecated';
import * as Yup from 'yup';
import {
  FormGroup,
  TextInput,
  InputGroup,
  Button,
  Tooltip,
  InputGroupItem,
} from '@patternfly/react-core';
import { EyeSlashIcon, EyeIcon } from '@patternfly/react-icons';
import { IBMFlashSystemModel } from './system-models';
import { FlashSystemState, IBMFlashSystemKind } from './system-types';
import {
  isIPRegistered,
  getSecretManagementAddress,
  getFlashSystemSecretName,
} from './utils';

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
            onChange={(_event, newValue: string) => {
              onChange(newValue);
              setFormState('endpoint', newValue);
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
            onChange={(_event, value: string) => {
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
          <InputGroup translate={undefined}>
            <InputGroupItem isFill>
              <TextInput
                id="password-input"
                value={formState.password}
                type={reveal ? 'text' : 'password'}
                onChange={(_event, value: string) => {
                  onChange(value);
                  setFormState('password', value);
                }}
                onBlur={onBlur}
                isRequired
              />
            </InputGroupItem>
            <InputGroupItem>
              <Tooltip
                content={reveal ? t('Hide password') : t('Reveal password')}
              >
                <Button variant="control" onClick={() => setReveal(!reveal)}>
                  {reveal ? <EyeSlashIcon /> : <EyeIcon />}
                </Button>
              </Tooltip>
            </InputGroupItem>
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
            onChange={(_event, value: string) => {
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

export const useFlashSystemSchema = (): Yup.ObjectSchema<{}> => {
  const { t } = useCustomTranslation();

  const { odfNamespace } = useODFNamespaceSelector();

  // Non-RHCS StorageSystems are only created in ODF install namespace
  const [secretData, secretLoaded, secretLoadError] =
    useSafeK8sList<SecretKind>(SecretModel, odfNamespace);
  const [flashSystemData, flashSystemLoaded, flashSystemLoadError] =
    useK8sList<IBMFlashSystemKind>(IBMFlashSystemModel);

  const dataLoaded = flashSystemLoaded && secretLoaded;
  const dataLoadError = flashSystemLoadError || secretLoadError;

  return React.useMemo(() => {
    const existingFlashSystemSecretNames =
      dataLoaded && !dataLoadError
        ? flashSystemData?.map((data) => getFlashSystemSecretName(data))
        : [];

    const existingSecretManagementAddresses =
      existingFlashSystemSecretNames.map((secretName) => {
        const secret = secretData?.find(
          (secret) =>
            getName(secret) === secretName &&
            getNamespace(secret) === odfNamespace
        );
        return atob(getSecretManagementAddress(secret));
      });

    return Yup.object({
      'endpoint-input': Yup.string()
        .required()
        .test(
          'ip-address',
          t('The endpoint is not a valid IP address'),
          (value: string) => isValidIP(value)
        )
        .test(
          'unique-ip-address',
          t('The IP address is already registered'),
          (value: string) =>
            !isIPRegistered(value, existingSecretManagementAddresses)
        ),
      'username-input': Yup.string().required(),
      'password-input': Yup.string().required(),
      'poolname-input': Yup.string().required(),
    });
  }, [secretData, flashSystemData, dataLoaded, dataLoadError, odfNamespace, t]);
};

export const createFlashSystemPayload: CreatePayload<FlashSystemState> = ({
  systemName,
  state,
  model,
  namespace,
  storageClassName,
}) => {
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
