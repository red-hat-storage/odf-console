import * as React from 'react';
import { LUNsTable } from '@odf/core/components/create-storage-system/external-systems/CreateSANSystem/LUNsTable';
import {
  createLocalDisks,
  createLocalFileSystem,
  createStorageClass,
} from '@odf/core/components/create-storage-system/external-systems/CreateSANSystem/payload';
import { useDeviceFinder } from '@odf/core/components/create-storage-system/external-systems/CreateSANSystem/useDeviceFinder';
import { filterUsedDiscoveredDevices } from '@odf/core/components/utils';
import { DiscoveredDevice, LocalDiskKind } from '@odf/core/types/scale';
import { fieldRequirementsTranslations } from '@odf/shared';
import { ButtonBar } from '@odf/shared/generic/ButtonBar';
import { LocalDiskModel } from '@odf/shared/models/scale';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import validationRegEx from '@odf/shared/utils/validation';
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';
import * as _ from 'lodash-es';
import {
  Button,
  ButtonVariant,
  Form,
  FormGroup,
  Modal,
  ModalVariant,
  TextInput,
  FormHelperText,
  HelperText,
  HelperTextItem,
} from '@patternfly/react-core';

type AddLunGroupModalProps = {
  isOpen: boolean;
  closeModal: () => void;
  onSubmit: () => void;
  inProgress: boolean;
  error: string;
};

const LUN_GROUP_NAME_MAX_LENGTH = 63;
const LUN_GROUP_NAME_MIN_LENGTH = 1;

const validateLunGroupName = (
  name: string,
  t: (key: string, options?: any) => string
): string | null => {
  if (!name || name.trim().length === 0) {
    return null; // Empty is handled by required check
  }
  if (name.length < LUN_GROUP_NAME_MIN_LENGTH) {
    return fieldRequirementsTranslations.minChars(t, LUN_GROUP_NAME_MIN_LENGTH);
  }
  if (name.length > LUN_GROUP_NAME_MAX_LENGTH) {
    return fieldRequirementsTranslations.maxChars(t, LUN_GROUP_NAME_MAX_LENGTH);
  }
  if (!validationRegEx.startAndEndsWithAlphanumerics.test(name)) {
    return fieldRequirementsTranslations.startAndEndName(t);
  }
  if (!validationRegEx.alphaNumericsPeriodsHyphensNonConsecutive.test(name)) {
    return fieldRequirementsTranslations.alphaNumericPeriodAdnHyphen(t);
  }
  return null;
};

const AddLunGroupModal: React.FC<AddLunGroupModalProps> = ({
  isOpen,
  closeModal: onClose,
}) => {
  const { t } = useCustomTranslation();
  const [lunGroupName, setLunGroupName] = React.useState('');
  const [selectedLUNs, setSelectedLUNs] = React.useState<Set<string>>(
    new Set()
  );
  const [inProgress, setInProgress] = React.useState(false);
  const [error, setError] = React.useState<Error>(undefined);
  const [nameValidationError, setNameValidationError] = React.useState<
    string | null
  >(null);
  const { deviceFinderLoading, sharedDevices } = useDeviceFinder();
  const [disks] = useK8sWatchResource<LocalDiskKind[]>({
    groupVersionKind: {
      group: LocalDiskModel.apiGroup,
      version: LocalDiskModel.apiVersion,
      kind: LocalDiskModel.kind,
    },
    isList: true,
  });

  const filteredDevices = React.useMemo(
    () => filterUsedDiscoveredDevices(sharedDevices, disks),
    [sharedDevices, disks]
  );

  const isValidName = () => {
    if (!lunGroupName || lunGroupName.trim().length === 0) {
      return false;
    }
    return validateLunGroupName(lunGroupName, t) === null;
  };

  const isFormValid = isValidName && selectedLUNs.size > 0;

  const handleNameChange = (
    _event: React.FormEvent<HTMLInputElement>,
    value: string
  ) => {
    setLunGroupName(value);
    const validationError = validateLunGroupName(value, t);
    setNameValidationError(validationError);
  };

  const createLunGroup = async () => {
    if (!isFormValid) {
      return;
    }
    setInProgress(true);
    setError(undefined);
    const selectedLUNsWWNArray = Array.from(selectedLUNs);
    const selectedLUNsData: DiscoveredDevice[] = filteredDevices.filter(
      (device) => selectedLUNsWWNArray.includes(device.WWN)
    );
    try {
      const localDisks = await createLocalDisks(selectedLUNsData, t);
      const fileSystem = await createLocalFileSystem(
        lunGroupName,
        localDisks,
        t
      );
      await createStorageClass(fileSystem, t);
      setInProgress(false);
      setLunGroupName('');
      setSelectedLUNs(new Set());
      setNameValidationError(null);
      onClose();
    } catch (err) {
      setError(err);
      setInProgress(false);
    }
  };

  return (
    <Modal
      title={t('Create LUN group')}
      description={t(
        'Enter a name for the group and select one or more of the available LUNs.'
      )}
      isOpen={isOpen}
      onClose={onClose}
      variant={ModalVariant.medium}
      actions={[
        <ButtonBar
          inProgress={inProgress}
          errorMessage={error?.message || JSON.stringify(error)}
        >
          <span>
            <Button
              variant={ButtonVariant.primary}
              onClick={createLunGroup}
              isDisabled={inProgress || !isFormValid}
              isLoading={inProgress}
            >
              {t('Connect and create')}
            </Button>
            <Button variant={ButtonVariant.link} onClick={onClose}>
              {t('Cancel')}
            </Button>
          </span>
        </ButtonBar>,
      ]}
    >
      <Form>
        <FormGroup
          label={t('LUN group name')}
          fieldId="lun-group-name"
          isRequired
        >
          <TextInput
            value={lunGroupName}
            onChange={handleNameChange}
            validated={nameValidationError ? 'error' : 'default'}
            aria-describedby={
              nameValidationError ? 'lun-group-name-helper' : undefined
            }
          />
          <FormHelperText>
            <HelperText>
              <HelperTextItem
                variant={nameValidationError ? 'error' : 'default'}
              >
                {nameValidationError
                  ? nameValidationError
                  : lunGroupName
                    ? `${t('Example')}: lun-group-a`
                    : ''}
              </HelperTextItem>
            </HelperText>
          </FormHelperText>
        </FormGroup>
        <FormGroup label={t('Disks')} fieldId="disks">
          <LUNsTable
            luns={filteredDevices}
            selectedLUNs={selectedLUNs}
            onLUNSelect={setSelectedLUNs}
            loaded={!deviceFinderLoading}
          />
        </FormGroup>
      </Form>
    </Modal>
  );
};

export default AddLunGroupModal;
