import * as React from 'react';
import {
  GetObjectLegalHoldCommandOutput,
  GetObjectLockConfigurationCommandOutput,
  GetObjectRetentionCommandOutput,
  ObjectLockLegalHoldStatus,
  ObjectLockRetention,
} from '@aws-sdk/client-s3';
import { getName } from '@odf/shared';
import { S3Commands } from '@odf/shared/s3';
import {
  getIsObjectLockEnabled,
  getRetentionPeriodFromDate,
  isNoObjectLockConfigurationError,
} from '@odf/shared/s3/utils';
import { RowComponentType } from '@odf/shared/table';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { sortRows } from '@odf/shared/utils';
import { LaunchModal } from '@openshift-console/dynamic-plugin-sdk/lib/app/modal-support/ModalProvider';
import { TFunction } from 'i18next';
import { Link } from 'react-router';
import useSWR, { KeyedMutator } from 'swr';
import {
  EmptyState,
  EmptyStateVariant,
  EmptyStateBody,
  Spinner,
  Label,
} from '@patternfly/react-core';
import { CubesIcon, FileIcon, FolderIcon } from '@patternfly/react-icons';
import { ActionsColumn, Td, IAction } from '@patternfly/react-table';
import {
  BUCKET_OBJECT_LOCK_CACHE_KEY_SUFFIX,
  getBucketOverviewBaseRoute,
  getObjectVersionedCacheKey,
  OBJECT_LEGAL_HOLD_CACHE_KEY_SUFFIX,
  OBJECT_RETENTION_CACHE_KEY_SUFFIX,
  PREFIX,
} from '../../../constants';
import { ApplyLegalHoldModalProps } from '../../../modals/s3-browser/apply-legal-hold/ApplyLegalHoldModal';
import { SetObjectsDeleteResponse } from '../../../modals/s3-browser/delete-objects/DeleteObjectsModal';
import { LazyDeleteObjectsModal } from '../../../modals/s3-browser/delete-objects/LazyDeleteModals';
import { RemoveLegalHoldModalProps } from '../../../modals/s3-browser/remove-legal-hold/RemoveLegalHoldModal';
import {
  RetentionPeriodUnit,
  SetObjectRetentionModalProps,
} from '../../../modals/s3-browser/set-object-retention/SetObjectRetentionModal';
import { ObjectCrFormat, S3ProviderType } from '../../../types';
import {
  getEncodedPrefix,
  replacePathFromName,
  getObjectVersionId,
  isObjectDeepArchived,
  isObjectRestored,
} from '../../../utils';
import {
  DownloadAndPreviewState,
  onDownload,
  onPreview,
} from '../download-and-preview/download-and-preview';

const LazyPresignedURLModal = React.lazy(
  () => import('../../../modals/s3-browser/presigned-url/PresignedURLModal')
);

const LazySetObjectRetentionModal = React.lazy(
  () =>
    import('../../../modals/s3-browser/set-object-retention/SetObjectRetentionModal')
);

const LazyApplyLegalHoldModal = React.lazy(
  () =>
    import('../../../modals/s3-browser/apply-legal-hold/ApplyLegalHoldModal')
);

const LazyRemoveLegalHoldModal = React.lazy(
  () =>
    import('../../../modals/s3-browser/remove-legal-hold/RemoveLegalHoldModal')
);

