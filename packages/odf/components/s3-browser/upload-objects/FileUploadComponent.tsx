import * as React from 'react';
import { useCustomTranslation } from '@odf/shared';
import { S3Commands } from '@odf/shared/s3';
import UploadIcon from '@patternfly/react-icons/dist/esm/icons/upload-icon';
import * as _ from 'lodash-es';
import { useDropzone } from 'react-dropzone';
import { Trans } from 'react-i18next';
import { Icon, FlexItem, Flex, Title, Button } from '@patternfly/react-core';
import { UploadProgress, UploadStatus } from './types';
import { convertFileToUploadProgress, uploadFile } from './uploads';
import { UploadStatusBasedAlert } from './UploadStatusBasedAlert';
import './upload.scss';

type FileUploadComponentProps = {
  client: S3Commands;
  bucketName: string;
  uploadProgress: UploadProgress;
  setUploadProgress: React.Dispatch<React.SetStateAction<UploadProgress>>;
  showSidebar: () => void;
  abortAll: () => void;
  totalObjects?: number;
  totalCompletedObjects?: number;
};

export const FileUploadComponent: React.FC<FileUploadComponentProps> = ({
  client,
  bucketName,
  uploadProgress: totalUploadProgress,
  setUploadProgress: setTotalUploadProgress,
  showSidebar,
  abortAll,
}) => {
  const { t } = useCustomTranslation();
  const [uploadStatus, setUploadStatus] = React.useState<UploadStatus>(
    UploadStatus.INIT_STATE
  );
  const processFiles = React.useCallback(
    async (uploadObjects: File[], setProgress) => {
      const uploadGenerator = uploadFile(
        uploadObjects,
        client,
        bucketName,
        setProgress
      );
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { value, done } = uploadGenerator.next();
        if (done) {
          break;
        }
        try {
          // eslint-disable-next-line no-await-in-loop
          await value;
        } catch (e) {
          // eslint-disable-next-line no-console
          console.debug('Upload aborted', e);
        }
      }
    },
    [bucketName, client]
  );

  const onDrop = React.useCallback(
    async (acceptedFiles: File[]) => {
      const intialUploadObjects = acceptedFiles.reduce((acc, curr) => {
        acc[curr.name] = convertFileToUploadProgress(curr);
        return acc;
      }, {} as UploadProgress);
      setTotalUploadProgress(intialUploadObjects);
      setUploadStatus(UploadStatus.UPLOAD_START);
      showSidebar();
      await processFiles(acceptedFiles, setTotalUploadProgress);
      setUploadStatus(UploadStatus.UPLOAD_COMPLETE);
    },
    [showSidebar, processFiles, setTotalUploadProgress]
  );

  const totalCompletedObjects = Object.values(totalUploadProgress).filter(
    ({ uploadState }) => uploadState === UploadStatus.UPLOAD_COMPLETE
  ).length;
  const totalObjects = _.size(totalUploadProgress);

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    useFsAccessApi: false,
  });

  const closeAlert = () => {
    setUploadStatus(UploadStatus.INIT_STATE);
  };
  return (
    <>
      <div className="odf-upload-component">
        {(uploadStatus === UploadStatus.UPLOAD_START ||
          uploadStatus === UploadStatus.UPLOAD_COMPLETE) && (
          <UploadStatusBasedAlert
            status={uploadStatus}
            totalCompletedObjects={totalCompletedObjects}
            showSidebar={showSidebar}
            totalObjects={totalObjects}
            closeAlert={closeAlert}
            abortAll={abortAll}
          />
        )}
        <Title headingLevel="h4">{t('Add Objects')}</Title>
        <div {...getRootProps()}>
          <input {...getInputProps({ webkitdirectory: 'true' } as any)} />
          <Flex className="odf-upload__title">
            <FlexItem className="odf-upload-title__button">
              <Flex>
                <FlexItem>
                  <Flex>
                    <FlexItem>
                      <Icon color="blue">
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
                      Standard uploads have a size limit of up to 5GB in S3. For
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
    </>
  );
};
