import * as React from 'react';
import { DrawerHead, Status, useCustomTranslation } from '@odf/shared';
import { ResourceStatus } from '@openshift-console/dynamic-plugin-sdk';
import { observer } from 'mobx-react-lite';
import { Trans } from 'react-i18next';
import {
  Alert,
  AlertVariant,
  Drawer,
  DrawerActions,
  DrawerCloseButton,
  DrawerContent,
  DrawerContentBody,
  DrawerPanelContent,
  Flex,
  FlexItem,
  Title,
} from '@patternfly/react-core';
import { uploadStore } from './store';
import UploadStatusList from './upload-status';
import { getTotalTimeElapsed } from './utils';

type PanelContentProps = {
  onClose: () => void;
  completionTime: number;
};

const PanelContent: React.FC<PanelContentProps> = observer(
  ({ onClose, completionTime }) => {
    const { t } = useCustomTranslation();

    const uploadedFiles = uploadStore.getCompletedFilesCount;
    const failedFiles = uploadStore.getFailedAndCancelledFilesCount;
    const totalFiles = uploadStore.getTotalFilesCount;
    const uploadSpeed = uploadStore.getUploadSpeed;
    const totalRemaining = uploadStore.getTotalRemainingFilesAndSize;
    const timeRemaining = uploadStore.getTotalTimeRemaning;

    const uploadProgress = uploadStore.getAll;
    const totalTimeElapsed = getTotalTimeElapsed(
      uploadProgress,
      completionTime
    );
    const isComplete = uploadedFiles + failedFiles === totalFiles;

    return (
      <DrawerPanelContent
        isResizable
        defaultSize="500px"
        minSize="150px"
        maxSize="unset"
        height="unset"
      >
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
          <UploadStatusList />
        </DrawerContentBody>
      </DrawerPanelContent>
    );
  }
);

export type UploadSidebarProps = {
  isExpanded: boolean;
  closeSidebar: () => void;
  mainContent: React.ReactNode;
  completionTime: number;
};

export const UploadSidebar: React.FC<UploadSidebarProps> = ({
  isExpanded,
  closeSidebar,
  mainContent: drawerContentBody,
  completionTime,
}) => {
  return (
    <Drawer isExpanded={isExpanded} position="right">
      <DrawerContent
        panelContent={
          <PanelContent
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
