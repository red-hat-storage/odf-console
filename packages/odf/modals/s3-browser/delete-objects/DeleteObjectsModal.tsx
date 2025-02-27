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
  PaginationVariant,
} from '@patternfly/react-core';
import { Tr, Td, TableVariant } from '@patternfly/react-table';
import { ObjectCrFormat } from '../../../types';
import { replacePathFromName, getObjectVersionId } from '../../../utils';
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
  showVersioning: boolean;
};

const getTextInputLabel = (t: TFunction) => (
  <Trans t={t as any} ns="plugin__odf-console">
    <b>
      To confirm deletion, type <i>{{ delete: DELETE }}</i>:
    </b>
  </Trans>
);

const getTitle = (
  data: ObjectCrFormat[],
  showVersioning: boolean,
  t: TFunction
) => {
  const isMultiDelete = data.length > 1;
  if (showVersioning)
    return isMultiDelete ? t('Delete versions?') : t('Delete version?');

  return isMultiDelete ? t('Delete objects?') : t('Delete object?');
};

const getDescription = (showVersioning: boolean, t: TFunction) => {
  if (showVersioning) {
    return (
      <Trans t={t} ns="plugin__odf-console">
        <p className="text-muted">
          Deleting a specific version of an object is permanent and cannot be
          undone.
        </p>
        <p className="text-muted">
          Removing a delete marker will restore the object to its most recent
          version, making it accessible again. If no previous versions exist,
          the object will be permanently deleted.
        </p>
      </Trans>
    );
  }

  return (
    <div className="text-muted">
      {t(
        'Deleted objects will no longer be visible in the bucket. If versioning is enabled, a delete marker is created, allowing recovery from previous versions. For unversioned buckets, deletion is permanent and cannot be undone.'
      )}
    </div>
  );
};

const getColumnNames = (t: TFunction) => [
  t('Object name'),
  t('Size'),
  t('Last modified'),
];

const getVersioningColumnName = (t: TFunction): string => t('Version ID');

const getHeaderColumns = (showVersioning: boolean, t: TFunction) => {
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
      sortFunction: (a, b, c) => sortRows(a, b, c, 'apiResponse.lastModified'),
    },
  ];
};

const DeleteObjectsTableRow: React.FC<RowComponentType<ObjectCrFormat>> = ({
  row: object,
  extraProps,
}) => {
  const { t } = useCustomTranslation();

  const { foldersPath, showVersioning } = extraProps;
  const name = replacePathFromName(object, foldersPath);

  const columnNames = getColumnNames(t);
  const versioningColumnName = getVersioningColumnName(t);

  return (
    <Tr>
      <Td dataLabel={columnNames[0]}>{name}</Td>
      {showVersioning && (
        <Td dataLabel={versioningColumnName}>{object.apiResponse.versionId}</Td>
      )}
      <Td dataLabel={columnNames[1]}>{object.apiResponse.size}</Td>
      <Td dataLabel={columnNames[2]}>{object.apiResponse.lastModified}</Td>
    </Tr>
  );
};

const DeleteObjectsModal: React.FC<
  CommonModalProps<DeleteObjectsModalProps>
> = ({
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
    showVersioning,
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
        ...(showVersioning && { VersionId: getObjectVersionId(object) }),
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
      title={getTitle(data, showVersioning, t)}
      titleIconVariant="warning"
      isOpen={isOpen}
      onClose={closeModal}
      description={getDescription(showVersioning, t)}
      variant={ModalVariant.medium}
      actions={[
        <ButtonBar
          inProgress={inProgress}
          errorMessage={error?.message || JSON.stringify(error)}
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
                columns: getHeaderColumns(showVersioning, t),
                RowComponent: DeleteObjectsTableRow,
                extraProps: { foldersPath, showVersioning },
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
