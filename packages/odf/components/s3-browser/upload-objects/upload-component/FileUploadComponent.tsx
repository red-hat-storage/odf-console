import * as React from 'react';
import { PREFIX } from '@odf/core/constants';
import { getPrefix } from '@odf/core/utils';
import { FieldLevelHelp, useCustomTranslation } from '@odf/shared';
import { S3Commands } from '@odf/shared/s3';
import UploadIcon from '@patternfly/react-icons/dist/esm/icons/upload-icon';
import * as _ from 'lodash-es';
import { observer } from 'mobx-react-lite';
import { useDropzone } from 'react-dropzone';
import { Trans } from 'react-i18next';
import { useSearchParams } from 'react-router-dom-v5-compat';
import { Icon, FlexItem, Flex, Title, Button } from '@patternfly/react-core';
import { uploadStore } from '../store';
import { UploadStatus } from '../types';
import { UploadStatusBasedAlert } from '../upload-status/UploadStatusBasedAlert';
import { convertFileToUploadProgress, uploadFile } from './uploads';
import './fileUploadComponent.scss';

type FileUploadComponentProps = {
  s3Client: S3Commands;
  bucketName: string;
  showSidebar: () => void;
  hideSidebar: () => void;
  setCompletionTime: React.Dispatch<React.SetStateAction<number>>;
  triggerRefresh: () => void;
};

export const FileUploadComponent: React.FC<FileUploadComponentProps> = observer(
  ({
    s3Client,
    bucketName,
    showSidebar,
    hideSidebar,
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
      async (uploadObjects: File[]): Promise<number> => {
        try {
          const completionTime = await uploadFile(
            uploadObjects,
            s3Client,
            bucketName,
            foldersPath,
            uploadStore
          );
          return completionTime;
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error('Error uploading file', e);
        }
      },
      [bucketName, s3Client, foldersPath]
    );

    const closeAlert = React.useCallback(() => {
      setUploadStatus(UploadStatus.INIT_STATE);
      hideSidebar();
      uploadStore.clearAll();
    }, [hideSidebar]);

    const onDrop = React.useCallback(
      async (acceptedFiles: File[]) => {
        closeAlert();
        acceptedFiles.forEach((file) => {
          const key = getPrefix(
            file.webkitRelativePath || file.name,
            foldersPath
          );
          uploadStore.addFile(convertFileToUploadProgress(file, key), key);
        });
        if (!!acceptedFiles.length) {
          setUploadStatus(UploadStatus.UPLOAD_START);
          const batches = _.chunk(acceptedFiles, 6);
          let completionTime: number;
          for (const batch of batches) {
            // eslint-disable-next-line no-await-in-loop
            completionTime = await processFiles(batch);
          }
          setCompletionTime(completionTime);
        }
        setUploadStatus(UploadStatus.UPLOAD_COMPLETE);
        triggerRefresh();
      },
      [closeAlert, foldersPath, processFiles, setCompletionTime, triggerRefresh]
    );

    const { getRootProps, getInputProps } = useDropzone({
      onDrop,
      useFsAccessApi: false,
    });

    const abortAll = () => {
      setUploadStatus(UploadStatus.UPLOAD_COMPLETE);
    };

    return (
      <div className="odf-upload">
        {(uploadStatus === UploadStatus.UPLOAD_START ||
          uploadStatus === UploadStatus.UPLOAD_COMPLETE) && (
          <UploadStatusBasedAlert
            showSidebar={showSidebar}
            closeAlert={closeAlert}
            abortAll={abortAll}
          />
        )}
        <Title headingLevel="h4">
          {t('Add objects')}
          <FieldLevelHelp>
            <Trans t={t}>
              Transfer files to cloud storage, where each file (object) is
              stored with a unique identifier and metadata. By default, objects
              are private. To configure permissions or properties for objects in
              an S3 bucket, users can use the Command Line Interface (CLI),
              Management Console, or SDKs. To make objects publicly accessible
              or apply more specific permissions, users can set bucket policies,
              use access control lists (ACLs), or define roles based on their
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
                      For objects, multipart upload will upload the object in
                      parts, which are assembled in the bucket.
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
  }
);
