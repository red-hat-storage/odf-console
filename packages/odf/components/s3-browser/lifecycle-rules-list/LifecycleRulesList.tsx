import * as React from 'react';
import {
  LifecycleRule,
  GetBucketLifecycleConfigurationCommandOutput,
} from '@aws-sdk/client-s3';
import { NoobaaS3Context } from '@odf/core/components/s3-browser/noobaa-context';
import { DASH } from '@odf/shared';
import EmptyPage from '@odf/shared/empty-state-page/empty-page';
import { StatusBox } from '@odf/shared/generic/status-box';
import { S3Commands } from '@odf/shared/s3';
import { isNoLifecycleRuleError } from '@odf/shared/s3/utils';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { deepSortObject } from '@odf/shared/utils';
import { fuzzyCaseInsensitive } from '@odf/shared/utils';
import {
  ListPageBody,
  ListPageCreateLink,
  ListPageFilter,
  ListPageHeader,
  RowProps,
  TableColumn,
  TableData,
  useActiveColumns,
  useListPageFilter,
  VirtualizedTable,
  RowFilter,
  useModal,
} from '@openshift-console/dynamic-plugin-sdk';
import { LaunchModal } from '@openshift-console/dynamic-plugin-sdk/lib/app/modal-support/ModalProvider';
import { murmur3 } from 'murmurhash-js';
import { TFunction } from 'react-i18next';
import {
  useNavigate,
  useParams,
  NavigateFunction,
} from 'react-router-dom-v5-compat';
import useSWR, { KeyedMutator } from 'swr';
import {
  Popover,
  Button,
  ButtonVariant,
  TextContent,
  Text,
  TextVariants,
} from '@patternfly/react-core';
import { sortable, ActionsColumn, IAction } from '@patternfly/react-table';
import {
  BUCKET_LIFECYCLE_RULE_CACHE_KEY_SUFFIX,
  BUCKETS_BASE_ROUTE,
  RULE_NAME,
  RULE_HASH,
} from '../../../constants';
import DeleteLifecycleRuleModal from '../../../modals/s3-browser/delete-lifecyclerules/DeleteLifecycleRuleModal';
import { isRuleScopeGlobal } from '../../../utils';

type LifecycleRulesListProps = {
  obj: { fresh: boolean };
};

type CustomData = {
  navigate: NavigateFunction;
  launcher: LaunchModal;
  mutate: KeyedMutator<GetBucketLifecycleConfigurationCommandOutput>;
  noobaaS3: S3Commands;
  bucketName: string;
};

type RulesTableProps = {
  data: LifecycleRule[];
  unfilteredData: LifecycleRule[];
  loaded: boolean;
  loadError: any;
  rowData: CustomData;
};

const getRuleActionsCount = (rule: LifecycleRule) => {
  let actionCount = 0;

  if (rule.Expiration) {
    actionCount++;
  }

  if (rule.NoncurrentVersionExpiration) {
    actionCount++;
  }

  if (rule.AbortIncompleteMultipartUpload) {
    actionCount++;
  }

  return actionCount;
};

// overrides default "name" search filter
const nameFilterOverride: RowFilter<LifecycleRule>[] = [
  {
    type: 'name',
    filterGroupName: '',
    reducer: () => undefined,
    items: [],
    filter: (filterValue, lifecycleRule) =>
      fuzzyCaseInsensitive(filterValue.selected?.[0], lifecycleRule?.ID || ''),
  },
];

export const getRowActions = (
  t: TFunction<string>,
  navigate: NavigateFunction,
  launcher: LaunchModal,
  mutate: KeyedMutator<GetBucketLifecycleConfigurationCommandOutput>,
  noobaaS3: S3Commands,
  bucketName: string,
  ruleName: string,
  ruleHash: number
): IAction[] => {
  const searchParam = !!ruleName
    ? `${RULE_NAME}=${encodeURIComponent(ruleName)}`
    : `${RULE_HASH}=${ruleHash}`;
  const editRuleLink = `${BUCKETS_BASE_ROUTE}/${bucketName}/management/lifecycle/edit?${searchParam}`;
  return [
    {
      title: t('Edit lifecycle rule'),
      onClick: () => navigate(editRuleLink),
    },
    {
      title: t('Delete rule'),
      onClick: () =>
        launcher(DeleteLifecycleRuleModal, {
          isOpen: true,
          extraProps: { noobaaS3, bucketName, mutate, ruleName, ruleHash },
        }),
    },
  ];
};

const tableColumnInfo = ['name', 'scope', 'actions', ''];

