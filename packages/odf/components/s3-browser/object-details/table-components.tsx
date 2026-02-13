import * as React from 'react';
import { RowComponentType } from '@odf/shared/table';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { TFunction } from 'react-i18next';
import { Label } from '@patternfly/react-core';
import { Tr, Td, ActionsColumn } from '@patternfly/react-table';
import { ObjectCrFormat } from '../../../types';
import { DownloadAndPreviewState } from '../download-and-preview/download-and-preview';
import { getInlineActionsItems } from '../objects-list/table-components';

export const getColumnNames = (t: TFunction) => [
  t('Version ID'),
  t('Size'),
  t('Last modified'),
  '',
];

export const getHeaderColumns = (t: TFunction) => {
  const columnNames = getColumnNames(t);

  return [
    { columnName: columnNames[0] },
    { columnName: columnNames[1] },
    { columnName: columnNames[2] },
    { columnName: columnNames[3] },
  ];
};

export const ObjectVersionsTableRow: React.FC<
  RowComponentType<ObjectCrFormat>
> = ({ row: object, extraProps }) => {
  const { t } = useCustomTranslation();

  const {
    launcher,
    bucketName,
    s3Client,
    foldersPath,
    setDeleteResponse,
    refreshTokens,
    closeObjectSidebar,
  } = extraProps;

  const [downloadAndPreview, setDownloadAndPreview] =
    React.useState<DownloadAndPreviewState>({
      isDownloading: false,
      isPreviewing: false,
    });

  const isLatest = object?.isLatest;
  const isDeleteMarker = object?.isDeleteMarker;
  const columnNames = getColumnNames(t);
  const actionItems = getInlineActionsItems(
    t,
    launcher,
    bucketName,
    object,
    s3Client,
    downloadAndPreview,
    setDownloadAndPreview,
    foldersPath,
    setDeleteResponse,
    refreshTokens,
    closeObjectSidebar,
    true,
    undefined
  );

  return (
    <Tr>
      <Td dataLabel={columnNames[0]}>
        <span>
          {object.apiResponse.versionId}
          {isLatest && (
            <Label color="purple" className="pf-v6-u-ml-xs" isCompact>
              {t('Latest')}
            </Label>
          )}
          {isDeleteMarker && (
            <Label color="purple" className="pf-v6-u-ml-xs" isCompact>
              {t('Delete marker')}
            </Label>
          )}
        </span>
      </Td>
      <Td dataLabel={columnNames[1]}>{object.apiResponse.size}</Td>
      <Td dataLabel={columnNames[2]}>{object.apiResponse.lastModified}</Td>
      <Td dataLabel={columnNames[3]} isActionCell>
        <ActionsColumn items={actionItems} />
      </Td>
    </Tr>
  );
};
