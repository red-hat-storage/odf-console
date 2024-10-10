import * as React from 'react';
import { useCustomTranslation } from '@odf/shared';
import { Alert, AlertActionLink } from '@patternfly/react-core';
import { InProgressIcon } from '@patternfly/react-icons';
import { UploadStatus } from './types';
import './upload.scss';

type UploadStatusBasedAlertProps = {
  status: UploadStatus;
  closeAlert: () => void;
  abortAll: () => void;
  showSidebar: () => void;
  totalCompletedObjects?: number;
  totalObjects?: number;
};

export const UploadStatusBasedAlert: React.FC<UploadStatusBasedAlertProps> = ({
  status,
  showSidebar,
  abortAll,
  totalCompletedObjects,
  totalObjects,
  closeAlert,
}) => {
  const { t } = useCustomTranslation();
  return (
    <Alert
      variant={UploadStatus.UPLOAD_START === status ? undefined : 'success'}
      customIcon={
        status === UploadStatus.UPLOAD_START ? <InProgressIcon /> : undefined
      }
      title={
        status === UploadStatus.UPLOAD_START
          ? t('Uploading files to the bucket is in progress')
          : t('Uploading files to the bucket is complete')
      }
      isInline
      actionLinks={
        <>
          <AlertActionLink onClick={showSidebar}>
            {t('View uploads')}
          </AlertActionLink>
          {UploadStatus.UPLOAD_START === status && (
            <AlertActionLink onClick={abortAll}>
              {t('Cancel Upload')}
            </AlertActionLink>
          )}
          {UploadStatus.UPLOAD_COMPLETE === status && (
            <AlertActionLink onClick={closeAlert}>
              {t('Dismiss')}
            </AlertActionLink>
          )}
        </>
      }
    >
      {t('{{totalCompletedObjects}} of {{totalObjects}} have been uploaded', {
        totalCompletedObjects,
        totalObjects,
      })}
    </Alert>
  );
};
