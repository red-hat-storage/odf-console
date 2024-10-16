import * as React from 'react';
import { useCustomTranslation } from '@odf/shared';
import { Alert, AlertActionLink, AlertVariant } from '@patternfly/react-core';
import { InProgressIcon } from '@patternfly/react-icons';
import { AbortUploadsModal } from '../../../../modals/s3-browser/abort-uploads/AbortUploadsModal';

type UploadStatusBasedAlertProps = {
  closeAlert: () => void;
  abortAll: () => void;
  showSidebar: () => void;
  failedUploads: number;
  totalUploads: number;
  completedUploads: number;
};

export const UploadStatusBasedAlert: React.FC<UploadStatusBasedAlertProps> = ({
  showSidebar,
  abortAll,
  completedUploads,
  failedUploads,
  totalUploads,
  closeAlert,
}) => {
  const { t } = useCustomTranslation();
  const showSuccess = totalUploads === completedUploads + failedUploads;
  return (
    <Alert
      variant={showSuccess ? AlertVariant.success : undefined}
      customIcon={showSuccess ? undefined : <InProgressIcon />}
      title={
        showSuccess
          ? t('Uploading files to the bucket is complete')
          : t('Uploading files to the bucket is in progress')
      }
      isInline
      actionLinks={
        <>
          <AlertActionLink onClick={showSidebar}>
            {t('View uploads')}
          </AlertActionLink>
          {showSuccess && (
            <AlertActionLink onClick={closeAlert}>
              {t('Dismiss')}
            </AlertActionLink>
          )}
          {!showSuccess && <AbortUploadsModal abortAll={abortAll as any} />}
        </>
      }
    >
      {t('{{completedUploads}} of {{totalUploads}} have been uploaded', {
        completedUploads,
        totalUploads,
      })}
    </Alert>
  );
};
