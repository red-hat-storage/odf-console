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
import { TFunction } from 'i18next';
import { useParams, useSearchParams } from 'react-router-dom-v5-compat';
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
} from '@patternfly/react-core';
import {
  ActionsColumn,
  IAction,
  CustomActionsToggleProps,
} from '@patternfly/react-table';
import { LIST_OBJECTS, DELIMITER, MAX_KEYS, PREFIX } from '../../../constants';
import {
  ObjectsDeleteResponse,
  SetObjectsDeleteResponse,
} from '../../../modals/s3-browser/delete-objects/DeleteObjectsModal';
import {
  LazyDeleteObjectsModal,
  LazyDeleteObjectsSummary,
} from '../../../modals/s3-browser/delete-objects/LazyDeleteModals';
import { ObjectCrFormat } from '../../../types';
import { getPath, convertObjectsDataToCrFormat } from '../../../utils';
import { NoobaaS3Context } from '../noobaa-context';
import {
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

type TableActionsProps = {
  launcher: LaunchModal;
  selectedRows: ObjectCrFormat[];
  loadedWOError: boolean;
  foldersPath: string;
  bucketName: string;
  noobaaS3: S3Commands;
  setDeleteResponse: SetObjectsDeleteResponse;
  refreshTokens: () => Promise<void>;
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
}) => {
  const { t } = useCustomTranslation();

  const anySelection = !!selectedRows.length;

  return (
    <Level hasGutter>
      <LevelItem>
        <div className="pf-v5-u-display-flex pf-v5-u-flex-direction-row">
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
            translate={null}
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

export const ObjectsList: React.FC<{}> = () => {
  const { t } = useCustomTranslation();

  const { bucketName } = useParams();
  const [searchParams] = useSearchParams();

  const launcher = useModal();

  // if non-empty means we are inside particular folder(s) of a bucket, else just inside a bucket (top-level)
  const foldersPath = searchParams.get(PREFIX);

  const { noobaaS3 } = React.useContext(NoobaaS3Context);
  const cacheKey = LIST_OBJECTS + DELIMITER + getPath(bucketName, foldersPath);
  const { data, error, isMutating, trigger } = useSWRMutation(
    cacheKey,
    (_url, { arg }: { arg: string }) =>
      noobaaS3.listObjects({
        Bucket: bucketName,
        MaxKeys: MAX_KEYS,
        Delimiter: DELIMITER,
        ...(!!foldersPath && { Prefix: foldersPath }),
        ...(!!arg && { ContinuationToken: arg }),
      })
  );

  const loadedWOError = !isMutating && !error;

  const [continuationTokens, setContinuationTokens] =
    React.useState<ContinuationTokens>({
      previous: [],
      current: '',
      next: '',
    });
  const [selectedRows, setSelectedRows] = React.useState<ObjectCrFormat[]>([]);
  const [deleteResponse, setDeleteResponse] =
    React.useState<ObjectsDeleteResponse>({
      selectedObjects: [] as ObjectCrFormat[],
      deleteResponse: {} as DeleteObjectsCommandOutput,
    });

  const structuredObjects: ObjectCrFormat[] = React.useMemo(() => {
    const objects: ObjectCrFormat[] = [];
    if (
      loadedWOError &&
      (!!data?.Contents?.length || !!data?.CommonPrefixes?.length)
    ) {
      data?.CommonPrefixes?.forEach((commonPrefix: CommonPrefix) => {
        objects.push(convertObjectsDataToCrFormat(commonPrefix, true, t));
      });
      data?.Contents?.forEach((content: Content) => {
        objects.push(convertObjectsDataToCrFormat(content, false, t));
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

  // initial fetch on first mount or on route update (drilling in/out of the folder view)
  React.useEffect(() => {
    refreshTokens();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [foldersPath]);

  return (
    <div className="pf-v5-u-m-lg">
      <p className="pf-v5-u-mb-sm">
        {t('Objects are the fundamental entities stored in buckets.')}
      </p>
      <DeletionAlerts
        deleteResponse={deleteResponse}
        foldersPath={foldersPath}
      />
      {/* ToDo: add upload objects option */}
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
        }}
        emptyRowMessage={EmptyPage}
      />
    </div>
  );
};
