import * as React from 'react';
import { PREFIX } from '@odf/core/constants';
import { getPrefix } from '@odf/core/utils';
import { FieldLevelHelp, useCustomTranslation } from '@odf/shared';
import { S3Commands } from '@odf/shared/s3';
import UploadIcon from '@patternfly/react-icons/dist/esm/icons/upload-icon';
import { useDropzone } from 'react-dropzone';
import { Trans } from 'react-i18next';
import { useSearchParams } from 'react-router-dom-v5-compat';
import { Icon, FlexItem, Flex, Title, Button } from '@patternfly/react-core';
import { UploadProgress, UploadStatus } from '../types';
import { UploadStatusBasedAlert } from '../upload-status/UploadStatusBasedAlert';
import { getCompletedTotalFailedCount } from '../utils';
import { convertFileToUploadProgress, uploadFile } from './uploads';
import './fileUploadComponent.scss';

type FileUploadComponentProps = {
  client: S3Commands;
  bucketName: string;
  uploadProgress: UploadProgress;
  setUploadProgress: React.Dispatch<React.SetStateAction<UploadProgress>>;
  showSidebar: () => void;
  abortAll: () => void;
  setCompletionTime: React.Dispatch<React.SetStateAction<number>>;
  triggerRefresh: () => void;
};

export const FileUploadComponent: React.FC<FileUploadComponentProps> = ({
  client,
  bucketName,
  uploadProgress,
  setUploadProgress,
  showSidebar,
  abortAll,
  setCompletionTime,
  triggerRefresh,
}) => {
  const { t } = useCustomTranslation();
  const [uploadStatus, setUploadStatus] = React.useState<
    | UploadStatus.INIT_STATE
    | UploadStatus.UPLOAD_COMPLETE
    | UploadStatus.UPLOAD_START
  >(UploadStatus.INIT_STATE);

  const [searchParams] = useSearchParams();
  const foldersPath = searchParams.get(PREFIX) || '';

  const processFiles = React.useCallback(
    async (uploadObjects: File[], setProgress) => {
      try {
        const completionTime = await uploadFile(
          uploadObjects,
          client,
          bucketName,
          setProgress,
          foldersPath
        );
        setCompletionTime(completionTime);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('Error uploading file', e);
      }
    },
    [bucketName, client, foldersPath, setCompletionTime]
  );

  const onDrop = React.useCallback(
    async (acceptedFiles: File[]) => {
      const intialUploadObjects = acceptedFiles.reduce((acc, curr) => {
        const name = getPrefix(
          curr.webkitRelativePath || curr.name,
          foldersPath
        );
        acc[name] = convertFileToUploadProgress(curr);
        return acc;
      }, {} as UploadProgress);
      setUploadProgress(intialUploadObjects);
      setUploadStatus(UploadStatus.UPLOAD_START);
      await processFiles(acceptedFiles, setUploadProgress);
      setUploadStatus(UploadStatus.UPLOAD_COMPLETE);
      triggerRefresh();
    },
    [setUploadProgress, processFiles, triggerRefresh, foldersPath]
  );

  const [completedUploads, totalUploads, failedUploads] =
    getCompletedTotalFailedCount(uploadProgress);

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    useFsAccessApi: false,
  });

  const closeAlert = () => {
    setUploadStatus(UploadStatus.INIT_STATE);
  };

  return (
    <div className="odf-upload">
      {(uploadStatus === UploadStatus.UPLOAD_START ||
        uploadStatus === UploadStatus.UPLOAD_COMPLETE) && (
        <UploadStatusBasedAlert
          failedUploads={failedUploads}
          completedUploads={completedUploads}
          showSidebar={showSidebar}
          totalUploads={totalUploads}
          closeAlert={closeAlert}
          abortAll={abortAll}
        />
      )}
      <Title headingLevel="h4">
        {t('Add objects')}
        <FieldLevelHelp>
          <Trans t={t}>
            Transfer files to cloud storage, where each file (object) is stored
            with a unique identifier and metadata. By default, objects are
            private. To configure permissions or properties for objects in an S3
            bucket, users can use the AWS Command Line Interface (CLI), AWS
            Management Console, or SDKs. To make objects publicly accessible or
            apply more specific permissions, users can set bucket policies, use
            access control lists (ACLs), or define IAM roles based on their
            requirements.
          </Trans>
        </FieldLevelHelp>
      </Title>
      <div {...getRootProps()}>
        <input {...getInputProps({ webkitdirectory: 'true' } as any)} />
        <Flex className="odf-upload__title">
          <FlexItem className="odf-upload-title__button">
            <Flex>
              <FlexItem>
                <Flex>
                  <FlexItem>
                    <Icon status="info">
                      <UploadIcon />
                    </Icon>
                  </FlexItem>
                  <FlexItem>
                    <Title headingLevel="h5">
                      {t('Drag and drop files/folders here.')}
                    </Title>
                  </FlexItem>
                </Flex>
              </FlexItem>
              <FlexItem>
                <FlexItem className="odf-upload__helper-text">
                  <Trans t={t}>
                    Standard uploads have a size limit of up to 5TB in S3. For
                    objects, multipart upload will upload the object in parts,
                    which are assembled in the bucket.
                  </Trans>
                </FlexItem>
              </FlexItem>
            </Flex>
          </FlexItem>
          <FlexItem className="odf-upload-title__input">
            <Button variant="secondary">{t('Upload')}</Button>
          </FlexItem>
        </Flex>
      </div>
    </div>
  );
};
