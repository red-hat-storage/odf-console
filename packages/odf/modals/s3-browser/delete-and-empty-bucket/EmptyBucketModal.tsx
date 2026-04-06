import * as React from 'react';
import { DeleteObjectsCommandOutput } from '@aws-sdk/client-s3';
import { S3Context } from '@odf/core/components/s3-browser/s3-context';
import { CommonModalProps } from '@odf/shared/modals';
import { S3Commands } from '@odf/shared/s3';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { useModal } from '@openshift-console/dynamic-plugin-sdk';
import { Modal, ModalVariant } from '@patternfly/react-core/deprecated';
import { TFunction } from 'react-i18next';
import { Trans, useTranslation } from 'react-i18next';
import {
  Button,
  Content,
  TextInput,
  ValidatedOptions,
  TextInputTypes,
  ContentVariants,
  Alert,
  AlertVariant,
  AlertActionCloseButton,
  AlertActionLink,
  FormGroup,
} from '@patternfly/react-core';
import { LazyDeleteObjectsSummary } from '../delete-objects/LazyDeleteModals';
import { LazyDeleteBucketModal } from './lazy-delete-and-empty-bucket';

type EmptyBucketModalProps = {
  bucketName: string;
  s3Client: S3Commands;
  refreshTokens?: () => void;
  setEmptyBucketResponse: React.Dispatch<
    React.SetStateAction<EmptyBucketResponse>
  >;
};

export const getTextInputLabel = (t: TFunction, bucketName: string) => (
  <Trans t={t}>
    <b>
      To confirm deletion, type <i>{{ bucketName }}</i>:
    </b>
  </Trans>
);

