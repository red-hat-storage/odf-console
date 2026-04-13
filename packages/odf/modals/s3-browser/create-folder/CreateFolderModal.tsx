import * as React from 'react';
import { S3ProviderType } from '@odf/core/types';
import { ButtonBar } from '@odf/shared/generic/ButtonBar';
import { CommonModalProps } from '@odf/shared/modals';
import { S3Commands } from '@odf/shared/s3';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { Modal, ModalVariant } from '@patternfly/react-core/deprecated';
import { TFunction } from 'react-i18next';
import { useNavigate } from 'react-router-dom-v5-compat';
import {
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
import {
  getBucketOverviewBaseRoute,
  DELIMITER,
  PREFIX,
} from '../../../constants';
import { getPrefix, getEncodedPrefix } from '../../../utils';

type CreateFolderModalProps = {
  foldersPath: string;
  bucketName: string;
  s3Client: S3Commands;
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
  extraProps: { foldersPath, bucketName, s3Client },
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
  const providerType = s3Client.providerType as S3ProviderType;

  const onCreate = async (event) => {
    event.preventDefault();
    setInProgress(true);

    try {
      const folderNameWDelimiter = folderName + DELIMITER;
      const data = await s3Client.listObjects({
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
        navigate(
          `${getBucketOverviewBaseRoute(bucketName, providerType)}?${PREFIX}=${prefix}`
        );
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
          errorMessage={error?.message || JSON.stringify(error)}
        >
          <span>
            <Button
              variant={ButtonVariant.primary}
              onClick={onCreate}
              isDisabled={!folderName || containsForwardSlash || !!error}
              className="pf-v6-u-mr-xs"
            >
              {t('Create')}
            </Button>
            <Button
              variant={ButtonVariant.secondary}
              onClick={closeModal}
              className="pf-v6-u-ml-xs"
            >
              {t('Cancel')}
            </Button>
          </span>
        </ButtonBar>,
      ]}
    >
      <Alert
        variant={AlertVariant.info}
        className="pf-v6-u-mb-sm"
        isInline
        title={t(
          'Folders help structure and group objects logically by using prefixes in object keys, without enforcing any physical hierarchy.'
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
