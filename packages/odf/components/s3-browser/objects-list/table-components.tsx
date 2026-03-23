import * as React from 'react';
import { S3Commands } from '@odf/shared/s3';
import { RowComponentType } from '@odf/shared/table';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { sortRows } from '@odf/shared/utils';
import { LaunchModal } from '@openshift-console/dynamic-plugin-sdk/lib/app/modal-support/ModalProvider';
import { TFunction } from 'react-i18next';
import { Link } from 'react-router-dom-v5-compat';
import {
  EmptyState,
  EmptyStateVariant,
  EmptyStateBody,
  Spinner,
  Label,
} from '@patternfly/react-core';
import { CubesIcon, FileIcon, FolderIcon } from '@patternfly/react-icons';
import { ActionsColumn, Td, IAction } from '@patternfly/react-table';
import { getBucketOverviewBaseRoute, PREFIX } from '../../../constants';
import { SetObjectsDeleteResponse } from '../../../modals/s3-browser/delete-objects/DeleteObjectsModal';
import { LazyDeleteObjectsModal } from '../../../modals/s3-browser/delete-objects/LazyDeleteModals';
import { ObjectCrFormat, S3ProviderType } from '../../../types';
import { getEncodedPrefix, replacePathFromName } from '../../../utils';
import {
  DownloadAndPreviewState,
  onDownload,
  onPreview,
} from '../download-and-preview/download-and-preview';

const LazyPresignedURLModal = React.lazy(
  () => import('../../../modals/s3-browser/presigned-url/PresignedURLModal')
);

const getColumnNames = (t: TFunction): string[] => [
  t('Name'),
  t('Size'),
  t('Type'),
  t('Last modified'),
  '',
];
const getVersioningColumnName = (t: TFunction): string => t('Version ID');

const getDeleteInlineActionTitle = (
  showVersioning: boolean,
  isDeleteMarker: boolean,
  t: TFunction
) => {
  if (isDeleteMarker) return t('Discard delete marker');

  return showVersioning ? t('Delete this version') : t('Delete');
};

export const getInlineActionsItems = (
  t: TFunction,
  launcher: LaunchModal,
  bucketName: string,
  object: ObjectCrFormat,
  s3Client: S3Commands,
  downloadAndPreview: DownloadAndPreviewState,
  setDownloadAndPreview: React.Dispatch<
    React.SetStateAction<DownloadAndPreviewState>
  >,
  foldersPath: string,
  setDeleteResponse: SetObjectsDeleteResponse,
  refreshTokens: () => Promise<void>,
  closeObjectSidebar: () => void,
  showVersioning: boolean,
  isVersioningEnabledOrSuspended: boolean
): IAction[] => {
  const isDeleteMarker = object?.isDeleteMarker;
  return [
    ...(!isDeleteMarker
      ? [
          {
            title: (
              <>
                {downloadAndPreview.isDownloading
                  ? t('Downloading')
                  : t('Download')}
                {downloadAndPreview.isDownloading && <Spinner size="sm" />}
              </>
            ),
            onClick: () =>
              onDownload(
                bucketName,
                object,
                s3Client,
                setDownloadAndPreview,
                showVersioning
              ),
            isDisabled: downloadAndPreview.isDownloading,
            shouldCloseOnClick: false,
          },
        ]
      : []),
    ...(!isDeleteMarker
      ? [
          {
            title: (
              <>
                {downloadAndPreview.isPreviewing
                  ? t('Previewing')
                  : t('Preview')}
                {downloadAndPreview.isPreviewing && <Spinner size="sm" />}
              </>
            ),
            onClick: () =>
              onPreview(
                bucketName,
                object,
                s3Client,
                setDownloadAndPreview,
                showVersioning
              ),
            isDisabled: downloadAndPreview.isPreviewing,
            shouldCloseOnClick: false,
          },
        ]
      : []),
    ...(!isDeleteMarker
      ? [
          {
            title: t('Share with presigned URL'),
            onClick: () =>
              launcher(LazyPresignedURLModal, {
                isOpen: true,
                extraProps: { bucketName, object, s3Client, showVersioning },
              }),
            isDisabled: isDeleteMarker,
          },
        ]
      : []),
    {
      title: getDeleteInlineActionTitle(showVersioning, isDeleteMarker, t),
      onClick: () =>
        launcher(LazyDeleteObjectsModal, {
          isOpen: true,
          extraProps: {
            foldersPath,
            bucketName,
            objects: [object],
            s3Client,
            setDeleteResponse,
            refreshTokens,
            closeObjectSidebar,
            showVersioning,
            isVersioningEnabledOrSuspended,
          },
        }),
      ...(isDeleteMarker && {
        description: t('Delete this marker to restore object'),
      }),
    },
  ];
};

