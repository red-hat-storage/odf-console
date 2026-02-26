import * as React from 'react';
import { useExistingFileSystemNames } from '@odf/core/components/create-storage-system/external-systems/common/useResourceNameValidation';
import { LUNsTable } from '@odf/core/components/create-storage-system/external-systems/CreateSANSystem/LUNsTable';
import {
  createLocalDisks,
  createLocalFileSystem,
  createStorageClass,
} from '@odf/core/components/create-storage-system/external-systems/CreateSANSystem/payload';
import { useDeviceFinder } from '@odf/core/components/create-storage-system/external-systems/CreateSANSystem/useDeviceFinder';
import useSANSystemFormValidation from '@odf/core/components/create-storage-system/external-systems/CreateSANSystem/useFormValidation';
import { filterUsedDiscoveredDevices } from '@odf/core/components/utils';
import { DiscoveredDevice, LocalDiskKind } from '@odf/core/types/scale';
import { ButtonBar } from '@odf/shared/generic/ButtonBar';
import { TextInputWithFieldRequirements } from '@odf/shared/input-with-requirements';
import { LocalDiskModel } from '@odf/shared/models/scale';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';
import { Modal, ModalVariant } from '@patternfly/react-core/deprecated';
import * as _ from 'lodash-es';
import { Button, ButtonVariant, Form, FormGroup } from '@patternfly/react-core';

type AddLunGroupModalProps = {
  isOpen: boolean;
  closeModal: () => void;
  onSubmit: () => void;
  inProgress: boolean;
  error: string;
};

const AddLunGroupModal: React.FC<AddLunGroupModalProps> = ({
  isOpen,
  closeModal: onClose,
}) => {
  const { t } = useCustomTranslation();
  const [selectedLUNs, setSelectedLUNs] = React.useState<Set<string>>(
    new Set()
  );
  const [inProgress, setInProgress] = React.useState(false);
  const [error, setError] = React.useState<Error>(undefined);
  const { deviceFinderLoading, sharedDevices } = useDeviceFinder();

  const [disks] = useK8sWatchResource<LocalDiskKind[]>({
    groupVersionKind: {
      group: LocalDiskModel.apiGroup,
      version: LocalDiskModel.apiVersion,
      kind: LocalDiskModel.kind,
    },
    isList: true,
  });

  const existingFileSystemNames = useExistingFileSystemNames();

  const { fieldRequirements, control, watch } = useSANSystemFormValidation(
    existingFileSystemNames
  );

  // Watch form field
  const lunGroupName = watch('lunGroupName');

  const filteredDevices = React.useMemo(
    () => filterUsedDiscoveredDevices(sharedDevices, disks),
    [sharedDevices, disks]
  );

  const createLunGroup = async () => {
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
              isDisabled={
                inProgress || _.isEmpty(selectedLUNs) || !lunGroupName
              }
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
        <TextInputWithFieldRequirements
          control={control}
          fieldRequirements={fieldRequirements.lunGroupName}
          popoverProps={{
            headerContent: t('LUN group name requirements'),
            footerContent: `${t('Example')}: lun-group-a`,
          }}
          formGroupProps={{
            label: t('LUN group name'),
            fieldId: 'lun-group-name',
            isRequired: true,
          }}
          textInputProps={{
            id: 'lunGroupName',
            name: 'lunGroupName',
            type: 'text',
            'data-test': 'lun-group-name',
          }}
        />
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
