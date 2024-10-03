import * as React from 'react';
import { S3Commands } from '@odf/shared/s3';
import { getName } from '@odf/shared/selectors';
import { RowComponentType } from '@odf/shared/table';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { sortRows } from '@odf/shared/utils';
import { LaunchModal } from '@openshift-console/dynamic-plugin-sdk/lib/app/modal-support/ModalProvider';
import { TFunction } from 'i18next';
import { Link } from 'react-router-dom-v5-compat';
import {
  EmptyState,
  EmptyStateVariant,
  EmptyStateIcon,
  EmptyStateBody,
  EmptyStateHeader,
  EmptyStateFooter,
} from '@patternfly/react-core';
import { CubesIcon } from '@patternfly/react-icons';
import { ActionsColumn, Td, IAction } from '@patternfly/react-table';
import { BUCKETS_BASE_ROUTE, PREFIX } from '../../../constants';
import { ObjectCrFormat } from '../../../types';
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

const getInlineActionsItems = (
  t: TFunction,
  launcher: LaunchModal,
  bucketName: string,
  object: ObjectCrFormat,
  noobaaS3: S3Commands,
  downloadAndPreview: DownloadAndPreviewState,
  setDownloadAndPreview: React.Dispatch<
    React.SetStateAction<DownloadAndPreviewState>
  >
): IAction[] => [
  // ToDo: add inline delete option
  {
    title: t('Download'),
    onClick: () =>
      onDownload(bucketName, object, noobaaS3, setDownloadAndPreview),
    isDisabled: downloadAndPreview.isDownloading,
  },
  {
    title: t('Preview'),
    onClick: () =>
      onPreview(bucketName, object, noobaaS3, setDownloadAndPreview),
    isDisabled: downloadAndPreview.isPreviewing,
  },
  {
    title: t('Share with presigned URL'),
    onClick: () =>
      launcher(LazyPresignedURLModal, {
        isOpen: true,
        extraProps: { bucketName, object, noobaaS3 },
      }),
  },
  {
    title: t('Delete'),
    onClick: () => undefined,
  },
];

export const isRowSelectable = (row: ObjectCrFormat) => !row.isFolder;

export const getColumns = (t: TFunction) => {
  const columnNames = getColumnNames(t);

  return [
    {
      columnName: columnNames[0],
      sortFunction: (a, b, c) => sortRows(a, b, c, 'metadata.name'),
    },
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

  const { launcher, bucketName, foldersPath, noobaaS3 } = extraProps;
  const isFolder = object.isFolder;
  const name = getName(object).replace(foldersPath, '');
  const prefix = !!foldersPath
    ? encodeURIComponent(foldersPath + name)
    : encodeURIComponent(name);

  const columnNames = getColumnNames(t);

  return (
    <>
      <Td translate={null} dataLabel={columnNames[0]}>
        {isFolder ? (
          <Link to={`${BUCKETS_BASE_ROUTE}/${bucketName}?${PREFIX}=${prefix}`}>
            {name}
          </Link>
        ) : (
          name
        )}
      </Td>
      <Td translate={null} dataLabel={columnNames[1]}>
        {object.apiResponse.size}
      </Td>
      <Td translate={null} dataLabel={columnNames[2]}>
        {object.type}
      </Td>
      <Td translate={null} dataLabel={columnNames[3]}>
        {object.apiResponse.lastModified}
      </Td>
      <Td translate={null} dataLabel={columnNames[4]} isActionCell>
        {isFolder ? null : (
          <ActionsColumn
            translate={null}
            items={getInlineActionsItems(
              t,
              launcher,
              bucketName,
              object,
              noobaaS3,
              downloadAndPreview,
              setDownloadAndPreview
            )}
          />
        )}
      </Td>
    </>
  );
};

export const EmptyPage: React.FC<{}> = () => {
  const { t } = useCustomTranslation();

  return (
    <EmptyState variant={EmptyStateVariant.lg}>
      <EmptyStateHeader
        titleText={t('No objects found')}
        icon={<EmptyStateIcon icon={CubesIcon} />}
        headingLevel="h4"
      />
      <EmptyStateBody>
        {t('You do not have any objects in the bucket')}
      </EmptyStateBody>
      <EmptyStateFooter>
        {/* ToDo: add upload objects option */}
      </EmptyStateFooter>
    </EmptyState>
  );
};
