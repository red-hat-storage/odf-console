import * as React from 'react';
import { DeleteObjectsCommandOutput } from '@aws-sdk/client-s3';
import { pluralize } from '@odf/core/components/utils';
import { FieldLevelHelp } from '@odf/shared';
import { S3Commands } from '@odf/shared/s3';
import { SelectableTable } from '@odf/shared/table';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { useModal } from '@openshift-console/dynamic-plugin-sdk';
import { LaunchModal } from '@openshift-console/dynamic-plugin-sdk/lib/app/modal-support/ModalProvider';
import { TFunction, Trans } from 'react-i18next';
import {
  useParams,
  useSearchParams,
  useNavigate,
} from 'react-router-dom-v5-compat';
import {
  Button,
  ButtonVariant,
  Level,
  LevelItem,
  MenuToggle,
  Alert,
  AlertVariant,
  AlertActionCloseButton,
  AlertActionLink,
  SearchInput,
  Switch,
} from '@patternfly/react-core';
import {
  ActionsColumn,
  IAction,
  CustomActionsToggleProps,
} from '@patternfly/react-table';
import { PREFIX, SEARCH } from '../../../constants';
import {
  ObjectsDeleteResponse,
  SetObjectsDeleteResponse,
} from '../../../modals/s3-browser/delete-objects/DeleteObjectsModal';
import {
  LazyDeleteObjectsModal,
  LazyDeleteObjectsSummary,
} from '../../../modals/s3-browser/delete-objects/LazyDeleteModals';
import { ObjectCrFormat, S3ProviderType } from '../../../types';
import { getNavigationURL } from '../../../utils';
import { Pagination, PaginationProps } from '../pagination-helper';
import { S3Context } from '../s3-context';
import {
  isRowSelectable,
  getColumns,
  TableRow,
  EmptyPage,
} from './table-components';
import { useObjectsList } from './useObjectsList';

const LazyCreateFolderModal = React.lazy(
  () => import('../../../modals/s3-browser/create-folder/CreateFolderModal')
);

export type ExtraProps = {
  setDeleteResponse: SetObjectsDeleteResponse;
  refreshTokens: () => Promise<void>;
  closeObjectSidebar: () => void;
};

type SearchObjectsProps = {
  foldersPath: string;
  bucketName: string;
  providerType: S3ProviderType;
  searchInput: string;
  setSearchInput: React.Dispatch<React.SetStateAction<string>>;
  className: string;
};

type TableActionsProps = {
  launcher: LaunchModal;
  selectedRows: ObjectCrFormat[];
  loadedWOError: boolean;
  foldersPath: string;
  bucketName: string;
  s3Client: S3Commands;
  setDeleteResponse: SetObjectsDeleteResponse;
  refreshTokens: () => Promise<void>;
  searchInput: string;
  setSearchInput: React.Dispatch<React.SetStateAction<string>>;
  listAllVersions: boolean;
  setListAllVersions: React.Dispatch<React.SetStateAction<boolean>>;
  allowVersioning: boolean;
};

type DeletionAlertsProps = {
  deleteResponse: ObjectsDeleteResponse;
  foldersPath: string;
};

const getBulkActionsItems = (
  t: TFunction,
  launcher: LaunchModal,
  selectedRows: ObjectCrFormat[],
  foldersPath: string,
  bucketName: string,
  s3Client: S3Commands,
  setDeleteResponse: SetObjectsDeleteResponse,
  refreshTokens: () => Promise<void>,
  showVersioning: boolean,
  isVersioningEnabledOrSuspended: boolean
): IAction[] => [
  {
    title: showVersioning ? t('Delete versions') : t('Delete objects'),
    onClick: () =>
      launcher(LazyDeleteObjectsModal, {
        isOpen: true,
        extraProps: {
          foldersPath,
          bucketName,
          objects: selectedRows,
          s3Client,
          setDeleteResponse,
          refreshTokens,
          showVersioning,
          isVersioningEnabledOrSuspended,
        },
      }),
  },
];

export const CustomActionsToggle = (props: CustomActionsToggleProps) => {
  const { t } = useCustomTranslation();

  return (
    <MenuToggle
      ref={props.toggleRef}
      onClick={props.onToggle}
      isDisabled={props.isDisabled}
    >
      {t('Actions')}
    </MenuToggle>
  );
};

const SearchObjects: React.FC<SearchObjectsProps> = ({
  foldersPath,
  bucketName,
  providerType,
  searchInput,
  setSearchInput,
  className,
}) => {
  const { t } = useCustomTranslation();

  const navigate = useNavigate();
  const onClearURL = getNavigationURL(
    bucketName,
    providerType,
    foldersPath,
    ''
  );

  return (
    <SearchInput
      placeholder={t('Search objects in the bucket using prefix')}
      value={searchInput}
      onChange={(_event, value) => {
        setSearchInput(value);
        if (value === '') navigate(onClearURL);
      }}
      onSearch={(_event, value) =>
        !!value &&
        navigate(getNavigationURL(bucketName, providerType, foldersPath, value))
      }
      onClear={() => {
        setSearchInput('');
        navigate(onClearURL);
      }}
      className={className}
    />
  );
};

