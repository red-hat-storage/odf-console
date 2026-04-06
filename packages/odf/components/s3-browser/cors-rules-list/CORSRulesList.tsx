import * as React from 'react';
import { CORSRule, GetBucketCorsCommandOutput } from '@aws-sdk/client-s3';
import { S3Context } from '@odf/core/components/s3-browser/s3-context';
import {
  BUCKET_CORS_RULE_CACHE_KEY_SUFFIX,
  getBucketOverviewBaseRoute,
  RULE_NAME,
  RULE_HASH,
} from '@odf/core/constants';
import DeleteCorsRuleModal from '@odf/core/modals/s3-browser/delete-corsrules/DeleteCorsRuleModal';
import { S3ProviderType } from '@odf/core/types';
import { isAllowAllConfig } from '@odf/core/utils';
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
  Link,
  NavigateFunction,
  useNavigate,
  useParams,
} from 'react-router-dom-v5-compat';
import useSWR, { KeyedMutator } from 'swr';
import { sortable, ActionsColumn, IAction } from '@patternfly/react-table';
import { pluralize } from '../../utils';

// overrides default "name" search filter
const nameFilterOverride: RowFilter<CORSRule>[] = [
  {
    type: 'name',
    filterGroupName: '',
    reducer: () => undefined,
    items: [],
    filter: (filterValue, corsRule) =>
      fuzzyCaseInsensitive(filterValue.selected?.[0], corsRule?.ID || ''),
  },
];

type CORSRulesListProps = {
  obj: { fresh: boolean };
};

type CustomData = {
  navigate: NavigateFunction;
  launcher: LaunchModal;
  mutate: KeyedMutator<GetBucketCorsCommandOutput>;
  s3Client: S3Commands;
  bucketName: string;
};

type CorsRulesTableProps = {
  data: CORSRule[];
  unfilteredData: CORSRule[];
  loaded: boolean;
  loadError: any;
  rowData: CustomData;
};

const getSearchParam = (ruleName: string, ruleHash: number): string =>
  !!ruleName
    ? `${RULE_NAME}=${encodeURIComponent(ruleName)}`
    : `${RULE_HASH}=${ruleHash}`;

