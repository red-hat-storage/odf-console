import * as React from 'react';
import {
  ListObjectsV2CommandOutput,
  DeleteObjectsCommandOutput,
  _Object as Content,
  CommonPrefix,
} from '@aws-sdk/client-s3';
import { pluralize } from '@odf/core/components/utils';
import { S3Commands } from '@odf/shared/s3';
import { SelectableTable } from '@odf/shared/table';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { useModal } from '@openshift-console/dynamic-plugin-sdk';
import { LaunchModal } from '@openshift-console/dynamic-plugin-sdk/lib/app/modal-support/ModalProvider';
import { TFunction } from 'react-i18next';
import {
  useParams,
  useSearchParams,
  useNavigate,
} from 'react-router-dom-v5-compat';
import useSWRMutation from 'swr/mutation';
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
} from '@patternfly/react-core';
import {
  ActionsColumn,
  IAction,
  CustomActionsToggleProps,
} from '@patternfly/react-table';
import {
  LIST_OBJECTS,
  DELIMITER,
  MAX_KEYS,
  PREFIX,
  SEARCH,
} from '../../../constants';
import {
  ObjectsDeleteResponse,
  SetObjectsDeleteResponse,
} from '../../../modals/s3-browser/delete-objects/DeleteObjectsModal';
import {
  LazyDeleteObjectsModal,
  LazyDeleteObjectsSummary,
} from '../../../modals/s3-browser/delete-objects/LazyDeleteModals';
import { ObjectCrFormat } from '../../../types';
import {
  getPath,
  getPrefix as getSearchWithPrefix,
  convertObjectDataToCrFormat,
  getNavigationURL,
} from '../../../utils';
import { NoobaaS3Context } from '../noobaa-context';
import {
  getPaginationCount,
  Pagination,
  PaginationProps,
  ContinuationTokens,
  fetchS3Resources,
  continuationTokensRefresher,
} from '../pagination-helper';
import {
  isRowSelectable,
  getColumns,
  TableRow,
  EmptyPage,
} from './table-components';

const LazyCreateFolderModal = React.lazy(
  () => import('../../../modals/s3-browser/create-folder/CreateFolderModal')
);

