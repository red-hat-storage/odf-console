import * as React from 'react';
import { S3VectorsClient } from '@aws-sdk/client-s3vectors';
import { pluralize } from '@odf/core/components/utils';
import {
  getVectorBucketOverviewBaseRoute,
  getVectorIndexDetailsRoute,
} from '@odf/core/constants/s3-vectors';
import { S3ProviderType } from '@odf/core/types';
import { VectorCrFormat } from '@odf/core/types/s3-vectors';
import {
  useCustomTranslation,
  DASH,
  RowComponentType,
  TableColumnProps,
  EmptyPage,
} from '@odf/shared';
import { S3VectorsCommands } from '@odf/shared/s3-vectors';
import { SelectableTable } from '@odf/shared/table';
import { getValidFilteredData, sortRows } from '@odf/shared/utils';
import {
  useListPageFilter,
  ListPageFilter,
  useModal,
  OnFilterChange,
} from '@openshift-console/dynamic-plugin-sdk';
import { LaunchModal } from '@openshift-console/dynamic-plugin-sdk/lib/app/modal-support/ModalProvider';
import { TFunction } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom-v5-compat';
import {
  Alert,
  AlertActionCloseButton,
  AlertVariant,
  Button,
  ButtonVariant,
  Flex,
  FlexItem,
} from '@patternfly/react-core';
import { Td } from '@patternfly/react-table';
import type { VectorIndexesDeleteResponse } from '../../../modals/s3-vectors/delete-vector-indexes/DeleteVectorIndexesModal';
import { LazyDeleteVectorIndexesModal } from '../../../modals/s3-vectors/delete-vector-indexes/LazyDeleteVectorIndexesModal';
import { VectorIndexPagination } from './VectorIndexPagination';

type VectorIndexListType = {
  obj: {
    fresh: boolean;
    triggerRefresh: () => void;
    vectorBucketName: string;
    s3VectorsClient: S3VectorsCommands;
  };
};
type TableActionsProps = {
  launcher: LaunchModal;
  selectedRows: VectorCrFormat[];
  loadedWOError: boolean;
  vectorBucketName: string;
  providerType: S3ProviderType;
  allVectorIndexes: VectorCrFormat[];
  onFilterChange: OnFilterChange;
  s3VectorsClient: S3VectorsCommands;
  setDeleteResponse: SetIndexDeleteResponse;
  refreshTokens: () => void;
};

export type SetIndexDeleteResponse = React.Dispatch<
  React.SetStateAction<VectorIndexesDeleteResponse>
>;

const getColumnNames = (t: TFunction<string>): string[] => [
  t('Name'),
  t('Created on'),
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
      thProps: { className: 'pf-v5-u-w-16-on-lg' },
    },
  ];
};

const getVectorIndexCreateRoute = (
  vectorBucketName: string,
  providerType: S3ProviderType
) =>
  `${getVectorBucketOverviewBaseRoute(vectorBucketName, providerType)}/create-index`;

type DeletionAlertsProps = {
  deleteResponse: VectorIndexesDeleteResponse;
};

