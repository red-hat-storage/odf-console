import * as React from 'react';
import {
  useExistingFileSystemNames,
  createUniquenessValidator,
} from '@odf/core/components/create-storage-system/external-systems/common/useResourceNameValidation';
import { createFileSystem } from '@odf/core/components/create-storage-system/external-systems/CreateScaleSystem/payload';
import {
  ButtonBar,
  formSettings,
  useYupValidationResolver,
  TextInputWithFieldRequirements,
} from '@odf/shared';
import { fieldRequirementsTranslations } from '@odf/shared/constants';
import { CommonModalProps } from '@odf/shared/modals';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import validationRegEx from '@odf/shared/utils/validation';
import { Modal, ModalVariant } from '@patternfly/react-core/deprecated';
import { useForm, FieldValues, Control } from 'react-hook-form';
import * as Yup from 'yup';
import {
  Button,
  ButtonVariant,
  Flex,
  FlexItem,
  Form,
} from '@patternfly/react-core';

const FILESYSTEM_NAME_MAX_LENGTH = 63;
const FILESYSTEM_NAME_MIN_LENGTH = 3;

const AddRemoteFileSystemModal: React.FC<
  CommonModalProps<{ remoteClusterName: string }>
> = ({ closeModal, isOpen, extraProps: { remoteClusterName } }) => {
  const { t } = useCustomTranslation();
  const [inProgress, setInProgress] = React.useState(false);
  const [error, setError] = React.useState(null);

  const existingFileSystemNames = useExistingFileSystemNames();

  const { formSchema, fieldRequirements } = React.useMemo(() => {
    const fileSystemNameFieldRequirements = {
      maxChars: fieldRequirementsTranslations.maxChars(
        t,
        FILESYSTEM_NAME_MAX_LENGTH
      ),
      minChars: fieldRequirementsTranslations.minChars(
        t,
        FILESYSTEM_NAME_MIN_LENGTH
      ),
      startAndEndName: fieldRequirementsTranslations.startAndEndName(t),
      alphaNumericPeriodAdnHyphen:
        fieldRequirementsTranslations.alphaNumericPeriodAdnHyphen(t),
      mustBeUnique: t('Name must be unique'),
    };

    const formSchema = Yup.object({
      remoteFileSystemName: Yup.string()
        .required(t('File system name is required'))
        .max(
          FILESYSTEM_NAME_MAX_LENGTH,
          fileSystemNameFieldRequirements.maxChars
        )
        .min(
          FILESYSTEM_NAME_MIN_LENGTH,
          fileSystemNameFieldRequirements.minChars
        )
        .matches(
          validationRegEx.startAndEndsWithAlphanumerics,
          fileSystemNameFieldRequirements.startAndEndName
        )
        .matches(
          validationRegEx.alphaNumericsPeriodsHyphensNonConsecutive,
          fileSystemNameFieldRequirements.alphaNumericPeriodAdnHyphen
        )
        .test(
          'unique-filesystem-name',
          fileSystemNameFieldRequirements.mustBeUnique,
          createUniquenessValidator(existingFileSystemNames)
        )
        .transform((value: string) => (!!value ? value : '')),
    });

    return {
      formSchema,
      fieldRequirements: {
        remoteFileSystemName: Object.values(fileSystemNameFieldRequirements),
      },
    };
  }, [t, existingFileSystemNames]);

  const resolver = useYupValidationResolver(formSchema) as any;

  const { control, watch, handleSubmit } = useForm({
    ...formSettings,
    resolver,
    defaultValues: {
      remoteFileSystemName: '',
    },
  });

  const remoteFileSystemName = watch('remoteFileSystemName');

  const handleCreate = handleSubmit(async () => {
    setInProgress(true);
    const fileSystemPromise = createFileSystem(
      remoteClusterName,
      remoteFileSystemName
    );
    try {
      await fileSystemPromise();
      closeModal();
    } catch (err) {
      setError(err);
    } finally {
      setInProgress(false);
    }
  });
  return (
    <Modal
      title={t('Add Remote FileSystem')}
      variant={ModalVariant.medium}
      isOpen={isOpen}
      onClose={closeModal}
      actions={[
        <ButtonBar inProgress={inProgress} errorMessage={error?.message}>
          <Flex display={{ default: 'inlineFlex' }}>
            <FlexItem>
              <Button
                variant={ButtonVariant.primary}
                onClick={handleCreate}
                isDisabled={!remoteFileSystemName || !!error}
                isLoading={inProgress}
              >
                {t('Add')}
              </Button>
            </FlexItem>
            <FlexItem>
              <Button variant={ButtonVariant.secondary} onClick={closeModal}>
                {t('Cancel')}
              </Button>
            </FlexItem>
          </Flex>
        </ButtonBar>,
      ]}
    >
      <Form>
        <TextInputWithFieldRequirements
          control={control as Control<FieldValues>}
          fieldRequirements={fieldRequirements.remoteFileSystemName}
          popoverProps={{
            headerContent: t('File system name requirements'),
            footerContent: `${t('Example')}: my-filesystem`,
          }}
          formGroupProps={{
            label: t('Remote filesystem name'),
            fieldId: 'remote-file-system-name',
            isRequired: true,
          }}
          textInputProps={{
            id: 'remoteFileSystemName',
            name: 'remoteFileSystemName',
            type: 'text',
            'data-test': 'remote-file-system-name',
          }}
        />
      </Form>
    </Modal>
  );
};

export default AddRemoteFileSystemModal;
