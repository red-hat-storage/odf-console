import * as React from 'react';
import { S3Commands } from '@odf/shared/s3';
import { RowComponentType } from '@odf/shared/table';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { sortRows } from '@odf/shared/utils';
import { LaunchModal } from '@openshift-console/dynamic-plugin-sdk/lib/app/modal-support/ModalProvider';
import { TFunction } from 'i18next';
import { Link } from 'react-router';
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
import { LazyRestoreObjectModal } from '../../../modals/s3-browser/restore-object/LazyRestoreObjectModal';
import { ObjectCrFormat, S3ProviderType } from '../../../types';
import {
  getEncodedPrefix,
  replacePathFromName,
  getStorageClassDisplayName,
  getRestoreStatusText,
  isObjectDeepArchived,
  isObjectRestored,
  isObjectRestoreInProgress,
} from '../../../utils';
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
  t('Storage class'),
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
  isVersioningEnabledOrSuspended: boolean,
  blockDataPath = false
): IAction[] => {
  const isDeleteMarker = object?.isDeleteMarker;
  // Deep Archive objects must be restored before their data can be read.
  // Until the restore completes (and the temporary copy is available), data
  // operations (download / preview / share) are unavailable.
  const isDeepArchived = isObjectDeepArchived(object);
  const isRestored = isObjectRestored(object);
  const isRestoreInProgress = isObjectRestoreInProgress(object);
  // Archived and not yet available for download (either not started or running).
  const needsRestore = isDeepArchived && !isRestored;
  // A restore can be initiated only when nothing is running/available yet.
  const canInitiateRestore =
    isDeepArchived && !isRestored && !isRestoreInProgress;
  const archivedDataOpDescription = isRestoreInProgress
    ? t('Object restore is in progress. Available once restore completes.')
    : t('Object is archived. Restore it before performing this action.');
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
            isDisabled:
              blockDataPath || downloadAndPreview.isDownloading || needsRestore,
            ...(needsRestore && { description: archivedDataOpDescription }),
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
            isDisabled:
              blockDataPath || downloadAndPreview.isPreviewing || needsRestore,
            ...(needsRestore && { description: archivedDataOpDescription }),
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
            isDisabled: blockDataPath || isDeleteMarker || needsRestore,
            ...(needsRestore && { description: archivedDataOpDescription }),
          },
        ]
      : []),
    ...(canInitiateRestore
      ? [
          {
            title: t('Restore'),
            onClick: () =>
              launcher(LazyRestoreObjectModal, {
                isOpen: true,
                extraProps: {
                  bucketName,
                  object,
                  s3Client,
                  showVersioning,
                  refreshTokens,
                },
              }),
            isDisabled: blockDataPath,
            description: t(
              'Restore this Deep Archive object to make it downloadable.'
            ),
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
    {
      columnName: columnNames[4],
      sortFunction: (a, b, c) => sortRows(a, b, c, 'apiResponse.storageClass'),
    },
    { columnName: columnNames[5] },
  ];
};

// Renders the storage class primary value (shown as fetched, e.g. STANDARD /
// DEEP_ARCHIVE, blank when none) with the restore status as muted secondary
// text ("Archived" / "Restoring…" / "Restored until <date>") for Deep Archive
// objects.
const StorageClassCell: React.FC<{ object: ObjectCrFormat }> = ({ object }) => {
  const { t } = useCustomTranslation();
  const displayName = getStorageClassDisplayName(
    object?.apiResponse?.storageClass
  );
  const restoreStatusText = getRestoreStatusText(object, t);

  return (
    <>
      <div>{displayName}</div>
      {!!restoreStatusText && (
        <div className="pf-v6-u-color-200 pf-v6-u-font-size-sm">
          {restoreStatusText}
        </div>
      )}
    </>
  );
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
    blockDataPath,
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
    isVersioningEnabledOrSuspended,
    blockDataPath
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
      <Td dataLabel={columnNames[4]} onClick={onClick}>
        {isFolder ? null : <StorageClassCell object={object} />}
      </Td>
      <Td dataLabel={columnNames[5]} isActionCell>
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
