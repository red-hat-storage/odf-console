import * as React from 'react';
import { CORSRule, GetBucketCorsCommandOutput } from '@aws-sdk/client-s3';
import { NoobaaS3Context } from '@odf/core/components/s3-browser/noobaa-context';
import {
  BUCKET_CORS_RULE_CACHE_KEY_SUFFIX,
  BUCKETS_BASE_ROUTE,
  RULE_NAME,
  RULE_HASH,
} from '@odf/core/constants';
import DeleteCorsRuleModal from '@odf/core/modals/s3-browser/delete-corsrules/DeleteCorsRuleModal';
import { DASH } from '@odf/shared';
import EmptyPage from '@odf/shared/empty-state-page/empty-page';
import { StatusBox } from '@odf/shared/generic/status-box';
import { S3Commands } from '@odf/shared/s3';
import { isNoCorsRuleError } from '@odf/shared/s3/utils';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { fuzzyCaseInsensitive, deepSortObject } from '@odf/shared/utils';
import {
  ListPageBody,
  ListPageCreateLink,
  ListPageFilter,
  ListPageHeader,
  RowFilter,
  RowProps,
  TableColumn,
  TableData,
  useActiveColumns,
  useListPageFilter,
  useModal,
  VirtualizedTable,
} from '@openshift-console/dynamic-plugin-sdk';
import { LaunchModal } from '@openshift-console/dynamic-plugin-sdk/lib/app/modal-support/ModalProvider';
import { murmur3 } from 'murmurhash-js';
import { TFunction } from 'react-i18next';
import {
  NavigateFunction,
  useNavigate,
  useParams,
} from 'react-router-dom-v5-compat';
import useSWR, { KeyedMutator } from 'swr';
import { sortable, ActionsColumn, IAction } from '@patternfly/react-table';

// overrides default "name" search filter
const nameFilterOverride: RowFilter<CORSRule>[] = [
  {
    type: 'name',
    filterGroupName: '',
    reducer: () => undefined,
    items: [],
    filter: (filterValue, lifecycleRule) =>
      fuzzyCaseInsensitive(filterValue.selected?.[0], lifecycleRule?.ID || ''),
  },
];

type CORSRulesListProps = {
  obj: { fresh: boolean };
};

type CustomData = {
  navigate: NavigateFunction;
  launcher: LaunchModal;
  mutate: KeyedMutator<GetBucketCorsCommandOutput>;
  noobaaS3: S3Commands;
  bucketName: string;
};

type CorsRulesTableProps = {
  data: CORSRule[];
  unfilteredData: CORSRule[];
  loaded: boolean;
  loadError: any;
  rowData: CustomData;
};

export const getRowActions = (
  t: TFunction<string>,
  navigate: NavigateFunction,
  launcher: LaunchModal,
  mutate: KeyedMutator<GetBucketCorsCommandOutput>,
  noobaaS3: S3Commands,
  bucketName: string,
  ruleName: string,
  ruleHash: number
): IAction[] => {
  const searchParam = !!ruleName
    ? `${RULE_NAME}=${encodeURIComponent(ruleName)}`
    : `${RULE_HASH}=${ruleHash}`;
  const editRuleLink = `${BUCKETS_BASE_ROUTE}/${bucketName}/permissions/cors/edit?${searchParam}`;
  return [
    {
      title: t('Edit configuration'),
      onClick: () => navigate(editRuleLink),
    },
    {
      title: t('Delete'),
      onClick: () =>
        launcher(DeleteCorsRuleModal, {
          isOpen: true,
          extraProps: { noobaaS3, bucketName, mutate, ruleName, ruleHash },
        }),
    },
  ];
};

const tableColumnInfo = [
  'rule',
  'allowed-origins',
  'allowed-methods',
  'allowed-headers',
  'exposed-headers',
  'max-age-seconds',
  '',
];

const columnInfoToTitleMap: Map<string, string> = new Map([
  [tableColumnInfo[0], 'Rule'],
  [tableColumnInfo[1], 'Allowed origins'],
  [tableColumnInfo[2], 'Allowed methods'],
  [tableColumnInfo[3], 'Allowed headers'],
  [tableColumnInfo[4], 'Exposed headers'],
  [tableColumnInfo[5], 'MaxAgeSeconds'],
  [tableColumnInfo[6], ''],
]);

const RulesTable: React.FC<CorsRulesTableProps> = (props) => {
  const { t } = useCustomTranslation();
  const tableColumns = React.useMemo<TableColumn<CORSRule>[]>(
    () => [
      {
        title: t(columnInfoToTitleMap.get(tableColumnInfo[0])),
        sort: 'ID',
        transforms: [sortable],
        id: tableColumnInfo[0],
      },
      {
        title: t(columnInfoToTitleMap.get(tableColumnInfo[1])),
        id: tableColumnInfo[1],
      },
      {
        title: t(columnInfoToTitleMap.get(tableColumnInfo[2])),
        id: tableColumnInfo[2],
      },
      {
        title: t(columnInfoToTitleMap.get(tableColumnInfo[3])),
        id: tableColumnInfo[3],
      },
      {
        title: t(columnInfoToTitleMap.get(tableColumnInfo[4])),
        id: tableColumnInfo[4],
      },
      {
        title: t(columnInfoToTitleMap.get(tableColumnInfo[5])),
        id: tableColumnInfo[5],
      },
      {
        title: '',
        id: tableColumnInfo[6],
      },
    ],
    [t]
  );

  const [columns] = useActiveColumns({
    columns: tableColumns,
    showNamespaceOverride: false,
    columnManagementID: null,
  });

  return (
    <VirtualizedTable
      {...props}
      aria-label={t('Lifecycle rules list page')}
      columns={columns}
      Row={RuleRow}
    />
  );
};

