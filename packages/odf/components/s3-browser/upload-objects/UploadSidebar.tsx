import * as React from 'react';
import { Status, useCustomTranslation } from '@odf/shared';
import { humanizeBinaryBytes } from '@odf/shared/utils';
import { ResourceStatus } from '@openshift-console/dynamic-plugin-sdk';
import { Trans } from 'react-i18next';
// eslint-disable-next-line import/no-extraneous-dependencies
import AutoSizer from 'react-virtualized-auto-sizer';
// eslint-disable-next-line import/no-extraneous-dependencies
import { FixedSizeList as List } from 'react-window';
import {
  Alert,
  Button,
  Drawer,
  DrawerActions,
  DrawerCloseButton,
  DrawerContent,
  DrawerContentBody,
  DrawerHead,
  DrawerPanelContent,
  Flex,
  FlexItem,
  Icon,
  Progress,
  ProgressMeasureLocation,
  Title,
} from '@patternfly/react-core';
import { CloseIcon, FileIcon } from '@patternfly/react-icons';
import { UploadProgress, UploadStatus } from './types';
import {
  getCompletedAndTotalUploadObjects,
  getTotalRemainingFilesAndSize,
  getTotalTimeElasped,
  getTotalTimeReamining,
  getUploadSpeed,
} from './utils';
import './upload.scss';

type UploadStatusItemProps = {
  fileName: string;
  fileSize: string;
  progress: number;
  onAbort?: () => void;
  onRetry?: () => void;
  failed?: boolean;
  fileAdditionalInfo?: any;
  variant: Progress['props']['variant'];
};

const FileTitle: React.FC<{
  name: string;
  size: string;
  onAbort?: (fileName: string) => void;
}> = ({ name, size }) => (
  <div>
    <span className="odf-upload__file-title--overflow">{name}</span>&nbsp;
    <span className="odf-upload__file-title--color ">{size}</span>
  </div>
);

const UploadStatusItem: React.FC<UploadStatusItemProps> = ({
  fileName,
  fileSize,
  progress,
  onAbort,
  variant,
}) => {
  return (
    <Flex>
      <FlexItem>
        <Icon size="md">
          <FileIcon />
        </Icon>
      </FlexItem>
      <FlexItem grow={{ default: 'grow' }}>
        <Progress
          measureLocation={ProgressMeasureLocation.top}
          variant={variant}
          value={progress}
          title={<FileTitle name={fileName} size={fileSize} />}
        />
      </FlexItem>
      <FlexItem>
        {progress !== 100 && (
          <Button onClick={onAbort} variant="plain">
            <CloseIcon />
          </Button>
        )}
      </FlexItem>
    </Flex>
  );
};

type UploadStatusListProps = {
  progress: UploadProgress[keyof UploadProgress][];
  currentWidth?: number;
};

const UploadStatusList: React.FC<UploadStatusListProps> = ({ progress }) => {
  const Row = ({ index, style }) => {
    const item = progress[index];
    return (
      <div style={style} key={item.name}>
        <UploadStatusItem
          variant={getProgressVariant(item.uploadState)}
          progress={(item.loaded / item.total) * 100}
          fileName={item.name}
          fileSize={humanizeBinaryBytes(item.total).string}
          onAbort={item.abort}
        />
      </div>
    );
  };

  return (
    <AutoSizer>
      {({ height, width }) => (
        <List
          height={height}
          itemCount={progress.length}
          itemSize={100}
          width={width}
        >
          {Row}
        </List>
      )}
    </AutoSizer>
  );
};

export type UploadSidebarProps = {
  isExpanded: boolean;
  closeSidebar: () => void;
  setDrawerReference?: (drawerRef: React.Ref<HTMLDivElement>) => void;
  progress: UploadProgress;
  mainContent: React.ReactNode;
};

const getProgressVariant = (
  state: UploadStatus
): Progress['props']['variant'] => {
  switch (state) {
    case UploadStatus.UPLOAD_FAILED:
      return 'danger';
    case UploadStatus.UPLOAD_COMPLETE:
      return 'success';
    default:
      return undefined;
  }
};

const PanelContent: React.FC<{
  progress: UploadProgress;
  onClose: () => void;
}> = ({ progress, onClose }) => {
  const { t } = useCustomTranslation();
  const [uploadedFiles, totalFiles] =
    getCompletedAndTotalUploadObjects(progress);
  const uploadSpeed = getUploadSpeed(progress);
  const totalReamining = getTotalRemainingFilesAndSize(progress);
  const timeRemaining = getTotalTimeReamining(progress);
  const totalTimeElasped = getTotalTimeElasped(progress);
  const isComplete = uploadedFiles === totalFiles;

  return (
    <DrawerPanelContent
      isResizable
      id="end-resize-panel"
      defaultSize={'500px'}
      minSize={'150px'}
      maxSize="unset"
      height="unset"
    >
      <div className="odf-drawer__head">
        <DrawerHead>
          <Flex direction={{ default: 'column' }}>
            <FlexItem>
              <Title headingLevel="h3">{t('Uploads')}</Title>
            </FlexItem>
            <FlexItem>
              <Title headingLevel="h4">
                <span>
                  {t(
                    '{{uploadedFiles}} of {{totalFiles}} files uploaded&nbsp;',
                    {
                      uploadedFiles,
                      totalFiles,
                    }
                  )}
                  {isComplete ? (
                    <ResourceStatus>
                      <Status
                        status="Complete"
                        title="Completed"
                        className="odf-complete-status__"
                      />
                    </ResourceStatus>
                  ) : (
                    <ResourceStatus>
                      <Status status="Uploading" title="Ongoing" />
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
                  {t('Completion time: {{totalTimeElasped}}', {
                    totalTimeElasped,
                  })}
                </FlexItem>
              </>
            ) : (
              <>
                <FlexItem>
                  {t('Total Remaining: {{totalReamining}}', { totalReamining })}
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
        <Alert title="How uploading works?" isInline variant="info">
          <Trans t={t}>
            Standard uploads have a size limit of up to 5 GB in S3. For large
            objects, something or the other will happen. We need to improve this
            alert. Or not show this. Doesnt make sense to repeat your messages
            in UI.
          </Trans>
        </Alert>
        <UploadStatusList progress={Object.values(progress)} />
      </DrawerContentBody>
    </DrawerPanelContent>
  );
};

export const UploadSidebar: React.FC<UploadSidebarProps> = ({
  isExpanded,
  closeSidebar,
  progress,
  mainContent: drawerContentBody,
}) => {
  return (
    <Drawer isExpanded={isExpanded} position="right">
      <DrawerContent
        panelContent={
          <PanelContent progress={progress} onClose={closeSidebar} />
        }
      >
        <DrawerContentBody>{drawerContentBody}</DrawerContentBody>
      </DrawerContent>
    </Drawer>
  );
};
