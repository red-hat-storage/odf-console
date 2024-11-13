import * as React from 'react';
import {
  Button,
  ButtonVariant,
  Flex,
  FlexItem,
  Icon,
  Progress,
  ProgressMeasureLocation,
} from '@patternfly/react-core';
import { CloseIcon, FileIcon } from '@patternfly/react-icons';
import './uploadStatusItem.scss';

type UploadStatusItemProps = {
  fileName: string;
  fileSize: string;
  progress: number;
  onAbort?: () => void;
  failed: boolean;
  variant: Progress['props']['variant'];
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
export const UploadStatusItem: React.FC<UploadStatusItemProps> = ({
  fileName,
  fileSize,
  progress,
  onAbort,
  variant,
  failed,
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
        {progress !== 100 && !failed && !!onAbort && (
          <Button onClick={onAbort} variant={ButtonVariant.plain}>
            <CloseIcon />
          </Button>
        )}
      </FlexItem>
    </Flex>
  );
};