export const getRowActions = (
  t: TFunction<string>,
  navigate: NavigateFunction,
  launcher: LaunchModal,
  mutate: KeyedMutator<GetBucketCorsCommandOutput>,
  s3Client: S3Commands,
  bucketName: string,
  ruleName: string,
  ruleHash: number,
  navigateToListPage = false
): IAction[] => {
  const providerType = s3Client.providerType as S3ProviderType;
  const searchParam = getSearchParam(ruleName, ruleHash);
  const editRuleLink = `${getBucketOverviewBaseRoute(bucketName, providerType)}/permissions/cors/edit?${searchParam}`;
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
          extraProps: {
            s3Client,
            bucketName,
            mutate,
            ruleName,
            ruleHash,
            navigateToListPage,
          },
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

const RulesTable: React.FC<CorsRulesTableProps> = (props) => {
  const { t } = useCustomTranslation();

  const tableColumns = React.useMemo<TableColumn<CORSRule>[]>(
    () => [
      {
        title: t('Rule'),
        sort: 'ID',
        transforms: [sortable],
        id: tableColumnInfo[0],
      },
      {
        title: t('Allowed origins'),
        id: tableColumnInfo[1],
      },
      {
        title: t('Allowed methods'),
        id: tableColumnInfo[2],
      },
      {
        title: t('Allowed headers'),
        id: tableColumnInfo[3],
      },
      {
        title: t('Exposed headers'),
        id: tableColumnInfo[4],
      },
      {
        title: t('MaxAgeSeconds'),
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
      aria-label={t('Cors rules list page')}
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

  const { navigate, launcher, mutate, s3Client, bucketName } = rowData;

  const ruleName = corsRuleObj?.ID;
  // allowed-origins
  const allowedOrigins = corsRuleObj?.AllowedOrigins ?? [];
  const allowedOriginsLength = allowedOrigins.length;
  const allowedOriginsRowValue = isAllowAllConfig(allowedOrigins)
    ? t('All origins')
    : pluralize(allowedOriginsLength, t('origin'), t('origins'), true);
  // allowed methods
  const allowedMethodsLength = corsRuleObj.AllowedMethods.length ?? 0;
  const allowedMethodsRowValue = pluralize(
    allowedMethodsLength,
    t('method'),
    t('methods'),
    true
  );
  // allowed-headers
  const allowedHeaders = corsRuleObj?.AllowedHeaders ?? [];
  const allowedHeadersLength = allowedHeaders.length;
  const allowedHeadersRowValue = isAllowAllConfig(allowedHeaders)
    ? t('All headers')
    : pluralize(allowedHeadersLength, t('header'), t('headers'), true);
  // exposed-headers
  const exposedHeadersLength = corsRuleObj?.ExposeHeaders?.length ?? 0;
  const exposedHeadersRowValue = pluralize(
    exposedHeadersLength,
    t('header'),
    t('headers'),
    true
  );

  // fallback if rule name (ID) is missing
  const ruleHash: number = React.useMemo(() => {
    if (!ruleName) {
      return murmur3(JSON.stringify(deepSortObject(corsRuleObj)));
    }
    return null;
  }, [ruleName, corsRuleObj]);

  const providerType = s3Client.providerType as S3ProviderType;
  const detailsPagePath = `${getBucketOverviewBaseRoute(bucketName, providerType)}/permissions/cors/details?${getSearchParam(ruleName, ruleHash)}`;

  return (
    <>
      <TableData id={tableColumnInfo[0]} activeColumnIDs={activeColumnIDs}>
        <Link to={detailsPagePath}>{ruleName || DASH}</Link>
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
        {corsRuleObj?.MaxAgeSeconds ?? DASH}
      </TableData>
      <TableData
        id={tableColumnInfo[6]}
        activeColumnIDs={activeColumnIDs}
        className="pf-v6-u-text-align-right"
      >
        <ActionsColumn
          items={getRowActions(
            t,
            navigate,
            launcher,
            mutate,
            s3Client,
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
  const { s3Client } = React.useContext(S3Context);

  const { data, isLoading, error, mutate } = useSWR(
    `${s3Client.providerType}-${bucketName}-${BUCKET_CORS_RULE_CACHE_KEY_SUFFIX}`,
    () => s3Client.getBucketCors({ Bucket: bucketName }),
    {
      shouldRetryOnError: false,
    }
  );

  const noRuleExistsError = isNoCorsRuleError(error);
  // in case of "noRuleExistsError" error, cache could still have older "data", hence clearing that.
  const corsRules: CORSRule[] = noRuleExistsError ? [] : data?.CORSRules || [];
  const loaded = !isLoading && fresh;
  const providerType = s3Client.providerType as S3ProviderType;
  const createCorsRuleLink = `${getBucketOverviewBaseRoute(bucketName, providerType)}/permissions/cors/create/~new`;

  const [unfilteredCorsRules, filteredCorsRules, onFilterChange] =
    useListPageFilter(corsRules, nameFilterOverride);

  React.useEffect(() => {
    if (!fresh) mutate();
  }, [fresh, mutate]);

  if (!loaded || (error && !noRuleExistsError)) {
    return (
      <StatusBox
        loaded={loaded}
        loadError={!loaded ? '' : error}
        skeleton={<div className="loading-skeleton--table pf-v6-u-mt-lg" />}
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
            buttonText={t('Create CORS rule')}
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
              rowData={{
                navigate,
                launcher,
                mutate,
                s3Client,
                bucketName,
              }}
            />
          </>
        )}
      </ListPageBody>
    </>
  );
};
