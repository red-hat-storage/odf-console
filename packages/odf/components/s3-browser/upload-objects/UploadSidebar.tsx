import * as React from 'react';
import { Status, useCustomTranslation } from '@odf/shared';
import { ResourceStatus } from '@openshift-console/dynamic-plugin-sdk';
import { Trans } from 'react-i18next';
import {
  Alert,
  AlertVariant,
  Drawer,
  DrawerActions,
  DrawerCloseButton,
  DrawerContent,
  DrawerContentBody,
  DrawerHead,
  DrawerPanelContent,
  Flex,
  FlexItem,
  Title,
} from '@patternfly/react-core';
import { UploadProgress } from './types';
import UploadStatusList from './upload-status';
import {
  getCompletedAndTotalUploadCount,
  getFailedFiles,
  getTotalRemainingFilesAndSize,
  getTotalTimeElapsed,
  getTotalTimeRemaining,
  getUploadSpeed,
} from './utils';
import './uploadSidebar.scss';

type PanelContentProps = {
  uploadProgress: UploadProgress;
  onClose: () => void;
  completionTime: number;
};

const PanelContent: React.FC<PanelContentProps> = ({
  uploadProgress,
  onClose,
  completionTime,
}) => {
  const { t } = useCustomTranslation();
  const [uploadedFiles, totalFiles] =
    getCompletedAndTotalUploadCount(uploadProgress);
  const failedFiles = getFailedFiles(uploadProgress);
  const uploadSpeed = getUploadSpeed(uploadProgress);
  const totalRemaining = getTotalRemainingFilesAndSize(uploadProgress);
  const timeRemaining = getTotalTimeRemaining(uploadProgress);
  const totalTimeElapsed = getTotalTimeElapsed(uploadProgress, completionTime);
  const isComplete = uploadedFiles + failedFiles === totalFiles;

  return (
    <DrawerPanelContent
      isResizable
      defaultSize="500px"
      minSize="150px"
      maxSize="unset"
      height="unset"
    >
      <div className="odf-upload-sidebar__drawer-head">
        <DrawerHead>
          <Flex direction={{ default: 'column' }}>
            <FlexItem>
              <Title headingLevel="h3">{t('Uploads')}</Title>
            </FlexItem>
            <FlexItem>
              <Title headingLevel="h4">
                <span>
                  {t('{{uploadedFiles}} of {{totalFiles}} files uploaded', {
                    uploadedFiles,
                    totalFiles,
                  })}
                  &nbsp;
                  {isComplete ? (
                    <ResourceStatus>
                      <Status status={t('Complete')} title={t('Completed')} />
                    </ResourceStatus>
                  ) : (
                    <ResourceStatus>
                      <Status status={t('Uploading')} title={t('Ongoing')} />
                    </ResourceStatus>
                  )}
                </span>
              </Title>
            </FlexItem>
            {isComplete ? (
              <>
                <FlexItem>
                  {t('Succeeded: {{uploadedFiles}}', { uploadedFiles })}
                </FlexItem>
                <FlexItem>
                  {t('Failed files: {{failedFiles}}', {
                    failedFiles: totalFiles - uploadedFiles,
                  })}
                </FlexItem>
                <FlexItem>
                  {t('Completion time: {{totalTimeElapsed}}', {
                    totalTimeElapsed,
                  })}
                </FlexItem>
              </>
            ) : (
              <>
                <FlexItem>
                  {t('Total Remaining: {{totalRemaining}}', { totalRemaining })}
                </FlexItem>
                <FlexItem>
                  {t('Estimated time remaining: {{timeRemaining}}', {
                    timeRemaining,
                  })}
                </FlexItem>
                <FlexItem>
                  {t('Transfer rate: {{uploadSpeed}}', { uploadSpeed })}
                </FlexItem>
              </>
            )}
          </Flex>
          <DrawerActions>
            <DrawerCloseButton onClick={onClose} />
          </DrawerActions>
        </DrawerHead>
      </div>
      <DrawerContentBody>
        <Alert
          title="How uploading works?"
          isInline
          variant={AlertVariant.info}
          className="pf-v5-u-mb-sm"
        >
          <Trans t={t}>
            Standard uploads have a size limit of up to 5 TB in S3.
          </Trans>
        </Alert>
        <UploadStatusList progress={Object.values(uploadProgress)} />
      </DrawerContentBody>
    </DrawerPanelContent>
  );
};

export type UploadSidebarProps = {
  isExpanded: boolean;
  closeSidebar: () => void;
  setDrawerReference?: (drawerRef: React.Ref<HTMLDivElement>) => void;
  uploadProgress: UploadProgress;
  mainContent: React.ReactNode;
  completionTime: number;
};

export const UploadSidebar: React.FC<UploadSidebarProps> = ({
  isExpanded,
  closeSidebar,
  uploadProgress,
  mainContent: drawerContentBody,
  completionTime,
}) => {
  return (
    <Drawer isExpanded={isExpanded} position="right">
      <DrawerContent
        panelContent={
          <PanelContent
            uploadProgress={uploadProgress}
            onClose={closeSidebar}
            completionTime={completionTime}
          />
        }
      >
        <DrawerContentBody>{drawerContentBody}</DrawerContentBody>
      </DrawerContent>
    </Drawer>
  );
};
