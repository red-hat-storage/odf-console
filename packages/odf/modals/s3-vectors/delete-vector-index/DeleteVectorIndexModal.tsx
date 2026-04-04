import * as React from 'react';
import { ButtonBar } from '@odf/shared/generic/ButtonBar';
import { CommonModalProps } from '@odf/shared/modals';
import { S3VectorsCommands } from '@odf/shared/s3-vectors';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { Modal, ModalVariant } from '@patternfly/react-core/deprecated';
import { Trans } from 'react-i18next';
import useSWR from 'swr';
import {
  Button,
  ButtonVariant,
  Content,
  ContentVariants,
  FormGroup,
  TextInput,
  TextInputTypes,
  ValidatedOptions,
} from '@patternfly/react-core';

export type VectorIndexesDeleteResponse = {
  deletedIndexName: string | null;
};

export type SetVectorIndexesDeleteResponse = React.Dispatch<
  React.SetStateAction<VectorIndexesDeleteResponse>
>;

type DeleteVectorIndexModalProps = {
  indexName: string;
  vectorBucketName: string;
  s3VectorsClient: S3VectorsCommands;
  refreshTokens?: () => void;
  setDeleteResponse?: SetVectorIndexesDeleteResponse;
};

const DeleteVectorIndexModal: React.FC<
  CommonModalProps<DeleteVectorIndexModalProps>
> = ({ closeModal, isOpen, extraProps }) => {
  const {
    indexName,
    vectorBucketName,
    s3VectorsClient,
    refreshTokens,
    setDeleteResponse,
  } = extraProps;
  const { t } = useCustomTranslation();

  const [inputValue, setInputValue] = React.useState('');
  const [inProgress, setInProgress] = React.useState(false);
  const [deleteError, setDeleteError] = React.useState<Error>(null);

  const { error, isLoading: isChecking } = useSWR(
    `${s3VectorsClient.providerType}-${vectorBucketName}-${indexName}`,
    () =>
      s3VectorsClient.listVectors({
        vectorBucketName,
        indexName,
        maxResults: 1,
      })
  );

  const onDelete = async (event: React.FormEvent) => {
    event.preventDefault();
    setInProgress(true);

    try {
      await s3VectorsClient.deleteIndex({
        vectorBucketName,
        indexName,
      });

      setInProgress(false);
      setDeleteResponse?.({ deletedIndexName: indexName });
      closeModal();
      refreshTokens?.();
    } catch (err) {
      setDeleteError(err);
      setInProgress(false);
    }
  };

  return (
    <Modal
      title={t('Delete index permanently?')}
      titleIconVariant="warning"
      isOpen={isOpen}
      onClose={closeModal}
      variant={ModalVariant.medium}
      actions={[
        <ButtonBar
          key="delete-vector-index-button-bar"
          inProgress={inProgress}
          errorMessage={error?.message || JSON.stringify(error)}
        >
          <span>
            <Button
              variant={ButtonVariant.danger}
              onClick={onDelete}
              isDisabled={
                inputValue !== indexName ||
                inProgress ||
                isChecking ||
                !!deleteError
              }
              className="pf-v6-u-mr-xs"
            >
              {t('Delete index')}
            </Button>
            <Button
              variant={ButtonVariant.link}
              onClick={closeModal}
              className="pf-v6-u-ml-xs"
            >
              {t('Cancel')}
            </Button>
          </span>
        </ButtonBar>,
      ]}
    >
      <Content className="text-muted">
        <Content component={ContentVariants.p}>
          {t('Deleting a vector index cannot be undone.')}
        </Content>
        <Content component={ContentVariants.p}>
          {t(
            'All vectors in the index will be permanently removed. If you delete this index, you can create another index with the same name later.'
          )}
        </Content>
      </Content>

      <FormGroup
        label={
          <Trans t={t}>
            <b>
              To confirm deletion, type <i>{{ indexName }}</i>:
            </b>
          </Trans>
        }
        className="pf-v6-u-mt-2xl pf-v6-u-mb-sm"
        fieldId="delete-vector-index-confirm"
      >
        <TextInput
          value={inputValue}
          type={TextInputTypes.text}
          onChange={(_event, value) => setInputValue(value)}
          aria-label={t('Index name input')}
          validated={
            inputValue === indexName
              ? ValidatedOptions.success
              : ValidatedOptions.default
          }
          placeholder={indexName}
        />
      </FormGroup>
    </Modal>
  );
};

export default DeleteVectorIndexModal;
