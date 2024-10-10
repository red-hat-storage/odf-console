import * as React from 'react';
import { ButtonBar } from '@odf/shared/generic/ButtonBar';
import { CommonModalProps } from '@odf/shared/modals';
import { S3Commands } from '@odf/shared/s3';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { TFunction } from 'i18next';
import { useNavigate } from 'react-router-dom-v5-compat';
import {
  Modal,
  ModalVariant,
  Button,
  ButtonVariant,
  Alert,
  AlertVariant,
  TextInput,
  TextInputTypes,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  ValidatedOptions,
} from '@patternfly/react-core';
import { BUCKETS_BASE_ROUTE, DELIMITER, PREFIX } from '../../../constants';
import { getPrefix, getEncodedPrefix } from '../../../utils';

type CreateFolderModalProps = {
  foldersPath: string;
  bucketName: string;
  noobaaS3: S3Commands;
};

const getValidations = (
  isExisting: boolean,
  containsForwardSlash: boolean,
  folderName: string,
  t: TFunction
): [ValidatedOptions, string] => {
  if (isExisting)
    return [
      ValidatedOptions.error,
      t(
        'This name is already in use. Try using a different name for your folder.'
      ),
    ];
  else if (containsForwardSlash)
    return [
      ValidatedOptions.error,
      t('The forward slash ("/") cannot be used.'),
    ];
  else if (!!folderName)
    return [
      ValidatedOptions.success,
      t('All characters are allowed except for the forward slash ("/").'),
    ];
  else
    return [
      ValidatedOptions.default,
      t(
        'A unique folder name is required. All characters are allowed except for the forward slash ("/").'
      ),
    ];
};

const CreateFolderModal: React.FC<CommonModalProps<CreateFolderModalProps>> = ({
  closeModal,
  isOpen,
  extraProps: { foldersPath, bucketName, noobaaS3 },
}) => {
  const { t } = useCustomTranslation();

  const navigate = useNavigate();

  const [folderName, setFolderName] = React.useState<string>('');
  const [inProgress, setInProgress] = React.useState<boolean>(false);
  const [isExisting, setIsExisting] = React.useState<boolean>(false);
  const [error, setError] = React.useState<Error>();

  const containsForwardSlash = folderName.includes(DELIMITER);
  const [validationVariant, helperText] = getValidations(
    isExisting,
    containsForwardSlash,
    folderName,
    t
  );

  const onCreate = async (event) => {
    event.preventDefault();
    setInProgress(true);

    try {
      const folderNameWDelimiter = folderName + DELIMITER;
      const data = await noobaaS3.listObjects({
        Bucket: bucketName,
        MaxKeys: 1,
        Delimiter: DELIMITER,
        Prefix: getPrefix(folderNameWDelimiter, foldersPath),
      });

      const doesFolderAlreadyExist =
        !!data?.Contents?.length || !!data?.CommonPrefixes?.length;

      if (doesFolderAlreadyExist) {
        setInProgress(false);
        setIsExisting(true);
      } else {
        const prefix = getEncodedPrefix(folderNameWDelimiter, foldersPath);
        navigate(`${BUCKETS_BASE_ROUTE}/${bucketName}?${PREFIX}=${prefix}`);
        closeModal();
      }
    } catch (err) {
      setInProgress(false);
      setError(err);
    }
  };

  return (
    <Modal
      title={t('Create folder')}
      isOpen={isOpen}
      onClose={closeModal}
      description={
        <div className="text-muted">
          {t(
            'Organize objects within a bucket by creating virtual folders for easier management and navigation of objects.'
          )}
        </div>
      }
      variant={ModalVariant.medium}
      actions={[
        <ButtonBar
          inProgress={inProgress}
          errorMessage={error?.message || error}
        >
          <span>
            <Button
              variant={ButtonVariant.primary}
              onClick={onCreate}
              isDisabled={!folderName || containsForwardSlash || !!error}
              className="pf-v5-u-mr-xs"
            >
              {t('Create')}
            </Button>
            <Button
              variant={ButtonVariant.secondary}
              onClick={closeModal}
              className="pf-v5-u-ml-xs"
            >
              {t('Cancel')}
            </Button>
          </span>
        </ButtonBar>,
      ]}
    >
      <Alert
        variant={AlertVariant.info}
        className="pf-v5-u-mb-sm"
        isInline
        title={t(
          'Folders structure and group objects logically by using prefixes in object keys, without enforcing any physical hierarchy.'
        )}
      />
      <FormGroup label={t('Folder name')} fieldId="folder-name" isRequired>
        <TextInput
          value={folderName}
          id="folder-name"
          onChange={(_event, value) => {
            setFolderName(value);
            setIsExisting(false);
          }}
          isRequired
          validated={validationVariant}
          type={TextInputTypes.text}
        />
        <FormHelperText>
          <HelperText>
            <HelperTextItem variant={validationVariant}>
              {helperText}
            </HelperTextItem>
          </HelperText>
        </FormHelperText>
      </FormGroup>
    </Modal>
  );
};

export default CreateFolderModal;