type SearchObjectsProps = {
  foldersPath: string;
  bucketName: string;
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
  noobaaS3: S3Commands;
  setDeleteResponse: SetObjectsDeleteResponse;
  refreshTokens: () => Promise<void>;
  searchInput: string;
  setSearchInput: React.Dispatch<React.SetStateAction<string>>;
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
  noobaaS3: S3Commands,
  setDeleteResponse: SetObjectsDeleteResponse,
  refreshTokens: () => Promise<void>
): IAction[] => [
  {
    title: t('Delete objects'),
    onClick: () =>
      launcher(LazyDeleteObjectsModal, {
        isOpen: true,
        extraProps: {
          foldersPath,
          bucketName,
          objects: selectedRows,
          noobaaS3,
          setDeleteResponse,
          refreshTokens,
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
  searchInput,
  setSearchInput,
  className,
}) => {
  const { t } = useCustomTranslation();

  const navigate = useNavigate();
  const onClearURL = getNavigationURL(bucketName, foldersPath, '');

  return (
    <SearchInput
      placeholder={t('Search objects in the bucket using prefix')}
      value={searchInput}
      onChange={(_event, value) => {
        setSearchInput(value);
        if (value === '') navigate(onClearURL);
      }}
      onSearch={(_event, value) =>
        !!value && navigate(getNavigationURL(bucketName, foldersPath, value))
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
  noobaaS3,
  setDeleteResponse,
  refreshTokens,
  searchInput,
  setSearchInput,
  fromCount: paginationFromCount,
  toCount: paginationToCount,
}) => {
  const { t } = useCustomTranslation();

  const anySelection = !!selectedRows.length;

  return (
    <Level hasGutter>
      <LevelItem className="pf-v5-u-w-50">
        <div className="pf-v5-u-display-flex pf-v5-u-flex-direction-row">
          <SearchObjects
            foldersPath={foldersPath}
            bucketName={bucketName}
            searchInput={searchInput}
            setSearchInput={setSearchInput}
            className="pf-v5-u-mr-sm"
          />
          <Button
            variant={ButtonVariant.secondary}
            className="pf-v5-u-mr-sm"
            isDisabled={anySelection || !loadedWOError}
            onClick={() =>
              launcher(LazyCreateFolderModal, {
                isOpen: true,
                extraProps: { foldersPath, bucketName, noobaaS3 },
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
              noobaaS3,
              setDeleteResponse,
              refreshTokens
            )}
            actionsToggle={CustomActionsToggle}
            className="pf-v5-u-ml-sm"
          />
        </div>
      </LevelItem>
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

const DeletionAlerts: React.FC<DeletionAlertsProps> = ({
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
          className="pf-v5-u-mb-sm pf-v5-u-mt-lg"
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
          className="pf-v5-u-mb-lg pf-v5-u-mt-sm"
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
    actionItems: React.MutableRefObject<IAction[]>
  ) => void;
  closeObjectSidebar: () => void;
};

export const ObjectsList: React.FC<ObjectsListProps> = ({
  onRowClick,
  closeObjectSidebar,
}) => {
  const { t } = useCustomTranslation();

  const { bucketName } = useParams();
  const [searchParams] = useSearchParams();

  const launcher = useModal();

  // if non-empty means we are inside particular folder(s) of a bucket, else just inside a bucket (top-level)
  const foldersPath = searchParams.get(PREFIX) || '';
  // search objects within a bucket
  const searchQuery = searchParams.get(SEARCH) || '';

  const { noobaaS3 } = React.useContext(NoobaaS3Context);
  const searchWithPrefix = getSearchWithPrefix(searchQuery, foldersPath);
  const cacheKey =
    LIST_OBJECTS + DELIMITER + getPath(bucketName, searchWithPrefix);
  const { data, error, isMutating, trigger } = useSWRMutation(
    cacheKey,
    (_url, { arg }: { arg: string }) =>
      noobaaS3.listObjects({
        Bucket: bucketName,
        MaxKeys: MAX_KEYS,
        Delimiter: DELIMITER,
        FetchOwner: true,
        ...(!!searchWithPrefix && { Prefix: searchWithPrefix }),
        ...(!!arg && { ContinuationToken: arg }),
      })
  );

  const loadedWOError = !isMutating && !error;

  // used for pagination
  const [continuationTokens, setContinuationTokens] =
    React.useState<ContinuationTokens>({
      previous: [],
      current: '',
      next: '',
    });
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

  const structuredObjects: ObjectCrFormat[] = React.useMemo(() => {
    const objects: ObjectCrFormat[] = [];
    if (
      loadedWOError &&
      (!!data?.Contents?.length || !!data?.CommonPrefixes?.length)
    ) {
      data?.CommonPrefixes?.forEach((commonPrefix: CommonPrefix) => {
        objects.push(convertObjectDataToCrFormat(commonPrefix, true, t));
      });
      data?.Contents?.forEach((content: Content) => {
        objects.push(convertObjectDataToCrFormat(content, false, t));
      });
    }

    return objects;
  }, [data, loadedWOError, t]);

  const refreshTokens = () =>
    continuationTokensRefresher(
      setContinuationTokens,
      trigger,
      setSelectedRows
    );

  // initial fetch on first mount or on route update (drilling in/out of the folder view or searching objects using prefix)
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
  }, [foldersPath, searchQuery]);

  const [paginationToCount, paginationFromCount] = getPaginationCount(
    continuationTokens,
    (data?.Contents?.length || 0) + (data?.CommonPrefixes?.length || 0),
    MAX_KEYS
  );
  return (
    <div className="pf-v5-u-m-lg">
      <p className="pf-v5-u-mb-sm">
        {t('Objects are the fundamental entities stored in buckets.')}
      </p>
      <DeletionAlerts
        deleteResponse={deleteResponse}
        foldersPath={foldersPath}
      />
      <TableActions
        onNext={async () => {
          if (!!continuationTokens.next && loadedWOError)
            fetchS3Resources<ListObjectsV2CommandOutput>(
              setContinuationTokens,
              trigger,
              true,
              continuationTokens.next,
              setSelectedRows
            );
        }}
        onPrevious={async () => {
          if (!!continuationTokens.current && loadedWOError) {
            const paginationToken =
              continuationTokens.previous[
                continuationTokens.previous.length - 1
              ];
            fetchS3Resources<ListObjectsV2CommandOutput>(
              setContinuationTokens,
              trigger,
              false,
              paginationToken,
              setSelectedRows
            );
          }
        }}
        selectedRows={selectedRows}
        loadedWOError={loadedWOError}
        disableNext={!continuationTokens.next || !loadedWOError}
        disablePrevious={!continuationTokens.current || !loadedWOError}
        launcher={launcher}
        foldersPath={foldersPath}
        bucketName={bucketName}
        noobaaS3={noobaaS3}
        setDeleteResponse={setDeleteResponse}
        refreshTokens={refreshTokens}
        searchInput={searchInput}
        setSearchInput={setSearchInput}
        fromCount={paginationFromCount}
        toCount={paginationToCount}
      />
      <SelectableTable
        className="pf-v5-u-mt-lg"
        columns={getColumns(t)}
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
          noobaaS3,
          setDeleteResponse,
          refreshTokens,
          onRowClick,
          closeObjectSidebar,
        }}
        emptyRowMessage={EmptyPage}
      />
    </div>
  );
};
