import * as React from 'react';
import { humanizeBinaryBytes } from '@odf/shared/utils';
import AutoSizer from 'react-virtualized-auto-sizer';
import { FixedSizeList as List } from 'react-window';
import { Progress, ProgressVariant } from '@patternfly/react-core';
import { UploadProgress, UploadStatus } from '../types';
import { UploadStatusItem } from './UploadStatusItem';

type UploadStatusListProps = {
  progress: UploadProgress[keyof UploadProgress][];
  currentWidth?: number;
};

const getProgressVariant = (
  state: UploadStatus
): Progress['props']['variant'] => {
  switch (state) {
    case UploadStatus.UPLOAD_FAILED:
      return ProgressVariant.danger;
    case UploadStatus.UPLOAD_COMPLETE:
      return ProgressVariant.success;
    default:
      return undefined;
  }
};

const UploadStatusListRow = ({ data, index, style }) => {
  const item = data[index];
  return (
    <div style={style} key={item.name}>
      <UploadStatusItem
        variant={getProgressVariant(item.uploadState)}
        progress={(item.loaded / item.total) * 100}
        fileName={item.name}
        fileSize={humanizeBinaryBytes(item.total).string}
        onAbort={item.abort}
        failed={item.uploadState === UploadStatus.UPLOAD_FAILED}
      />
    </div>
  );
};

export const UploadStatusList: React.FC<UploadStatusListProps> = ({
  progress,
}) => {
  return (
    <AutoSizer>
      {({ height, width }) => (
        <List
          height={height}
          itemCount={progress.length}
          itemData={progress}
          itemSize={100}
          width={width}
        >
          {UploadStatusListRow}
        </List>
      )}
    </AutoSizer>
  );
};
