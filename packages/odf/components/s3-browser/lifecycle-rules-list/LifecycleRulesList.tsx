import * as React from 'react';
import { LifecycleRule } from '@aws-sdk/client-s3';
import { NoobaaS3Context } from '@odf/core/components/s3-browser/noobaa-context';
import { DASH } from '@odf/shared';
import EmptyPage from '@odf/shared/empty-state-page/empty-page';
import { StatusBox } from '@odf/shared/generic/status-box';
import { S3Commands } from '@odf/shared/s3';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
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
import * as _ from 'lodash-es';
import { TFunction } from 'react-i18next';
import {
  useNavigate,
  useParams,
  NavigateFunction,
} from 'react-router-dom-v5-compat';
import useSWR from 'swr';
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
} from '../../../constants';

type LifecycleRulesListProps = {
  obj: { fresh: boolean };
};

type CustomData = {
  navigate: NavigateFunction;
  launcher: LaunchModal;
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

const isRuleScopeGlobal = (rule: LifecycleRule) => {
  const filter = rule.Filter;

  if (!filter) return true;

  if (filter.Prefix === '') return true;

  if (filter.And) {
    const { Prefix, Tags, ObjectSizeGreaterThan, ObjectSizeLessThan } =
      filter.And;

    if (
      !Prefix &&
      _.isEmpty(Tags) &&
      !ObjectSizeGreaterThan &&
      !ObjectSizeLessThan
    ) {
      return true;
    }

    return false;
  }

  if (
    !!filter.Prefix ||
    !_.isEmpty(filter.Tag) ||
    !!filter.ObjectSizeGreaterThan ||
    !!filter.ObjectSizeLessThan
  ) {
    return false;
  }

  return true;
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
  noobaaS3: S3Commands,
  bucketName: string
): IAction[] => [
  {
    title: t('Edit lifecycle rule'),
    onClick: () => false && navigate(''),
  },
  {
    title: t('Delete rule'),
    onClick: () =>
      false &&
      launcher(() => null, {
        isOpen: true,
        extraProps: { noobaaS3, bucketName },
      }),
  },
];

const tableColumnInfo = ['name', 'scope', 'actions', ''];

const RuleRow: React.FC<RowProps<LifecycleRule, CustomData>> = ({
  obj: ruleObj,
  activeColumnIDs,
  rowData,
}) => {
  const { t } = useCustomTranslation();

  const { navigate, launcher, noobaaS3, bucketName } = rowData;

  const expiration = ruleObj.Expiration;
  const expirationDays = expiration?.Days;
  const expiredObjectDeleteMarker = expiration?.ExpiredObjectDeleteMarker;
  const noncurrentVersionExpiration = ruleObj.NoncurrentVersionExpiration;
  const abortIncompleteMultipartUpload = ruleObj.AbortIncompleteMultipartUpload;

  return (
    <>
      <TableData id={tableColumnInfo[0]} activeColumnIDs={activeColumnIDs}>
        {ruleObj?.ID || DASH}
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
          items={getRowActions(t, navigate, launcher, noobaaS3, bucketName)}
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
  const noRuleExists =
    error?.name === 'NoSuchLifecycleConfiguration' && !rules.length;
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
              rowData={{ navigate, launcher, noobaaS3, bucketName }}
            />
          </>
        )}
      </ListPageBody>
    </>
  );
};
