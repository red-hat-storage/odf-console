import * as React from 'react';
import { DeleteIndexCommandOutput } from '@aws-sdk/client-s3vectors';
import { VectorCrFormat } from '@odf/core/types/s3-vectors';
import { ButtonBar } from '@odf/shared/generic/ButtonBar';
import { CommonModalProps } from '@odf/shared/modals';
import { S3VectorsCommands } from '@odf/shared/s3-vectors';
import { ComposableTable, RowComponentType } from '@odf/shared/table';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { getPageRange, sortRows } from '@odf/shared/utils';
import { TFunction } from 'react-i18next';
import { Trans } from 'react-i18next';
import {
  Modal,
  ModalVariant,
  Button,
  ButtonVariant,
  TextInput,
  TextInputTypes,
  FormGroup,
  Pagination,
  PaginationVariant,
} from '@patternfly/react-core';
import { Tr, Td, TableVariant } from '@patternfly/react-table';

const DELETE = 'delete';

export type VectorIndexesDeleteResponse = {
  selectedIndexes: VectorCrFormat[];
  deleteResponse: DeleteIndexCommandOutput;
};

export type SetVectorIndexesDeleteResponse = React.Dispatch<
  React.SetStateAction<VectorIndexesDeleteResponse>
>;

type DeleteVectorIndexesModalProps = {
  vectorBucketName: string;
  s3VectorsClient: S3VectorsCommands;
  indexes: VectorCrFormat[];
  setDeleteResponse: SetVectorIndexesDeleteResponse;
  refreshTokens?: () => void;
};

const getTitle = (data: VectorCrFormat[], t: TFunction) =>
  data.length > 1 ? t('Delete indexes?') : t('Delete index?');

const getColumnNames = (t: TFunction) => [t('Name'), t('Created on')];

const getHeaderColumns = (t: TFunction) => [
  {
    columnName: getColumnNames(t)[0],
    sortFunction: (a, b, c) => sortRows(a, b, c, 'metadata.name'),
  },
  {
    columnName: getColumnNames(t)[1],
    sortFunction: (a, b, c) => sortRows(a, b, c, 'metadata.creationTimestamp'),
    thProps: { className: 'pf-v5-u-w-16-on-lg' },
  },
];

const DeleteVectorIndexesTableRow: React.FC<
  RowComponentType<VectorCrFormat>
> = ({ row: indexRow }) => {
  const { t } = useCustomTranslation();
  const columnNames = getColumnNames(t);
  const name = indexRow?.metadata?.name ?? '—';
  const creationDate = indexRow?.metadata?.creationTimestamp
    ? new Date(indexRow.metadata.creationTimestamp).toLocaleDateString()
    : '—';

  return (
    <Tr>
      <Td dataLabel={columnNames[0]}>{name}</Td>
      <Td dataLabel={columnNames[1]}>{creationDate}</Td>
    </Tr>
  );
};

const DeleteVectorIndexesModal: React.FC<
  CommonModalProps<DeleteVectorIndexesModalProps>
> = ({
  closeModal,
  isOpen,
  extraProps: {
    vectorBucketName,
    s3VectorsClient,
    indexes: data,
    setDeleteResponse,
    refreshTokens,
  },
}) => {
  const { t } = useCustomTranslation();

  const [deleteText, setDeleteText] = React.useState<string>('');
  const [inProgress, setInProgress] = React.useState<boolean>(false);
  const [error, setError] = React.useState<Error>();
  const [page, setPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(10);

  const paginatedData = React.useMemo(() => {
    const [start, end] = getPageRange(page, perPage);
    return data.slice(start, end);
  }, [data, page, perPage]);

  const onDelete = async (event: React.FormEvent) => {
    event.preventDefault();
    setInProgress(true);
    setError(undefined);

    try {
      let lastResponse: DeleteIndexCommandOutput | undefined;
      for (const index of data) {
        const indexName = index.metadata?.name;
        if (indexName) {
          // eslint-disable-next-line no-await-in-loop
          lastResponse = await s3VectorsClient.deleteIndex({
            vectorBucketName,
            indexName,
          });
        }
      }

      setDeleteResponse({
        selectedIndexes: data,
        deleteResponse: lastResponse ?? ({} as DeleteIndexCommandOutput),
      });

      setInProgress(false);
      closeModal();
      refreshTokens?.();
    } catch (err) {
      setInProgress(false);
      setError(err as Error);
    }
  };

  return (
    <Modal
      title={getTitle(data, t)}
      titleIconVariant="warning"
      isOpen={isOpen}
      onClose={closeModal}
      description={
        <div className="text-muted">
          {t(
            'Deleted vector indexes cannot be recovered. All vectors in the index will be permanently removed.'
          )}
        </div>
      }
      variant={ModalVariant.medium}
      actions={[
        <ButtonBar
          inProgress={inProgress}
          errorMessage={error?.message || (error && JSON.stringify(error))}
        >
          <span>
            <Button
              variant={ButtonVariant.danger}
              onClick={onDelete}
              isDisabled={deleteText !== DELETE || inProgress || !!error}
              className="pf-v5-u-mr-xs"
            >
              {t('Delete')}
            </Button>
            <Button
              variant={ButtonVariant.link}
              onClick={closeModal}
              className="pf-v5-u-ml-xs"
            >
              {t('Cancel')}
            </Button>
          </span>
        </ButtonBar>,
      ]}
    >
      <div className="pf-v5-u-mb-md">
        <ComposableTable
          columns={getHeaderColumns(t)}
          rows={paginatedData}
          RowComponent={DeleteVectorIndexesTableRow}
          extraProps={{}}
          unfilteredData={data as []}
          loaded={true}
          variant={TableVariant.compact}
        />
        {data.length > 0 && (
          <Pagination
            variant={PaginationVariant.bottom}
            isCompact
            dropDirection="down"
            perPageOptions={[{ title: '10', value: 10 }]}
            className="pf-v5-u-mt-sm"
            itemCount={data.length}
            widgetId="delete-vector-indexes-pagination"
            perPage={perPage}
            page={page}
            onSetPage={(_e, newPage) => setPage(newPage)}
            onPerPageSelect={(_e, newPerPage, newPage) => {
              setPerPage(newPerPage);
              setPage(newPage);
            }}
          />
        )}
      </div>

      <FormGroup
        label={
          <Trans t={t as any}>
            <b>
              To confirm deletion, type <i>{{ delete: DELETE }}</i>:
            </b>
          </Trans>
        }
        fieldId="delete-vector-indexes"
        className="pf-v5-u-mt-lg pf-v5-u-mb-sm"
      >
        <TextInput
          value={deleteText}
          id="delete-vector-indexes"
          onChange={(_event, value) => setDeleteText(value)}
          type={TextInputTypes.text}
          placeholder={DELETE}
        />
      </FormGroup>
    </Modal>
  );
};

export default DeleteVectorIndexesModal;
