import * as React from 'react';
import { humanizeBinaryBytes } from '@odf/shared/utils';
import { observer } from 'mobx-react-lite';
import { AutoSizer } from 'react-virtualized-auto-sizer';
import { List, RowComponentProps } from 'react-window';
import { uploadStore } from '../store';
import { UploadProgress, UploadStatus } from '../types';
import { UploadStatusItem } from './UploadStatusItem';

type UploadStatusListProps = {
  currentWidth?: number;
};

type RowProps = {
  items: UploadProgress[];
};

const UploadStatusListRow = observer(
  ({ items, index, style }: RowComponentProps<RowProps>) => {
    const item = uploadStore.getFile(items[index].key);
    return (
      <div style={style} key={item.key}>
        <UploadStatusItem
          progress={(item.loaded / item.total) * 100}
          fileName={item.name}
          fileSize={humanizeBinaryBytes(item.total).string}
          failed={
            item.uploadState === UploadStatus.UPLOAD_FAILED ||
            item.uploadState === UploadStatus.UPLOAD_CANCELLED
          }
          itemKey={item.key}
        />
      </div>
    );
  }
);

export const UploadStatusList: React.FC<UploadStatusListProps> = observer(
  () => {
    const items = Array.from(Object.values(uploadStore.getAll));
    return (
      <AutoSizer
        renderProp={({ height, width }) => (
          <List<RowProps>
            rowComponent={UploadStatusListRow}
            rowCount={items.length}
            rowProps={{ items }}
            rowHeight={100}
            style={{ height, width }}
          />
        )}
      />
    );
  }
);