const RuleRow: React.FC<RowProps<LifecycleRule, CustomData>> = ({
  obj: ruleObj,
  activeColumnIDs,
  rowData,
}) => {
  const { t } = useCustomTranslation();

  const { navigate, launcher, mutate, noobaaS3, bucketName } = rowData;

  const ruleName = ruleObj?.ID;
  const expiration = ruleObj.Expiration;
  const expirationDays = expiration?.Days;
  const expiredObjectDeleteMarker = expiration?.ExpiredObjectDeleteMarker;
  const noncurrentVersionExpiration = ruleObj.NoncurrentVersionExpiration;
  const abortIncompleteMultipartUpload = ruleObj.AbortIncompleteMultipartUpload;

  // fallback if rule name (ID) is missing
  const ruleHash: number = React.useMemo(() => {
    if (!ruleName) {
      return murmur3(JSON.stringify(deepSortObject(ruleObj)));
    }
    return null;
  }, [ruleName, ruleObj]);

  return (
    <>
      <TableData id={tableColumnInfo[0]} activeColumnIDs={activeColumnIDs}>
        {ruleName || DASH}
      </TableData>
      <TableData id={tableColumnInfo[1]} activeColumnIDs={activeColumnIDs}>
        {isRuleScopeGlobal(ruleObj) ? t('Global') : t('Targeted')}
      </TableData>
      <TableData id={tableColumnInfo[2]} activeColumnIDs={activeColumnIDs}>
        <Popover
          headerContent={t('Lifecycle rule actions')}
          bodyContent={
            <>
              {expirationDays && (
                <TextContent className="pf-v5-u-mb-sm">
                  <Text component={TextVariants.h4}>{t('Objects')}</Text>
                  <Text component={TextVariants.small}>
                    {t(
                      'Delete (expire current versions) {{ days }} days after creation.',
                      { days: expirationDays }
                    )}
                  </Text>
                </TextContent>
              )}

              {noncurrentVersionExpiration && (
                <TextContent className="pf-v5-u-mb-sm">
                  <Text component={TextVariants.h4}>
                    {t('Noncurrent versions of objects')}
                  </Text>
                  <Text component={TextVariants.small}>
                    {t(
                      'Delete noncurrent versions {{ days }} days after they become noncurrent, retaining the latest {{ count }} versions.',
                      {
                        days: noncurrentVersionExpiration?.NoncurrentDays || 0,
                        count:
                          noncurrentVersionExpiration?.NewerNoncurrentVersions ||
                          0,
                      }
                    )}
                  </Text>
                </TextContent>
              )}

              {abortIncompleteMultipartUpload && (
                <TextContent className="pf-v5-u-mb-sm">
                  <Text component={TextVariants.h4}>
                    {t('Incomplete multipart uploads')}
                  </Text>
                  <Text component={TextVariants.small}>
                    {t(
                      'Abort incomplete multipart uploads after {{ days }} days.',
                      {
                        days:
                          abortIncompleteMultipartUpload?.DaysAfterInitiation ||
                          0,
                      }
                    )}
                  </Text>
                </TextContent>
              )}

              {expiredObjectDeleteMarker && (
                <TextContent className="pf-v5-u-mb-sm">
                  <Text component={TextVariants.h4}>
                    {t('Expired object delete markers')}
                  </Text>
                  <Text component={TextVariants.small}>
                    {t('Remove delete markers with no noncurrent versions.')}
                  </Text>
                </TextContent>
              )}
            </>
          }
        >
          <Button variant={ButtonVariant.link}>
            {t('{{ actionsCount }} actions', {
              actionsCount: getRuleActionsCount(ruleObj),
            })}
          </Button>
        </Popover>
      </TableData>
      <TableData
        id={tableColumnInfo[3]}
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

const RulesTable: React.FC<RulesTableProps> = (props) => {
  const { t } = useCustomTranslation();
  const tableColumns = React.useMemo<TableColumn<LifecycleRule>[]>(
    () => [
      {
        title: t('Rule name'),
        sort: 'ID',
        transforms: [sortable],
        id: tableColumnInfo[0],
      },
      {
        title: t('Scope'),
        id: tableColumnInfo[1],
      },
      {
        title: t('Rule actions'),
        id: tableColumnInfo[2],
      },
      {
        title: '',
        id: tableColumnInfo[3],
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

export const LifecycleRulesList: React.FC<LifecycleRulesListProps> = ({
  obj: { fresh },
}) => {
  const { t } = useCustomTranslation();

  const { bucketName } = useParams();
  const navigate = useNavigate();
  const launcher = useModal();
  const { noobaaS3 } = React.useContext(NoobaaS3Context);

  const { data, isLoading, error, mutate } = useSWR(
    `${bucketName}-${BUCKET_LIFECYCLE_RULE_CACHE_KEY_SUFFIX}`,
    () => noobaaS3.getBucketLifecycleConfiguration({ Bucket: bucketName }),
    {
      shouldRetryOnError: false,
    }
  );

  const rules = data?.Rules || [];
  const loaded = !isLoading && fresh;
  const noRuleExists = isNoLifecycleRuleError(error) && !rules.length;
  const createRuleLink = `${BUCKETS_BASE_ROUTE}/${bucketName}/management/lifecycle/create/~new`;

  const [unfilteredRules, filteredRules, onFilterChange] = useListPageFilter(
    rules,
    nameFilterOverride
  );

  React.useEffect(() => {
    if (!fresh) mutate();
  }, [fresh, mutate]);

  if (!loaded || (error && !noRuleExists)) {
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
      <ListPageHeader title={t('Lifecycle rules')}>
        {!!rules.length && (
          <ListPageCreateLink to={createRuleLink}>
            {t('Create lifecycle rule')}
          </ListPageCreateLink>
        )}
      </ListPageHeader>
      <ListPageBody>
        {!rules.length ? (
          <EmptyPage
            title={t(
              'No lifecycle rules defined for the objects in your bucket.'
            )}
            buttonText={t('Create lifecycle rule')}
            onClick={() => navigate(createRuleLink)}
            isLoaded
            canAccess
          />
        ) : (
          <>
            <ListPageFilter
              data={unfilteredRules}
              loaded
              hideLabelFilter={true}
              onFilterChange={onFilterChange}
              hideColumnManagement={true}
            />
            <RulesTable
              data={filteredRules}
              unfilteredData={rules}
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