const getColumnNames = (t: TFunction): string[] => [
  t('Name'),
  t('Size'),
  t('Type'),
  t('Storage class'),
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

const getRetentionActionDescription = (
  t: TFunction,
  objectRetention?: ObjectLockRetention
) => {
  const baseDescription = t(
    'Set a retention mode and period to protect this object from deletion or overwrite.'
  );

  if (!objectRetention?.RetainUntilDate) {
    return baseDescription;
  }

  const modeLabel = objectRetention.Mode
    ? objectRetention.Mode.charAt(0) +
      objectRetention.Mode.slice(1).toLowerCase()
    : '';
  const { period, unit } = getRetentionPeriodFromDate(
    objectRetention.RetainUntilDate
  );
  const unitLabel = unit === 'Years' ? t('years') : t('days');

  return t(
    '{{mode}} expires in {{period}} {{unit}}. Set a retention mode and period to protect this object from deletion or overwrite.',
    {
      mode: modeLabel,
      period,
      unit: unitLabel,
    }
  );
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
  blockDataPath = false,
  isObjectLockEnabled = false,
  objectRetention?: ObjectLockRetention,
  retentionMutate?: KeyedMutator<GetObjectRetentionCommandOutput>,
  isLegalHoldApplied = false,
  legalHoldMutate?: KeyedMutator<GetObjectLegalHoldCommandOutput>
): IAction[] => {
  const isDeleteMarker = object?.isDeleteMarker;
  // Deep Archive objects must be restored before their data can be read, so
  // data operations (download / preview / share) stay unavailable until a
  // usable restored copy exists. Restoring is not offered from the UI yet; it
  // will be introduced in a later release.
  const needsRestore =
    isObjectDeepArchived(object) && !isObjectRestored(object);
  const versionId = getObjectVersionId(object);
  const objectKey = getName(object);
  const { period: retentionPeriod, unit: retentionPeriodUnitValue } =
    objectRetention?.RetainUntilDate
      ? getRetentionPeriodFromDate(objectRetention.RetainUntilDate)
      : { period: undefined, unit: undefined };
  const retentionPeriodUnit =
    retentionPeriodUnitValue === 'Years'
      ? RetentionPeriodUnit.YEARS
      : RetentionPeriodUnit.DAYS;

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
          },
        ]
      : []),
    ...(!isDeleteMarker && isObjectLockEnabled
      ? [
          {
            title: t('Object locking'),
            isDisabled: true,
          },
          {
            title: t('Set Retention'),
            description: getRetentionActionDescription(t, objectRetention),
            onClick: () =>
              launcher(LazySetObjectRetentionModal, {
                isOpen: true,
                extraProps: {
                  bucketName,
                  objectKey,
                  versionId: showVersioning ? versionId : undefined,
                  s3Client,
                  mutate: retentionMutate,
                  onConfirm: () => retentionMutate?.(),
                  ...(objectRetention && {
                    currentRetentionMode: objectRetention.Mode,
                    currentRetentionPeriod: retentionPeriod,
                    currentRetentionPeriodUnit: retentionPeriodUnit,
                    currentRetainUntilDate: objectRetention.RetainUntilDate,
                  }),
                } as SetObjectRetentionModalProps,
              }),
          },
          {
            title: isLegalHoldApplied
              ? t('Remove legal hold')
              : t('Apply legal hold'),
            description: t(
              'Legal hold prevents an object version from being overwritten or deleted until explicitly removed.'
            ),
            onClick: () => {
              if (isLegalHoldApplied) {
                launcher(LazyRemoveLegalHoldModal, {
                  isOpen: true,
                  extraProps: {
                    bucketName,
                    objectKey,
                    versionId: showVersioning ? versionId : undefined,
                    s3Client,
                    mutate: legalHoldMutate,
                    onConfirm: () => legalHoldMutate?.(),
                  } as RemoveLegalHoldModalProps,
                });
                return;
              }
              launcher(LazyApplyLegalHoldModal, {
                isOpen: true,
                extraProps: {
                  bucketName,
                  objectKey,
                  versionId: showVersioning ? versionId : undefined,
                  s3Client,
                  mutate: legalHoldMutate,
                  onConfirm: () => legalHoldMutate?.(),
                } as ApplyLegalHoldModalProps,
              });
            },
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
      thProps: { modifier: 'nowrap' as const },
      sortFunction: (a, b, c) => sortRows(a, b, c, 'apiResponse.storageClass'),
    },
    {
      columnName: columnNames[4],
      sortFunction: (a, b, c) => sortRows(a, b, c, 'apiResponse.lastModified'),
    },
    { columnName: columnNames[5] },
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
    blockDataPath,
  } = extraProps;
  const isFolder = object.isFolder;
  const name = replacePathFromName(object, foldersPath);
  const prefix = getEncodedPrefix(name, foldersPath);
  const isLatest = object?.isLatest;
  const isDeleteMarker = object?.isDeleteMarker;
  const providerType = s3Client.providerType as S3ProviderType;
  const objectKey = getName(object);
  const versionId = getObjectVersionId(object);

  // Bucket-level Object Lock check (SWR-deduped across rows). Per-object
  // retention/legal-hold fetches only run when Object Lock is enabled.
  const { data: objectLockData } = useSWR(
    `${s3Client.providerType}-${bucketName}-${BUCKET_OBJECT_LOCK_CACHE_KEY_SUFFIX}`,
    () =>
      s3Client
        .getObjectLockConfiguration({ Bucket: bucketName })
        .catch((err) => {
          if (isNoObjectLockConfigurationError(err)) {
            return {} as GetObjectLockConfigurationCommandOutput;
          }
          throw err;
        })
  );
  const isObjectLockEnabled = getIsObjectLockEnabled(objectLockData);

  const { data: retentionData, mutate: retentionMutate } = useSWR(
    isFolder || isDeleteMarker || !isObjectLockEnabled
      ? null
      : getObjectVersionedCacheKey(
          s3Client.providerType,
          bucketName,
          objectKey,
          versionId,
          OBJECT_RETENTION_CACHE_KEY_SUFFIX
        ),
    async () => {
      try {
        return await s3Client.getObjectRetention({
          Bucket: bucketName,
          Key: objectKey,
          ...(versionId && { VersionId: versionId }),
        });
      } catch (err) {
        if (
          ['NoSuchObjectLockConfiguration', 'InvalidRequest'].includes(
            err?.name
          )
        ) {
          return null;
        }
        throw err;
      }
    }
  );

  const { data: legalHoldData, mutate: legalHoldMutate } = useSWR(
    isFolder || isDeleteMarker || !isObjectLockEnabled
      ? null
      : getObjectVersionedCacheKey(
          s3Client.providerType,
          bucketName,
          objectKey,
          versionId,
          OBJECT_LEGAL_HOLD_CACHE_KEY_SUFFIX
        ),
    async () => {
      try {
        return await s3Client.getObjectLegalHold({
          Bucket: bucketName,
          Key: objectKey,
          ...(versionId && { VersionId: versionId }),
        });
      } catch (err) {
        if (err?.name === 'InvalidRequest') {
          return null;
        }
        throw err;
      }
    }
  );
  const isLegalHoldApplied =
    legalHoldData?.LegalHold?.Status === ObjectLockLegalHoldStatus.ON;

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
    blockDataPath,
    isObjectLockEnabled,
    retentionData?.Retention,
    retentionMutate,
    isLegalHoldApplied,
    legalHoldMutate
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
        {object.apiResponse.storageClass}
      </Td>
      <Td dataLabel={columnNames[4]} onClick={onClick}>
        {object.apiResponse.lastModified}
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