const RuleRow: React.FC<RowProps<CORSRule, CustomData>> = ({
  obj: corsRuleObj,
  activeColumnIDs,
  rowData,
}) => {
  const { t } = useCustomTranslation();

  const { navigate, launcher, mutate, noobaaS3, bucketName } = rowData;

  // allowed-origins
  const ruleName = corsRuleObj?.ID;
  const allowedOriginsLength = corsRuleObj.AllowedOrigins.length;
  const trimmedAllowedOrigins = corsRuleObj?.AllowedOrigins.map((strOrgns) =>
    strOrgns.trim()
  );
  const allowedOriginsRowValue = trimmedAllowedOrigins.includes('*')
    ? 'All origins'
    : allowedOriginsLength +
      (allowedOriginsLength === 1 ? ' origin' : ' origins');
  // allowed-methods
  const allowedMethodsLength = corsRuleObj?.AllowedMethods.length;
  const allowedMethodsRowValue =
    allowedMethodsLength +
    (allowedMethodsLength === 1 ? ' method' : ' methods');
  // allowed-headers
  const allowedHeadersLength = corsRuleObj?.AllowedHeaders?.length ?? 0;
  const allowedHeadersRowValue =
    corsRuleObj?.AllowedHeaders?.includes('*') || false
      ? 'All headers'
      : allowedHeadersLength + ' allowed';
  // exposed-headers
  const exposedHeadersLength = corsRuleObj?.ExposeHeaders?.length ?? 0;
  const exposedHeadersRowValue = exposedHeadersLength + ' exposed';

  // fallback if rule name (ID) is missing
  const ruleHash: number = React.useMemo(() => {
    if (!ruleName) {
      return murmur3(JSON.stringify(deepSortObject(corsRuleObj)));
    }
    return null;
  }, [ruleName, corsRuleObj]);

  return (
    <>
      <TableData id={tableColumnInfo[0]} activeColumnIDs={activeColumnIDs}>
        {ruleName || DASH}
      </TableData>
      <TableData id={tableColumnInfo[1]} activeColumnIDs={activeColumnIDs}>
        {allowedOriginsRowValue}
      </TableData>
      <TableData id={tableColumnInfo[2]} activeColumnIDs={activeColumnIDs}>
        {allowedMethodsRowValue}
      </TableData>
      <TableData id={tableColumnInfo[3]} activeColumnIDs={activeColumnIDs}>
        {allowedHeadersRowValue}
      </TableData>
      <TableData id={tableColumnInfo[4]} activeColumnIDs={activeColumnIDs}>
        {exposedHeadersRowValue}
      </TableData>
      <TableData id={tableColumnInfo[5]} activeColumnIDs={activeColumnIDs}>
        {corsRuleObj?.MaxAgeSeconds ?? 0}
      </TableData>
      <TableData
        id={tableColumnInfo[6]}
        activeColumnIDs={activeColumnIDs}
        className="pf-v5-u-text-align-right"
      >
        <ActionsColumn
          items={getRowActions(
            t,
            navigate,
            launcher,
            mutate,
            noobaaS3,
            bucketName,
            ruleName,
            ruleHash
          )}
        />
      </TableData>
    </>
  );
};

export const CORSRulesList: React.FC<CORSRulesListProps> = ({
  obj: { fresh },
}) => {
  const { t } = useCustomTranslation();
  const { bucketName } = useParams();
  const navigate = useNavigate();
  const launcher = useModal();
  const { noobaaS3 } = React.useContext(NoobaaS3Context);

  const { data, isLoading, error, mutate } = useSWR(
    `${bucketName}-${BUCKET_CORS_RULE_CACHE_KEY_SUFFIX}`,
    () => noobaaS3.getBucketCors({ Bucket: bucketName }),
    {
      shouldRetryOnError: false,
    }
  );

  const corsRules = data?.CORSRules || [];
  const loaded = !isLoading && fresh;
  const noCorsRuleExists = isNoCorsRuleError(error) && !corsRules.length;
  const createCorsRuleLink = `${BUCKETS_BASE_ROUTE}/${bucketName}/permissions/CORS/create/~new`;

  const [unfilteredCorsRules, filteredCorsRules, onFilterChange] =
    useListPageFilter(corsRules, nameFilterOverride);

  React.useEffect(() => {
    if (!fresh) mutate();
  }, [fresh, mutate]);

  if (!loaded || (error && !noCorsRuleExists)) {
    return (
      <StatusBox
        loaded={loaded}
        loadError={!loaded ? '' : error}
        skeleton={<div className="loading-skeleton--table pf-v5-u-mt-lg" />}
      />
    );
  }

  return (
    <>
      <ListPageHeader title={t('Cross Origin Resource Sharing (CORS)')}>
        {!!corsRules.length && (
          <ListPageCreateLink to={createCorsRuleLink}>
            {t('Create CORS rule')}
          </ListPageCreateLink>
        )}
      </ListPageHeader>
      <ListPageBody>
        {!corsRules.length ? (
          <EmptyPage
            title={t('You do not have any CORS rule.')}
            buttonText={t('Create lifecycle rule')}
            onClick={() => navigate(createCorsRuleLink)}
            isLoaded
            canAccess
          />
        ) : (
          <>
            <ListPageFilter
              data={unfilteredCorsRules}
              loaded
              hideLabelFilter={true}
              onFilterChange={onFilterChange}
              hideColumnManagement={true}
            />
            <RulesTable
              data={filteredCorsRules}
              unfilteredData={corsRules}
              loaded
              loadError={null}
              rowData={{ navigate, launcher, mutate, noobaaS3, bucketName }}
            />
          </>
        )}
      </ListPageBody>
    </>
  );
};