const TableActions: React.FC<PaginationProps & TableActionsProps> = ({
  onNext,
  onPrevious,
  loadedWOError,
  disableNext,
  disablePrevious,
  launcher,
  selectedRows,
  foldersPath,
  bucketName,
  s3Client,
  setDeleteResponse,
  refreshTokens,
  searchInput,
  setSearchInput,
  fromCount: paginationFromCount,
  toCount: paginationToCount,
  listAllVersions,
  setListAllVersions,
  allowVersioning,
}) => {
  const { t } = useCustomTranslation();

  const versioningOnChange = (
    _event: React.FormEvent<HTMLInputElement>,
    checked: boolean
  ) => setListAllVersions(checked);

  const anySelection = !!selectedRows.length;
  const providerType = s3Client.providerType as S3ProviderType;

  return (
    <Level hasGutter>
      <LevelItem className="pf-v6-u-w-50">
        <div className="pf-v6-u-display-flex pf-v6-u-flex-direction-row">
          <SearchObjects
            foldersPath={foldersPath}
            bucketName={bucketName}
            providerType={providerType}
            searchInput={searchInput}
            setSearchInput={setSearchInput}
            className="pf-v6-u-mr-sm"
          />
          <Button
            variant={ButtonVariant.secondary}
            className="pf-v6-u-mr-sm"
            isDisabled={anySelection || !loadedWOError}
            onClick={() =>
              launcher(LazyCreateFolderModal, {
                isOpen: true,
                extraProps: { foldersPath, bucketName, s3Client },
              })
            }
          >
            {t('Create folder')}
          </Button>
          <ActionsColumn
            isDisabled={!anySelection || !loadedWOError}
            items={getBulkActionsItems(
              t,
              launcher,
              selectedRows,
              foldersPath,
              bucketName,
              s3Client,
              setDeleteResponse,
              refreshTokens,
              listAllVersions,
              allowVersioning
            )}
            actionsToggle={CustomActionsToggle}
            className="pf-v6-u-ml-sm"
          />
        </div>
      </LevelItem>
      {allowVersioning && (
        <LevelItem>
          <Switch
            id="list-versions-switch"
            label={t('List all versions')}
            isChecked={listAllVersions}
            onChange={versioningOnChange}
          />
          <FieldLevelHelp>
            <Trans t={t}>
              <i>List all versions</i> allows you to view all object versions,
              including deleted objects that have delete markers. <br />
              Each version of an object is listed as a separate row, making it
              easier to track changes, restore previous versions, recover
              deleted data or permanently delete objects.
            </Trans>
          </FieldLevelHelp>
        </LevelItem>
      )}
      <LevelItem>
        <Pagination
          onNext={onNext}
          onPrevious={onPrevious}
          disableNext={disableNext}
          disablePrevious={disablePrevious}
          fromCount={paginationFromCount}
          toCount={paginationToCount}
        />
      </LevelItem>
    </Level>
  );
};

export const DeletionAlerts: React.FC<DeletionAlertsProps> = ({
  deleteResponse,
  foldersPath,
}) => {
  const { t } = useCustomTranslation();

  const launcher = useModal();

  const [errorResponse, setErrorResponse] = React.useState<
    DeleteObjectsCommandOutput['Errors']
  >([]);
  const [successResponse, setSuccessResponse] = React.useState<
    DeleteObjectsCommandOutput['Deleted']
  >([]);

  React.useEffect(() => {
    setErrorResponse(deleteResponse?.deleteResponse?.Errors || []);
    setSuccessResponse(deleteResponse?.deleteResponse?.Deleted || []);
  }, [deleteResponse]);

  const errorCount = errorResponse.length;
  const successCount = successResponse.length;
  return (
    <>
      {!!errorCount && (
        <Alert
          variant={AlertVariant.danger}
          title={pluralize(
            errorCount,
            t(
              'Failed to delete {{ errorCount }} object from the bucket. View deletion summary for details.',
              { errorCount }
            ),
            t(
              'Failed to delete {{ errorCount }} objects from the bucket. View deletion summary for details.',
              { errorCount }
            ),
            false
          )}
          isInline
          className="pf-v6-u-mb-sm pf-v6-u-mt-lg"
          actionClose={
            <AlertActionCloseButton onClose={() => setErrorResponse([])} />
          }
          actionLinks={
            <AlertActionLink
              onClick={() =>
                launcher(LazyDeleteObjectsSummary, {
                  isOpen: true,
                  extraProps: {
                    foldersPath,
                    errorResponse,
                    selectedObjects: deleteResponse.selectedObjects,
                  },
                })
              }
            >
              {t('View failed objects')}
            </AlertActionLink>
          }
        />
      )}
      {!!successCount && (
        <Alert
          variant={AlertVariant.success}
          title={pluralize(
            successCount,
            t(
              'Successfully deleted {{ successCount }} object from the bucket.',
              { successCount }
            ),
            t(
              'Successfully deleted {{ successCount }} objects from the bucket.',
              { successCount }
            ),
            false
          )}
          isInline
          className="pf-v6-u-mb-lg pf-v6-u-mt-sm"
          actionClose={
            <AlertActionCloseButton onClose={() => setSuccessResponse([])} />
          }
        />
      )}
    </>
  );
};

