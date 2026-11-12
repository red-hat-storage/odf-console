import * as React from 'react';
import {
  GetObjectLockConfigurationCommandOutput,
  ObjectLockLegalHoldStatus,
} from '@aws-sdk/client-s3';
import { getName } from '@odf/shared';
import {
  getIsObjectLockEnabled,
  isNoObjectLockConfigurationError,
} from '@odf/shared/s3/utils';
import { RowComponentType } from '@odf/shared/table';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { TFunction } from 'i18next';
import useSWR from 'swr';
import { Label } from '@patternfly/react-core';
import { Tr, Td, ActionsColumn } from '@patternfly/react-table';
import {
  BUCKET_OBJECT_LOCK_CACHE_KEY_SUFFIX,
  getObjectVersionedCacheKey,
  OBJECT_LEGAL_HOLD_CACHE_KEY_SUFFIX,
  OBJECT_RETENTION_CACHE_KEY_SUFFIX,
} from '../../../constants';
import { ObjectCrFormat } from '../../../types';
import { getObjectVersionId } from '../../../utils';
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
    blockDataPath = false,
  } = extraProps;

  const [downloadAndPreview, setDownloadAndPreview] =
    React.useState<DownloadAndPreviewState>({
      isDownloading: false,
      isPreviewing: false,
    });

  const isLatest = object?.isLatest;
  const isDeleteMarker = object?.isDeleteMarker;
  const objectKey = getName(object);
  const versionId = getObjectVersionId(object);

  // Bucket-level Object Lock check (SWR-deduped). Per-object retention /
  // legal-hold fetches only run when Object Lock is enabled.
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
    isDeleteMarker || !isObjectLockEnabled
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
    isDeleteMarker || !isObjectLockEnabled
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
    undefined,
    blockDataPath,
    isObjectLockEnabled,
    retentionData?.Retention,
    retentionMutate,
    isLegalHoldApplied,
    legalHoldMutate
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
