import * as React from 'react';
import {
  ListObjectsV2CommandOutput,
  _Object as Content,
  CommonPrefix,
} from '@aws-sdk/client-s3';
import { SelectableTable } from '@odf/shared/table';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { useModal } from '@openshift-console/dynamic-plugin-sdk';
import { LaunchModal } from '@openshift-console/dynamic-plugin-sdk/lib/app/modal-support/ModalProvider';
import { TFunction } from 'i18next';
import * as _ from 'lodash-es';
import { useParams, useSearchParams } from 'react-router-dom-v5-compat';
import useSWRMutation, { TriggerWithOptionsArgs } from 'swr/mutation';
import {
  Button,
  ButtonVariant,
  Level,
  LevelItem,
  MenuToggle,
} from '@patternfly/react-core';
import { AngleLeftIcon, AngleRightIcon } from '@patternfly/react-icons';
import {
  ActionsColumn,
  IAction,
  CustomActionsToggleProps,
} from '@patternfly/react-table';
import { LIST_OBJECTS, DELIMITER, MAX_KEYS, PREFIX } from '../../../constants';
import { ObjectCrFormat } from '../../../types';
import { getPath, convertObjectsDataToCrFormat } from '../../../utils';
import { NoobaaS3Context } from '../noobaa-context';
import {
  isRowSelectable,
  getColumns,
  TableRow,
  EmptyPage,
} from './table-components';

type PaginationProps = {
  onNext: () => void;
  onPrevious: () => void;
  disableNext: boolean;
  disablePrevious: boolean;
};

type TableActionsProps = {
  launcher: LaunchModal;
  selectedRows: unknown[];
  loadedWOError: boolean;
};

type ContinuationTokens = {
  previous: string[];
  current: string;
  next: string;
};

type Trigger = TriggerWithOptionsArgs<
  ListObjectsV2CommandOutput,
  any,
  string,
  string
>;

const continuationTokensSetter = (
  setContinuationTokens: React.Dispatch<
    React.SetStateAction<ContinuationTokens>
  >,
  response: ListObjectsV2CommandOutput,
  isNext: boolean,
  setSelectedRows: React.Dispatch<React.SetStateAction<ObjectCrFormat[]>>
) => {
  setContinuationTokens((oldTokens) => {
    const newTokens = _.cloneDeep(oldTokens);
    if (isNext) {
      newTokens.previous.push(newTokens.current);
      newTokens.current = newTokens.next;
    } else {
      newTokens.current = newTokens.previous.pop();
    }
    newTokens.next = response.NextContinuationToken;

    return newTokens;
  });
  setSelectedRows([]);
};

const fetchObjects = async (
  setContinuationTokens: React.Dispatch<
    React.SetStateAction<ContinuationTokens>
  >,
  trigger: Trigger,
  isNext: boolean,
  setSelectedRows: React.Dispatch<React.SetStateAction<ObjectCrFormat[]>>,
  paginationToken = ''
) => {
  try {
    const response: ListObjectsV2CommandOutput = await trigger(paginationToken);
    continuationTokensSetter(
      setContinuationTokens,
      response,
      isNext,
      setSelectedRows
    );
  } catch (err) {
    // no need to handle any error here, use "error" object directly from the "useSWRMutation" hook
    // eslint-disable-next-line no-console
    console.error(err);
  }
};

const getBulkActionsItems = (
  t: TFunction,
  _launcher: LaunchModal,
  _selectedRows: unknown[]
): IAction[] => [
  // ToDo: add bulk delete option
  {
    title: t('Delete objects'),
    onClick: () => undefined,
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

const Pagination: React.FC<PaginationProps> = ({
  onNext,
  onPrevious,
  disableNext,
  disablePrevious,
}) => {
  return (
    <div className="pf-v5-u-display-flex pf-v5-u-flex-direction-row">
      <Button
        variant={ButtonVariant.plain}
        className="pf-v5-u-mr-xs"
        isDisabled={disablePrevious}
        onClick={onPrevious}
      >
        <AngleLeftIcon />
      </Button>
      <Button
        variant={ButtonVariant.plain}
        className="pf-v5-u-ml-xs"
        isDisabled={disableNext}
        onClick={onNext}
      >
        <AngleRightIcon />
      </Button>
    </div>
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
}) => {
  const { t } = useCustomTranslation();

  const anySelection = !!selectedRows.length;

  return (
    <Level hasGutter>
      <LevelItem>
        <div className="pf-v5-u-display-flex pf-v5-u-flex-direction-row">
          {/* ToDo: add create folder option */}
          <Button
            variant={ButtonVariant.secondary}
            className="pf-v5-u-mr-xs"
            isDisabled={anySelection || !loadedWOError}
            onClick={() => undefined}
          >
            {t('Create folder')}
          </Button>
          <ActionsColumn
            isDisabled={!anySelection || !loadedWOError}
            translate={null}
            items={getBulkActionsItems(t, launcher, selectedRows)}
            actionsToggle={CustomActionsToggle}
            className="pf-v5-u-ml-xs"
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

  // initial fetch on first mount or on route update (drilling in/out of the folder view)
  React.useEffect(() => {
    fetchObjects(setContinuationTokens, trigger, true, setSelectedRows);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [foldersPath]);

  return (
    <div className="pf-v5-u-m-lg">
      {/* ToDo: add upload objects option */}

      <TableActions
        onNext={async () => {
          if (!!continuationTokens.next && loadedWOError)
            fetchObjects(
              setContinuationTokens,
              trigger,
              true,
              setSelectedRows,
              continuationTokens.next
            );
        }}
        onPrevious={async () => {
          if (!!continuationTokens.current && loadedWOError) {
            const paginationToken =
              continuationTokens.previous[
                continuationTokens.previous.length - 1
              ];
            fetchObjects(
              setContinuationTokens,
              trigger,
              false,
              setSelectedRows,
              paginationToken
            );
          }
        }}
        selectedRows={selectedRows}
        loadedWOError={loadedWOError}
        disableNext={!continuationTokens.next || !loadedWOError}
        disablePrevious={!continuationTokens.current || !loadedWOError}
        launcher={launcher}
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
        extraProps={{ launcher, bucketName, foldersPath, noobaaS3 }}
        emptyRowMessage={EmptyPage}
      />
    </div>
  );
};