type ObjectsListProps = {
  onRowClick: (
    selectedObject: ObjectCrFormat,
    actionItems: React.MutableRefObject<IAction[]>,
    extraProps: ExtraProps
  ) => void;
  closeObjectSidebar: () => void;
  listAllVersions: boolean;
  setListAllVersions: React.Dispatch<React.SetStateAction<boolean>>;
  allowVersioning: boolean;
};

export const ObjectsList: React.FC<ObjectsListProps> = ({
  onRowClick,
  closeObjectSidebar,
  listAllVersions,
  setListAllVersions,
  allowVersioning,
}) => {
  const { t } = useCustomTranslation();

  const { bucketName } = useParams();
  const [searchParams] = useSearchParams();

  const launcher = useModal();

  // if non-empty means we are inside particular folder(s) of a bucket, else just inside a bucket (top-level)
  const foldersPath = searchParams.get(PREFIX) || '';
  // search objects within a bucket
  const searchQuery = searchParams.get(SEARCH) || '';

  const { s3Client } = React.useContext(S3Context);

  // used for multi-select bulk operations
  const [selectedRows, setSelectedRows] = React.useState<ObjectCrFormat[]>([]);
  // used for storing API's response on performing delete operation on objects
  const [deleteResponse, setDeleteResponse] =
    React.useState<ObjectsDeleteResponse>({
      selectedObjects: [] as ObjectCrFormat[],
      deleteResponse: {} as DeleteObjectsCommandOutput,
    });
  // used for storing input to the objects' search bar
  const [searchInput, setSearchInput] = React.useState(searchQuery);
  // used to store previous value of "foldersPath";
  const foldersPathPrevRef = React.useRef<string>();

  const {
    error,
    isMutating,
    continuationTokens,
    structuredObjects,
    refreshTokens,
    paginationToCount,
    paginationFromCount,
    onNext,
    onPrevious,
  } = useObjectsList({
    bucketName,
    foldersPath,
    searchQuery,
    s3Client,
    setSelectedRows,
    listAllVersions,
  });

  const loadedWOError = !isMutating && !error;

  // initial fetch on first mount or on route update (drilling in/out of the folder view or searching objects using prefix)
  // or on "List all versions" toggle
  React.useEffect(() => {
    refreshTokens();
    if (foldersPathPrevRef.current !== foldersPath) {
      // only reset filter if navigated in/out of the current folder
      // not when search query is changed,
      // also, not when URL contains search query param
      if (!searchQuery) setSearchInput('');
      foldersPathPrevRef.current = foldersPath;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [foldersPath, searchQuery, listAllVersions]);

  return (
    <div className="pf-v6-u-m-lg">
      <p className="pf-v6-u-mb-sm">
        {t('Objects are the fundamental entities stored in buckets.')}
      </p>
      <DeletionAlerts
        deleteResponse={deleteResponse}
        foldersPath={foldersPath}
      />
      <TableActions
        onNext={onNext}
        onPrevious={onPrevious}
        selectedRows={selectedRows}
        loadedWOError={loadedWOError}
        disableNext={!continuationTokens.next || !loadedWOError}
        disablePrevious={!continuationTokens.current || !loadedWOError}
        launcher={launcher}
        foldersPath={foldersPath}
        bucketName={bucketName}
        s3Client={s3Client}
        setDeleteResponse={setDeleteResponse}
        refreshTokens={refreshTokens}
        searchInput={searchInput}
        setSearchInput={setSearchInput}
        fromCount={paginationFromCount}
        toCount={paginationToCount}
        listAllVersions={listAllVersions}
        setListAllVersions={setListAllVersions}
        allowVersioning={allowVersioning}
      />
      {listAllVersions && (
        <Alert
          isInline
          variant={AlertVariant.info}
          title={
            <Trans t={t}>
              <i>List all versions</i> is turned on. Each version is listed as a
              separate row, allowing you to track changes, restore previous
              versions, or permanently delete objects.
            </Trans>
          }
          className="pf-v6-u-mt-sm"
        />
      )}
      <SelectableTable
        key={listAllVersions ? 'versioned-list' : 'unversioned-list'}
        className="pf-v6-u-mt-lg"
        columns={getColumns(t, listAllVersions)}
        rows={structuredObjects}
        RowComponent={TableRow}
        selectedRows={selectedRows}
        setSelectedRows={setSelectedRows}
        loaded={!isMutating}
        loadError={error}
        isRowSelectable={isRowSelectable}
        extraProps={{
          launcher,
          bucketName,
          foldersPath,
          s3Client,
          setDeleteResponse,
          refreshTokens,
          onRowClick,
          closeObjectSidebar,
          showVersioning: listAllVersions,
          isVersioningEnabledOrSuspended: allowVersioning,
        }}
        emptyRowMessage={EmptyPage}
      />
    </div>
  );
};
