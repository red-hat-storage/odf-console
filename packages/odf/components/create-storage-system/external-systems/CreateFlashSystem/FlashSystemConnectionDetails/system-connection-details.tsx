import * as React from 'react';
import NamespaceSafetyBox from '@odf/core/components/utils/safety-box';
import { FLASH_STORAGE_CLASS } from '@odf/core/constants/common';
import { useSafeK8sList } from '@odf/core/hooks';
import { DeployDataFoundationModal } from '@odf/core/modals/ConfigureDF/DeployDataFoundationModal';
import {
  FDF_FLAG,
  useODFNamespaceSelector,
  useODFSystemFlagsSelector,
} from '@odf/core/redux';
import { getExternalSubSystemName, hasAnyInternalOCS } from '@odf/core/utils';
import { CreatePayload } from '@odf/odf-plugin-sdk/extensions';
import { PageHeading } from '@odf/shared';
import { FormGroupController } from '@odf/shared/form-group-controller';
import { useK8sList } from '@odf/shared/hooks/useK8sList';
import { SecretModel } from '@odf/shared/models';
import { getName, getNamespace } from '@odf/shared/selectors';
import { SecretKind } from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { getAPIVersionForModel, isValidIP } from '@odf/shared/utils';
import { useYupValidationResolver } from '@odf/shared/yup-validation-resolver';
import {
  k8sCreate,
  K8sModel,
  useFlag,
  useModal,
} from '@openshift-console/dynamic-plugin-sdk';
import * as _ from 'lodash-es';
import { useForm } from 'react-hook-form';
import { TFunction } from 'react-i18next';
import { useNavigate } from 'react-router-dom-v5-compat';
import * as Yup from 'yup';
import {
  FormGroup,
  TextInput,
  InputGroup,
  Button,
  Tooltip,
  InputGroupItem,
  Form,
  Alert,
  AlertVariant,
  ButtonVariant,
  ActionGroup,
  Select,
  SelectOption,
  SelectList,
  MenuToggleElement,
  MenuToggle,
} from '@patternfly/react-core';
import { EyeSlashIcon, EyeIcon } from '@patternfly/react-icons';
import { IBMFlashSystemModel } from './system-models';
import { FlashSystemState, IBMFlashSystemKind } from './system-types';
import {
  isIPRegistered,
  getSecretManagementAddress,
  getFlashSystemSecretName,
} from './utils';

const VOLUME_MODES_VALUES = [
  'thick',
  'thin',
  'compressed',
  'deduplicated',
  'dedup_thin',
  'dedup_compressed',
];

const VOLUME_MODES_TEXT = (t: TFunction) => [
  t('Thick'),
  t('Thin'),
  t('Compressed'),
  t('Deduplicated'),
  t('Deduplicated thin'),
  t('Deduplicated compressed'),
];

const volumeModeObject = (t: TFunction) =>
  _.zipObject(VOLUME_MODES_TEXT(t), VOLUME_MODES_VALUES);