export const isRowSelectable = (row: ObjectCrFormat) => !row.isFolder;

export const getColumns = (t: TFunction, showVersioning: boolean) => {
  const columnNames = getColumnNames(t);
  const versioningColumnName = getVersioningColumnName(t);

  return [
    {
      columnName: columnNames[0],
      sortFunction: (a, b, c) => sortRows(a, b, c, 'metadata.name'),
    },
    ...(showVersioning
      ? [
          {
            columnName: versioningColumnName,
            sortFunction: (a, b, c) =>
              sortRows(a, b, c, 'apiResponse.versionId'),
          },
        ]
      : []),
    {
      columnName: columnNames[1],
      sortFunction: (a, b, c) => sortRows(a, b, c, 'apiResponse.size'),
    },
    {
      columnName: columnNames[2],
      sortFunction: (a, b, c) => sortRows(a, b, c, 'type'),
    },
    {
      columnName: columnNames[3],
      sortFunction: (a, b, c) => sortRows(a, b, c, 'apiResponse.lastModified'),
    },
    { columnName: columnNames[4] },
  ];
};

export const TableRow: React.FC<RowComponentType<ObjectCrFormat>> = ({
  row: object,
  extraProps,
}) => {
  const { t } = useCustomTranslation();

  const [downloadAndPreview, setDownloadAndPreview] =
    React.useState<DownloadAndPreviewState>({
      isDownloading: false,
      isPreviewing: false,
    });

  const actionItemsRef = React.useRef<IAction[]>();

  const {
    launcher,
    bucketName,
    foldersPath,
    s3Client,
    setDeleteResponse,
    refreshTokens,
    onRowClick,
    closeObjectSidebar,
    showVersioning,
    isVersioningEnabledOrSuspended,
  } = extraProps;
  const isFolder = object.isFolder;
  const name = replacePathFromName(object, foldersPath);
  const prefix = getEncodedPrefix(name, foldersPath);
  const isLatest = object?.isLatest;
  const isDeleteMarker = object?.isDeleteMarker;
  const providerType = s3Client.providerType as S3ProviderType;

  const columnNames = getColumnNames(t);
  const versioningColumnName = getVersioningColumnName(t);

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
    showVersioning,
    isVersioningEnabledOrSuspended
  );
  actionItemsRef.current = actionItems;

  const onClick = () =>
    onRowClick(object, actionItemsRef, {
      setDeleteResponse,
      refreshTokens,
      closeObjectSidebar,
    });

  return (
    <>
      <Td dataLabel={columnNames[0]} onClick={onClick}>
        {isFolder ? (
          <Link
            to={`${getBucketOverviewBaseRoute(bucketName, providerType)}?${PREFIX}=${prefix}`}
          >
            <span>
              <FolderIcon className="pf-v6-u-mr-xs" />
              {name}
            </span>
          </Link>
        ) : (
          <span>
            <FileIcon className="pf-v6-u-mr-xs" />
            {name}
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
        )}
      </Td>
      {showVersioning && (
        <Td dataLabel={versioningColumnName} onClick={onClick}>
          {object.apiResponse.versionId}
        </Td>
      )}
      <Td dataLabel={columnNames[1]} onClick={onClick}>
        {object.apiResponse.size}
      </Td>
      <Td dataLabel={columnNames[2]} onClick={onClick}>
        {object.type}
      </Td>
      <Td dataLabel={columnNames[3]} onClick={onClick}>
        {object.apiResponse.lastModified}
      </Td>
      <Td dataLabel={columnNames[4]} isActionCell>
        {isFolder ? null : <ActionsColumn items={actionItems} />}
      </Td>
    </>
  );
};

export const EmptyPage: React.FC<{}> = () => {
  const { t } = useCustomTranslation();

  return (
    <EmptyState
      headingLevel="h4"
      icon={CubesIcon}
      titleText={t('No objects found')}
      variant={EmptyStateVariant.lg}
    >
      <EmptyStateBody>
        {t('You do not have any objects in this bucket')}
      </EmptyStateBody>
    </EmptyState>
  );
};