const EmptyBucketModal: React.FC<CommonModalProps<EmptyBucketModalProps>> = ({
  closeModal,
  isOpen,
  extraProps: { bucketName, s3Client, refreshTokens, setEmptyBucketResponse },
}) => {
  const { t } = useCustomTranslation();
  const [inputValue, setInputValue] = React.useState('');
  const [inProgress, setInProgress] = React.useState(false);

  const onEmpty = async (event) => {
    event.preventDefault();
    setInProgress(true);
    let deleteResponse: DeleteObjectsCommandOutput;

    try {
      let isTruncated = true;
      let keyMarker: string;
      let versionIdMarker: string;

      while (isTruncated) {
        const deleteObjectKeys = [];
        const searchParams = {
          Bucket: bucketName,
          KeyMarker: keyMarker,
          VersionIdMarker: versionIdMarker,
        };

        // eslint-disable-next-line no-await-in-loop
        const objects = await s3Client.listObjectVersions(searchParams);

        if (objects?.Versions) {
          deleteObjectKeys.push(
            ...objects.Versions.map((object) => ({
              Key: object.Key,
              VersionId: object.VersionId,
            }))
          );
        }
        if (objects?.DeleteMarkers) {
          deleteObjectKeys.push(
            ...objects.DeleteMarkers.map((marker) => ({
              Key: marker.Key,
              VersionId: marker.VersionId,
            }))
          );
        }

        // eslint-disable-next-line no-await-in-loop
        deleteResponse = await s3Client.deleteObjects({
          Bucket: bucketName,
          Delete: { Objects: deleteObjectKeys },
        });

        if (deleteResponse.Errors?.length > 0) {
          throw new Error(`${deleteResponse.Errors.length} objects failed`);
        }

        isTruncated = objects.IsTruncated;
        keyMarker = objects.NextKeyMarker;
        versionIdMarker = objects.NextVersionIdMarker;
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Error while emptying bucket ', err);
    } finally {
      setInProgress(false);
      closeModal();
      setEmptyBucketResponse({
        response: deleteResponse,
        bucketName: bucketName,
      });
      refreshTokens?.();
    }
  };

  return (
    <Modal
      title={t('Empty bucket permanently?')}
      titleIconVariant="warning"
      isOpen={isOpen}
      onClose={closeModal}
      variant={ModalVariant.medium}
      description={
        <Content className="text-muted">
          <Content component={ContentVariants.p}>
            {t(
              'Emptying the bucket will permanentaly delete all objects. This action cannot be undone.'
            )}
          </Content>
          <Content component={ContentVariants.p}>
            {t(
              'Any objects added during this process may also be deleted. To prevent adding new objects during the emptying process, consider updating the bucket policy (through CLI).'
            )}
          </Content>
        </Content>
      }
      actions={[
        <div>
          {inProgress && (
            <Content component="p" className="text-muted pf-v6-u-mb-sm">
              <em>
                {t(
                  'The bucket is being emptied. This may take a while to complete.'
                )}
              </em>
            </Content>
          )}
          <Button
            key="confirm"
            variant="danger"
            isLoading={inProgress}
            onClick={onEmpty}
            isDisabled={inputValue !== bucketName || inProgress}
          >
            {t('Empty bucket')}
          </Button>

          <Button key="cancel" variant="link" onClick={closeModal}>
            {t('Cancel')}
          </Button>
        </div>,
      ]}
    >
      <FormGroup
        label={getTextInputLabel(t, bucketName)}
        className="pf-v6-u-mt-2xl pf-v6-u-mb-sm"
        fieldId="empty-bucket"
      >
        <TextInput
          value={inputValue}
          type={TextInputTypes.text}
          onChange={(_event, value) => setInputValue(value)}
          aria-label={t('Bucket name input')}
          validated={
            inputValue === bucketName
              ? ValidatedOptions.success
              : ValidatedOptions.default
          }
          placeholder={bucketName}
        />
      </FormGroup>
    </Modal>
  );
};

export type EmptyBucketResponse = {
  response: DeleteObjectsCommandOutput;
  bucketName: string;
};

type EmptyBucketAlertProps = {
  emptyBucketResponse: EmptyBucketResponse;
  setEmptyBucketResponse: React.Dispatch<
    React.SetStateAction<EmptyBucketResponse>
  >;
  triggerRefresh: () => void;
};

export const EmptyBucketAlerts: React.FC<EmptyBucketAlertProps> = ({
  emptyBucketResponse,
  setEmptyBucketResponse,
  triggerRefresh,
}) => {
  const { s3Client } = React.useContext(S3Context);
  const { t } = useTranslation();
  const launcher = useModal();

  if (emptyBucketResponse.response === null) return null;

  const hasErrors =
    emptyBucketResponse.response?.Errors &&
    emptyBucketResponse.response.Errors.length > 0;

  if (hasErrors) {
    return (
      <Alert
        variant={AlertVariant.danger}
        title={t('Cannot empty bucket')}
        isInline
        className="co-alert pf-v6-u-mb-md"
        actionClose={
          <AlertActionCloseButton
            onClose={() => {
              setEmptyBucketResponse({ response: null, bucketName: '' });
            }}
          />
        }
        actionLinks={
          <AlertActionLink
            onClick={() =>
              launcher(LazyDeleteObjectsSummary, {
                isOpen: true,
                extraProps: {
                  foldersPath: '',
                  errorResponse: emptyBucketResponse.response.Errors,
                  selectedObjects: [],
                },
              })
            }
          >
            {t('Check potential reasons')}
          </AlertActionLink>
        }
      >
        <p>
          {t(
            'Bucket emptying was not completed. Check for conflicts or permissions issues that are blocking this operation.'
          )}
        </p>
      </Alert>
    );
  }

  return (
    <Alert
      variant={AlertVariant.success}
      title={t('Successfully emptied bucket ') + emptyBucketResponse.bucketName}
      isInline
      className="co-alert pf-v6-u-mb-md"
      actionClose={
        <AlertActionCloseButton
          onClose={() => {
            setEmptyBucketResponse({ response: null, bucketName: '' });
          }}
        />
      }
      actionLinks={
        <>
          <AlertActionLink
            onClick={() =>
              launcher(LazyDeleteBucketModal, {
                isOpen: true,
                extraProps: {
                  bucketName: emptyBucketResponse.bucketName,
                  s3Client,
                  launcher,
                  triggerRefresh,
                  setEmptyBucketResponse,
                },
              })
            }
          >
            {t('Delete bucket')}
          </AlertActionLink>
          <AlertActionLink
            onClick={() =>
              setEmptyBucketResponse({ response: null, bucketName: '' })
            }
          >
            {t('Dismiss')}
          </AlertActionLink>
        </>
      }
    >
      <p>
        {t(
          'Your bucket is now empty. If you want to delete this bucket, click Delete bucket'
        )}
      </p>
    </Alert>
  );
};

export default EmptyBucketModal;
