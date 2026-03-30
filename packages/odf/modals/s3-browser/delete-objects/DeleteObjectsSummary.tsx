import * as React from 'react';
import { DeleteObjectsCommandOutput, _Error } from '@aws-sdk/client-s3';
import { DASH } from '@odf/shared';
import { PaginatedListPage } from '@odf/shared/list-page';
import { CommonModalProps } from '@odf/shared/modals';
import { getName } from '@odf/shared/selectors';
import {
  RedExclamationCircleIcon,
  RedExclamationTriangleIcon,
} from '@odf/shared/status/icons';
import { RowComponentType } from '@odf/shared/table';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { sortRows } from '@odf/shared/utils';
import { Modal, ModalVariant } from '@patternfly/react-core/deprecated';
import { TFunction } from 'react-i18next';
import {
  Button,
  ButtonVariant,
  PaginationVariant,
} from '@patternfly/react-core';
import { Tr, Td, TableVariant } from '@patternfly/react-table';
import { ObjectCrFormat } from '../../../types';
import { replacePathFromName } from '../../../utils';
import './delete-objects.scss';

type DeleteObjectsSummaryProps = {
  errorResponse: DeleteObjectsCommandOutput['Errors'];
  selectedObjects: ObjectCrFormat[];
  foldersPath: string;
};

type DeleteObjectsMap = { [objectName: string]: ObjectCrFormat };

type SummaryRowComponent = React.ComponentType<RowComponentType<unknown>>;

const getColumnNames = (t: TFunction) => [
  '', // expandable
  t('Name'),
  t('Size'),
  t('Last modified'),
  t('Delete status'),
];

const getHeaderColumns = (t: TFunction) => {
  const columnNames = getColumnNames(t);
  return [
    {
      columnName: columnNames[0],
    },
    {
      columnName: columnNames[1],
      sortFunction: (a, b, c) => sortRows(a, b, c, 'metadata.name'),
    },
    {
      columnName: columnNames[2],
      sortFunction: (a, b, c) => sortRows(a, b, c, 'apiResponse.size'),
    },
    {
      columnName: columnNames[3],
      sortFunction: (a, b, c) => sortRows(a, b, c, 'apiResponse.lastModified'),
    },
    {
      columnName: columnNames[4],
    },
  ];
};

const ObjectsSummaryTableRow: React.FC<RowComponentType<_Error>> = ({
  row: object,
  rowIndex,
  extraProps,
}) => {
  const { t } = useCustomTranslation();

  const [isExpanded, setIsExpanded] = React.useState<boolean>(false);

  const { foldersPath, deleteObjectsMap } = extraProps;
  const objectName = object?.Key || DASH;
  const objectCrFormat = deleteObjectsMap[objectName] || {};
  const name = replacePathFromName(objectName, foldersPath);

  const columnNames = getColumnNames(t);

  return (
    <>
      <Tr>
        <Td
          data-test="expand-button"
          expand={{
            rowIndex,
            isExpanded: isExpanded,
            onToggle: () => setIsExpanded(!isExpanded),
            expandId: 'expandable-table',
          }}
        />
        <Td dataLabel={columnNames[1]}>{name}</Td>
        <Td dataLabel={columnNames[2]}>
          {objectCrFormat.apiResponse?.size || DASH}
        </Td>
        <Td dataLabel={columnNames[3]}>
          {objectCrFormat.apiResponse?.lastModified || DASH}
        </Td>
        <Td dataLabel={columnNames[4]}>
          <RedExclamationCircleIcon className="pf-v6-u-mr-sm" />
          {t('Failed')}
        </Td>
      </Tr>
      {isExpanded && (
        <Tr>
          <Td colSpan={Object.keys(columnNames).length + 1}>
            <RedExclamationTriangleIcon className="pf-v6-u-mr-sm" />
            {object?.Message || DASH}
          </Td>
        </Tr>
      )}
    </>
  );
};

const DeleteObjectsSummary: React.FC<
  CommonModalProps<DeleteObjectsSummaryProps>
> = ({
  closeModal,
  isOpen,
  extraProps: { errorResponse, selectedObjects, foldersPath },
}) => {
  const { t } = useCustomTranslation();

  const deleteObjectsMap: DeleteObjectsMap = React.useMemo(
    () =>
      selectedObjects.reduce((acc, object) => {
        acc[getName(object)] = object;
        return acc;
      }, {} as DeleteObjectsMap),
    [selectedObjects]
  );

  return (
    <Modal
      title={t('Object delete summary')}
      isOpen={isOpen}
      onClose={closeModal}
      variant={ModalVariant.default}
      actions={[
        <Button variant={ButtonVariant.primary} onClick={closeModal}>
          {t('Close')}
        </Button>,
      ]}
    >
      <div className="objects-table">
        <PaginatedListPage
          filteredData={errorResponse}
          hideFilter
          composableTableProps={{
            columns: getHeaderColumns(t),
            RowComponent: ObjectsSummaryTableRow as SummaryRowComponent,
            extraProps: { foldersPath, deleteObjectsMap },
            unfilteredData: errorResponse as [],
            loaded: true,
            variant: TableVariant.compact,
          }}
          paginationProps={{
            variant: PaginationVariant.top,
            dropDirection: 'down',
            perPageOptions: [{ title: '10', value: 10 }],
          }}
        />
      </div>
    </Modal>
  );
};

export default DeleteObjectsSummary;