export const FlashSystemConnectionDetails: React.FC = () => {
  const { t } = useCustomTranslation();
  const [isOpen, setIsOpen] = React.useState(false);
  const [reveal, setReveal] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState(null);
  const { odfNamespace } = useODFNamespaceSelector();
  const navigate = useNavigate();
  const launchModal = useModal();
  // Internal form state
  const [formState, setFormState] = React.useState<FlashSystemState>({
    endpoint: '',
    username: '',
    password: '',
    poolname: '',
    volmode: 'thick',
  });

  const volumeMapper = volumeModeObject(t);
  const inverseVolumeMapper = _.invert(volumeMapper);

  const onModeSelect = (event, value) => {
    event.preventDefault();
    const volumeMode = volumeMapper[value];
    setFormState((prev) => ({ ...prev, volmode: volumeMode }));
    setIsOpen(!isOpen);
  };

  const updateFormField = (field: keyof FlashSystemState, value: string) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  // Set up form validation schema
  const schema = useFlashSystemSchema();
  const resolver = useYupValidationResolver(schema);

  const {
    control,
    formState: { isValid },
  } = useForm({
    resolver,
    mode: 'onChange',
  });

  const { systemFlags } = useODFSystemFlagsSelector();
  const storageClusterExists = hasAnyInternalOCS(systemFlags);
  const isFDF = useFlag(FDF_FLAG);

  const onSubmit = async () => {
    setIsLoading(true);
    const payload = createFlashSystemPayload({
      systemName: getExternalSubSystemName(
        'IBM FlashSystem Storage',
        FLASH_STORAGE_CLASS
      ),
      state: formState,
      namespace: odfNamespace,
      storageClassName: FLASH_STORAGE_CLASS,
    });
    const promises = payload.map(
      (p) => () => k8sCreate({ model: p.model as K8sModel, data: p.payload })
    );
    try {
      // First create the Secret
      await promises[0]();
      // Then create the FlashSystem
      await promises[1]();
      if (!storageClusterExists) {
        launchModal(DeployDataFoundationModal, {} as any);
      } else {
        isFDF
          ? navigate('/odf/external-systems')
          : // Todo(bipuladh): after updating fusion codebase route update this
            navigate('/odf/storage-cluster');
      }
    } catch (e) {
      setError(e?.message ?? JSON.stringify(e));
    } finally {
      setIsLoading(false);
    }
  };

  const onToggleClick = () => {
    setIsOpen(!isOpen);
  };

  const toggle = (toggleRef: React.Ref<MenuToggleElement>) => (
    <MenuToggle
      ref={toggleRef}
      onClick={onToggleClick}
      isExpanded={isOpen}
      aria-label={t('Break By Dropdown')}
      isDisabled={false}
      isFullWidth
    >
      {inverseVolumeMapper[formState.volmode] || Object.keys(volumeMapper)[0]}
    </MenuToggle>
  );

  return (
    <>
      <PageHeading title={t('Connect IBM FlashSystem')}>
        {t(
          'Connect to IBM FlashSystem to power Data Foundation with fast, reliable block storage optimized for eterprise performance,'
        )}
      </PageHeading>
      <div className="odf-m-pane__body">
        <NamespaceSafetyBox>
          <Form isWidthLimited>
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
                    updateFormField('endpoint', newValue);
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
              render={({ value, onChange, onBlur }) => (
                <TextInput
                  id="username-input"
                  value={value}
                  type="text"
                  onChange={(_event, newValue: string) => {
                    onChange(newValue);
                    updateFormField('username', newValue);
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
              render={({ value, onChange, onBlur }) => (
                <InputGroup>
                  <InputGroupItem isFill>
                    <TextInput
                      id="password-input"
                      value={value}
                      type={reveal ? 'text' : 'password'}
                      onChange={(_event, newValue: string) => {
                        onChange(newValue);
                        updateFormField('password', newValue);
                      }}
                      onBlur={onBlur}
                      isRequired
                    />
                  </InputGroupItem>
                  <InputGroupItem>
                    <Tooltip
                      content={
                        reveal ? t('Hide password') : t('Reveal password')
                      }
                    >
                      <Button
                        variant="control"
                        onClick={() => setReveal(!reveal)}
                      >
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
              render={({ value, onChange, onBlur }) => (
                <TextInput
                  id="poolname-input"
                  value={value}
                  type="text"
                  onChange={(_event, newValue: string) => {
                    onChange(newValue);
                    updateFormField('poolname', newValue);
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
                selected={inverseVolumeMapper[formState.volmode]}
                isOpen={isOpen}
                toggle={toggle}
                shouldFocusToggleOnSelect
                popperProps={{ width: 'trigger' }}
                onOpenChange={(isOpenState) => setIsOpen(isOpenState)}
              >
                <SelectList>
                  {Object.keys(volumeMapper).map((mode) => (
                    <SelectOption key={mode} value={mode}>
                      {mode}
                    </SelectOption>
                  ))}
                </SelectList>
              </Select>
            </FormGroup>
            {error && (
              <Alert variant={AlertVariant.danger} isInline title={error} />
            )}
            <ActionGroup>
              <Button
                isLoading={isLoading}
                spinnerAriaLabel={t('Connecting')}
                onClick={onSubmit}
                variant={ButtonVariant.primary}
                isDisabled={isLoading || !isValid}
              >
                {isLoading ? t('Connecting') : t('Connect')}
              </Button>
              <Button onClick={() => navigate(-1)} variant={ButtonVariant.link}>
                {t('Cancel')}
              </Button>
            </ActionGroup>
          </Form>
        </NamespaceSafetyBox>
      </div>
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
    model: IBMFlashSystemModel,
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
