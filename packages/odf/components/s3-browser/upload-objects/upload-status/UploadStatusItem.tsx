import * as React from 'react';
import { humanizeBinaryBytes } from '@odf/shared/utils';
import { observer } from 'mobx-react-lite';
import {
  Button,
  ButtonVariant,
  Flex,
  FlexItem,
  Icon,
  ProgressMeasureLocation,
  Progress,
  ProgressVariant,
} from '@patternfly/react-core';
import { CloseIcon, FileIcon } from '@patternfly/react-icons';
import { uploadStore } from '../store';
import { UploadStatus } from '../types';
import './uploadStatusItem.scss';

type UploadStatusItemProps = {
  fileName: string;
  fileSize: string;
  progress: number;
  failed: boolean;
  itemKey: string;
};

const getProgressVariant = (
  state: UploadStatus
): Progress['props']['variant'] => {
  switch (state) {
    case UploadStatus.UPLOAD_FAILED:
    case UploadStatus.UPLOAD_CANCELLED:
      return ProgressVariant.danger;
    case UploadStatus.UPLOAD_COMPLETE:
      return ProgressVariant.success;
    default:
      return undefined;
  }
};

const FileTitle: React.FC<{
  name: string;
  size: string;
  onAbort?: (fileName: string) => void;
}> = ({ name, size }) => (
  <div>
    <span className="odf-upload-status-item__file-title--overflow">{name}</span>
    &nbsp;
    <span className="odf-upload-status-item__file-title--color ">{size}</span>
  </div>
);

export const UploadStatusItem: React.FC<UploadStatusItemProps> = observer(
  ({ fileName, failed, itemKey }) => {
    const item = uploadStore.getFile(itemKey);
    const onAbort = () => uploadStore.performAbort(itemKey);
    const progress = (item.loaded / item.total) * 100;
    const variant = getProgressVariant(item.uploadState);
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
            title={
              <FileTitle
                name={fileName}
                size={humanizeBinaryBytes(item.total).string}
              />
            }
          />
        </FlexItem>
        <FlexItem>
          {progress !== 100 && !failed && (
            <Button
              icon={<CloseIcon />}
              onClick={onAbort}
              variant={ButtonVariant.plain}
            />
          )}
        </FlexItem>
      </Flex>
    );
  }
);
