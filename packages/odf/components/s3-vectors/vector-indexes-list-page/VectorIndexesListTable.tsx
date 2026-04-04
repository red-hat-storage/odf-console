import * as React from 'react';
import { getVectorIndexDetailsRoute } from '@odf/core/constants/s3-vectors';
import { SetVectorIndexesDeleteResponse } from '@odf/core/modals/s3-vectors/delete-vector-index/DeleteVectorIndexModal';
import { LazyDeleteVectorIndexModal } from '@odf/core/modals/s3-vectors/delete-vector-index/lazy-delete-vector-index';
import { S3ProviderType } from '@odf/core/types';
import {
  useCustomTranslation,
  DASH,
  RowComponentType,
  TableColumnProps,
  EmptyPage,
  ComposableTable,
  getName,
  getCreationTimestamp,
} from '@odf/shared';
import { Timestamp } from '@odf/shared/details-page/timestamp';
import { S3VectorsCommands } from '@odf/shared/s3-vectors';
import { sortRows } from '@odf/shared/utils';
import {
  K8sResourceCommon,
  useModal,
} from '@openshift-console/dynamic-plugin-sdk';
import { LaunchModal } from '@openshift-console/dynamic-plugin-sdk/lib/app/modal-support/ModalProvider';
import { TFunction } from 'react-i18next';
import { Link } from 'react-router-dom-v5-compat';
import {
  ActionsColumn,
  IAction,
  TableVariant,
  Td,
  Tr,
} from '@patternfly/react-table';

const getRowActions = (
  t: TFunction<string>,
  launcher: LaunchModal,
  vectorBucketName: string,
  indexName: string,
  s3VectorsClient: S3VectorsCommands,
  triggerRefresh: () => void,
  setDeleteResponse?: SetVectorIndexesDeleteResponse
): IAction[] => [
  {
    title: t('Delete index'),
    onClick: () =>
      launcher(LazyDeleteVectorIndexModal, {
        isOpen: true,
        extraProps: {
          indexName,
          vectorBucketName,
          s3VectorsClient,
          refreshTokens: triggerRefresh,
          setDeleteResponse,
        },
      }),
  },
];

const getColumnNames = (t: TFunction<string>): string[] => [
  t('Name'),
  t('Created on'),
  '',
];

const getHeaderColumns = (t: TFunction<string>): TableColumnProps[] => {
  const columnNames = getColumnNames(t);
  return [
    {
      columnName: columnNames[0],
      sortFunction: (a, b, c) => sortRows(a, b, c, 'metadata.name'),
    },
    {
      columnName: columnNames[1],
      sortFunction: (a, b, c) =>
        sortRows(a, b, c, 'metadata.creationTimestamp'),
      thProps: { className: 'pf-v6-u-w-16-on-lg' },
    },
    {
      columnName: columnNames[2],
    },
  ];
};

const EmptyRowMessage: React.FC = () => {
  const { t } = useCustomTranslation();
  return (
    <EmptyPage
      ButtonComponent={() => null}
      title={t('No vector indexes found')}
      isLoaded
      canAccess
    >
      {t('You do not have any vector indexes in this bucket.')}
    </EmptyPage>
  );
};

const VectorIndexTableRow: React.FC<RowComponentType<K8sResourceCommon>> = ({
  row: indexRow,
  rowIndex,
  extraProps,
}) => {
  const { t } = useCustomTranslation();
  const columnNames = getColumnNames(t);
  const {
    vectorBucketName,
    providerType,
    launcher,
    s3VectorsClient,
    triggerRefresh,
    setDeleteResponse,
  }: RowExtraPropsType = extraProps;
  const indexResourceName = getName(indexRow);
  const indexName = indexResourceName || DASH;
  const creationTimestamp = getCreationTimestamp(indexRow);

  const detailsPath = getVectorIndexDetailsRoute(
    vectorBucketName,
    indexName,
    providerType
  );

  return (
    <Tr key={rowIndex}>
      <Td dataLabel={columnNames[0]}>
        <Link to={detailsPath} state={{ index: indexRow }}>
          {indexName}
        </Link>
      </Td>
      <Td dataLabel={columnNames[1]}>
        {creationTimestamp ? (
          <Timestamp timestamp={creationTimestamp} ignoreRelativeTime />
        ) : (
          DASH
        )}
      </Td>
      <Td dataLabel={columnNames[2]} isActionCell>
        {indexResourceName ? (
          <ActionsColumn
            items={getRowActions(
              t,
              launcher,
              vectorBucketName,
              indexResourceName,
              s3VectorsClient,
              triggerRefresh,
              setDeleteResponse
            )}
          />
        ) : null}
      </Td>
    </Tr>
  );
};

export const VectorIndexesListTable: React.FC<VectorIndexesListTableProps> = ({
  allVectorIndexes,
  filteredVectorIndexes,
  loaded,
  error,
  vectorBucketName,
  s3VectorsClient,
  triggerRefresh,
  setDeleteResponse,
}) => {
  const { t } = useCustomTranslation();
  const launcher = useModal();
  const providerType = s3VectorsClient.providerType as S3ProviderType;

  return (
    <ComposableTable
      rows={filteredVectorIndexes ?? []}
      columns={getHeaderColumns(t)}
      RowComponent={VectorIndexTableRow}
      noDataMsg={EmptyRowMessage}
      emptyRowMessage={EmptyRowMessage}
      unfilteredData={allVectorIndexes as []}
      loaded={loaded}
      loadError={error}
      variant={TableVariant.compact}
      extraProps={{
        launcher,
        vectorBucketName,
        s3VectorsClient,
        triggerRefresh,
        setDeleteResponse,
        providerType,
      }}
    />
  );
};

type VectorIndexesListTableProps = {
  allVectorIndexes: K8sResourceCommon[];
  filteredVectorIndexes: K8sResourceCommon[];
  loaded: boolean;
  error: Error | undefined;
  vectorBucketName: string;
  s3VectorsClient: S3VectorsCommands;
  triggerRefresh: () => void;
  setDeleteResponse?: SetVectorIndexesDeleteResponse;
};

type RowExtraPropsType = {
  launcher: LaunchModal;
  vectorBucketName: string;
  s3VectorsClient: S3VectorsCommands;
  triggerRefresh: () => void;
  setDeleteResponse?: SetVectorIndexesDeleteResponse;
  providerType: S3ProviderType;
};
