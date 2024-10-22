import * as React from 'react';
import {
  DeleteObjectsCommandOutput,
  ObjectIdentifier,
} from '@aws-sdk/client-s3';
import { ButtonBar } from '@odf/shared/generic/ButtonBar';
import { PaginatedListPage, ListFilter } from '@odf/shared/list-page';
import { CommonModalProps } from '@odf/shared/modals';
import { S3Commands } from '@odf/shared/s3';
import { getName } from '@odf/shared/selectors';
import { RowComponentType } from '@odf/shared/table';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { sortRows } from '@odf/shared/utils';
import { TFunction } from 'i18next';
import { Trans } from 'react-i18next';
import {
  Modal,
  ModalVariant,
  Button,
  ButtonVariant,
  TextInput,
  TextInputTypes,
  FormGroup,
  PaginationVariant,
} from '@patternfly/react-core';
import { Tr, Td, TableVariant } from '@patternfly/react-table';
import { ObjectCrFormat } from '../../../types';
import { replacePathFromName } from '../../../utils';
import './delete-objects.scss';

const DELETE = 'delete';

export type ObjectsDeleteResponse = {
  selectedObjects: ObjectCrFormat[];
  deleteResponse: DeleteObjectsCommandOutput;
};

export type SetObjectsDeleteResponse = React.Dispatch<
  React.SetStateAction<ObjectsDeleteResponse>
>;

type DeleteObjectsModalProps = {
  foldersPath: string;
  bucketName: string;
  noobaaS3: S3Commands;
  objects: ObjectCrFormat[];
  setDeleteResponse: SetObjectsDeleteResponse;
  refreshTokens: () => Promise<void>;
  closeObjectSidebar?: () => void;
};

const getTextInputLabel = (t: TFunction) => (
  <Trans t={t as any} ns="plugin__odf-console">
    <b>
      To confirm deletion, type <i>{{ delete: DELETE }}</i> in the text input
      field.
    </b>
  </Trans>
);

const getColumnNames = (t: TFunction) => [
  t('Object name'),
  t('Size'),
  t('Last modified'),
];

const getHeaderColumns = (t: TFunction) => {
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
      sortFunction: (a, b, c) => sortRows(a, b, c, 'apiResponse.lastModified'),
    },
  ];
};

const DeleteObjectsTableRow: React.FC<RowComponentType<ObjectCrFormat>> = ({
  row: object,
  extraProps,
}) => {
  const { t } = useCustomTranslation();

  const { foldersPath } = extraProps;
  const name = replacePathFromName(object, foldersPath);

  const columnNames = getColumnNames(t);

  return (
    <Tr>
      <Td dataLabel={columnNames[0]}>{name}</Td>
      <Td dataLabel={columnNames[1]}>{object.apiResponse.size}</Td>
      <Td dataLabel={columnNames[2]}>{object.apiResponse.lastModified}</Td>
    </Tr>
  );
};

const DeleteObjectsModal: React.FC<CommonModalProps<DeleteObjectsModalProps>> =
  ({
    closeModal,
    isOpen,
    extraProps: {
      foldersPath,
      bucketName,
      noobaaS3,
      objects: data,
      setDeleteResponse,
      refreshTokens,
      closeObjectSidebar,
    },
  }) => {
    const { t } = useCustomTranslation();

    const [deleteText, setDeleteText] = React.useState<string>('');
    const [inProgress, setInProgress] = React.useState<boolean>(false);
    const [error, setError] = React.useState<Error>();

    const onDelete = async (event) => {
      event.preventDefault();
      setInProgress(true);

      try {
        const deleteObjectKeys: ObjectIdentifier[] = data.map((object) => ({
          Key: getName(object),
        }));
        const response = await noobaaS3.deleteObjects({
          Bucket: bucketName,
          Delete: { Objects: deleteObjectKeys },
        });

        setInProgress(false);
        setDeleteResponse({
          selectedObjects: data,
          deleteResponse: response || ({} as DeleteObjectsCommandOutput),
        });
        closeModal();
        // need new continuation tokens after state of bucket has changed (objects deleted)
        refreshTokens();
        closeObjectSidebar?.();
      } catch (err) {
        setInProgress(false);
        setError(err);
      }
    };

    return (
      <Modal
        title={t('Delete object?')}
        titleIconVariant="warning"
        isOpen={isOpen}
        onClose={closeModal}
        description={
          <div className="text-muted">
            {t(
              'Deleted objects will no longer be visible in the bucket. If versioning is enabled a delete marker is created, you can recover object from previous versions. For unversioned objects, deletion is final and cannot be undone.'
            )}
          </div>
        }
        variant={ModalVariant.medium}
        actions={[
          <ButtonBar
            inProgress={inProgress}
            errorMessage={error?.message || error}
          >
            <span>
              <Button
                variant={ButtonVariant.danger}
                onClick={onDelete}
                isDisabled={deleteText !== DELETE || !!error}
                className="pf-v5-u-mr-xs"
              >
                {t('Delete object')}
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
        <div className="objects-table">
          <ListFilter
            data={data}
            loaded={true}
            textInputProps={{ className: 'pf-v5-u-w-50 pf-v5-u-ml-lg' }}
          >
            {(filteredData): React.ReactNode => (
              <PaginatedListPage
                filteredData={filteredData}
                noData={data.length === 1}
                hideFilter
                composableTableProps={{
                  columns: getHeaderColumns(t),
                  RowComponent: DeleteObjectsTableRow,
                  extraProps: { foldersPath },
                  unfilteredData: data as [],
                  loaded: true,
                  variant: TableVariant.compact,
                }}
                paginationProps={{
                  variant: PaginationVariant.top,
                  isCompact: true,
                  dropDirection: 'down',
                  perPageOptions: [{ title: '10', value: 10 }],
                  className: 'objects-table-paginate--margin-top',
                }}
              />
            )}
          </ListFilter>
        </div>
        <FormGroup
          label={getTextInputLabel(t)}
          fieldId="delete-objects"
          className="pf-v5-u-mt-lg pf-v5-u-mb-sm"
        >
          <TextInput
            value={deleteText}
            id="delete-objects"
            onChange={(_event, value) => setDeleteText(value)}
            type={TextInputTypes.text}
            placeholder={DELETE}
          />
        </FormGroup>
      </Modal>
    );
  };

export default DeleteObjectsModal;