export const DeletionAlerts: React.FC<DeletionAlertsProps> = ({
  deleteResponse,
}) => {
  const { t } = useCustomTranslation();

  const [showSuccess, setShowSuccess] = React.useState(true);

  const successCount = deleteResponse?.selectedIndexes?.length ?? 0;
  const shouldShowSuccess = !!successCount && showSuccess;

  React.useEffect(() => {
    if (deleteResponse?.selectedIndexes?.length) {
      setShowSuccess(true);
    }
  }, [deleteResponse]);

  return (
    <>
      {shouldShowSuccess && (
        <Alert
          variant={AlertVariant.success}
          title={pluralize(
            successCount,
            t('Successfully deleted {{ successCount }} vector index.', {
              successCount,
            }),
            t('Successfully deleted {{ successCount }} vector indexes.', {
              successCount,
            }),
            false
          )}
          isInline
          className="pf-v5-u-mb-lg pf-v5-u-mt-sm"
          actionClose={
            <AlertActionCloseButton onClose={() => setShowSuccess(false)} />
          }
        />
      )}
    </>
  );
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

const TableActions: React.FC<TableActionsProps> = ({
  selectedRows,
  loadedWOError,
  launcher,
  vectorBucketName,
  providerType,
  allVectorIndexes,
  onFilterChange,
  s3VectorsClient,
  setDeleteResponse,
  refreshTokens,
}) => {
  const { t } = useCustomTranslation();
  const navigate = useNavigate();

  const anySelection = !!selectedRows.length;

  const onDeleteClick = () =>
    launcher(LazyDeleteVectorIndexesModal, {
      isOpen: true,
      extraProps: {
        vectorBucketName,
        s3VectorsClient,
        indexes: selectedRows,
        setDeleteResponse,
        refreshTokens,
      },
    });

  return (
    <Flex flex={{ default: 'flex_1' }}>
      <FlexItem className="pf-v5-u-mr-md pf-v5-u-display-flex pf-v5-u-align-items-center">
        <ListPageFilter
          loaded={true}
          hideLabelFilter={true}
          nameFilterPlaceholder={t('Find by name')}
          data={getValidFilteredData(allVectorIndexes)}
          onFilterChange={onFilterChange}
        />
      </FlexItem>
      <FlexItem className="pf-v5-u-display-flex pf-v5-u-align-items-center">
        <Button
          variant={ButtonVariant.primary}
          onClick={() =>
            navigate(getVectorIndexCreateRoute(vectorBucketName, providerType))
          }
        >
          {t('Create index')}
        </Button>
      </FlexItem>
      <FlexItem className="pf-v5-u-display-flex pf-v5-u-align-items-center">
        <Button
          variant={ButtonVariant.secondary}
          isDisabled={!anySelection || !loadedWOError}
          onClick={onDeleteClick}
        >
          {t('Delete')}
        </Button>
      </FlexItem>
    </Flex>
  );
};

const VectorIndexTableRow: React.FC<RowComponentType<VectorCrFormat>> = ({
  row: indexRow,
  extraProps,
}) => {
  const { t } = useCustomTranslation();
  const columnNames = getColumnNames(t);
  const { vectorBucketName, providerType }: RowExtraPropsType = extraProps;

  const indexName = indexRow?.metadata?.name ?? DASH;
  const creationDate = indexRow?.metadata?.creationTimestamp
    ? new Date(indexRow.metadata.creationTimestamp).toLocaleDateString()
    : DASH;
  const detailsPath = getVectorIndexDetailsRoute(
    vectorBucketName,
    indexName,
    providerType
  );

  return (
    <>
      <Td dataLabel={columnNames[0]}>
          <Link to={detailsPath} state={{ index: indexRow }}>
            {indexName}
          </Link>
      </Td>
      <Td dataLabel={columnNames[1]}>{creationDate}</Td>
    </>
  );
};

const VectorIndexListPage: React.FC<VectorIndexListType> = ({ obj }) => {
  const { fresh, triggerRefresh, vectorBucketName, s3VectorsClient } = obj;
  const { t } = useCustomTranslation();
  const launcher = useModal();

  const [selectedRows, setSelectedRows] = React.useState<VectorCrFormat[]>([]);
  const [deleteResponse, setDeleteResponse] =
    React.useState<VectorIndexesDeleteResponse>(null);

  const [vectorIndexInfo, setVectorIndexInfo] = React.useState<
    [VectorCrFormat[], boolean, Error | undefined]
  >([[], false, undefined]);

  const [rows, loaded, loadError] = vectorIndexInfo;
  const [allVectorIndexes, filteredVectorIndexes, onFilterChange] =
    useListPageFilter(rows);
  const providerType = S3ProviderType.Noobaa;

  return (
    <>
      <DeletionAlerts deleteResponse={deleteResponse} />
      <Flex className="pf-v5-u-mt-md">
        <TableActions
          selectedRows={selectedRows}
          loadedWOError={loaded && !loadError}
          launcher={launcher}
          vectorBucketName={vectorBucketName}
          providerType={providerType}
          allVectorIndexes={allVectorIndexes}
          onFilterChange={onFilterChange}
          s3VectorsClient={s3VectorsClient}
          setDeleteResponse={setDeleteResponse}
          refreshTokens={triggerRefresh}
        />
        <FlexItem>
          {fresh && (
            <VectorIndexPagination
              vectorBucketName={vectorBucketName}
              setVectorIndexInfo={setVectorIndexInfo}
            />
          )}
        </FlexItem>
      </Flex>
      <SelectableTable
        key={'vector-index-list'}
        className="pf-v5-u-mt-lg"
        columns={getHeaderColumns(t)}
        rows={filteredVectorIndexes ?? []}
        RowComponent={VectorIndexTableRow}
        selectedRows={selectedRows}
        setSelectedRows={setSelectedRows}
        loaded={loaded}
        loadError={loadError}
        extraProps={{
          launcher,
          vectorBucketName,
          s3VectorsClient,
          setDeleteResponse,
          triggerRefresh,
          providerType,
        }}
        emptyRowMessage={EmptyRowMessage}
      />
    </>
  );
};

export default VectorIndexListPage;

type RowExtraPropsType = {
  launcher: LaunchModal;
  vectorBucketName: string;
  s3VectorsClient: S3VectorsClient;
  setDeleteResponse: SetIndexDeleteResponse;
  triggerRefresh: () => void;
  providerType: S3ProviderType;
};
