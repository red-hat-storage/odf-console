import * as React from 'react';
import { pluralize } from '@odf/core/components/utils';
import { DRPolicyModel } from '@odf/shared';
import EmptyPage from '@odf/shared/empty-state-page/empty-page';
import { useAccessReview } from '@odf/shared/hooks/rbac-hook';
import { Kebab } from '@odf/shared/kebab/kebab';
import { getName } from '@odf/shared/selectors';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { referenceForModel } from '@odf/shared/utils';
import {
  ListPageBody,
  ListPageCreateLink,
  VirtualizedTable,
  useListPageFilter,
  ListPageFilter,
  TableData,
  RowProps,
  useActiveColumns,
  TableColumn,
  useK8sWatchResource,
} from '@openshift-console/dynamic-plugin-sdk';
import { Trans } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom-v5-compat';
import { HUB_CLUSTER_NAME, ReplicationType } from '../../constants';
import {
  DRPolicyToAppCount,
  getDRPolicyResourceObj,
  useProtectedApplicationsWatch,
} from '../../hooks';
import { DRPolicyKind } from '../../types';
import { getReplicationType, isDRPolicyValidated } from '../../utils';
import { Header, kebabActionItems, tableColumnInfo } from './helper';
import './drpolicy-list-page.scss';

const DRPolicyRow: React.FC<RowProps<DRPolicyKind, RowData>> = ({
  obj,
  activeColumnIDs,
  rowData,
}) => {
  const { t } = useCustomTranslation();
  const { canDeleteDRPolicy, policyToAppCount, appCountLoadedWOError } =
    rowData;

  const clusterNames = obj?.spec?.drClusters?.map((clusterName) => (
    <p key={clusterName}> {clusterName} </p>
  ));
  const appCount = policyToAppCount?.[getName(obj)] || 0;
  const syncInterval = obj?.spec?.schedulingInterval;
  const replicationType = getReplicationType(obj);

  return (
    <>
      <TableData {...tableColumnInfo[0]} activeColumnIDs={activeColumnIDs}>
        {obj?.metadata?.name}
      </TableData>
      <TableData {...tableColumnInfo[1]} activeColumnIDs={activeColumnIDs}>
        {isDRPolicyValidated(obj) ? t('Validated') : t('Not validated')}
      </TableData>
      <TableData {...tableColumnInfo[2]} activeColumnIDs={activeColumnIDs}>
        {clusterNames}
      </TableData>
      <TableData {...tableColumnInfo[3]} activeColumnIDs={activeColumnIDs}>
        {replicationType === ReplicationType.ASYNC
          ? t('{{async}}, interval: {{syncInterval}}', {
              async: ReplicationType.ASYNC,
              syncInterval,
            })
          : ReplicationType.SYNC}
      </TableData>
      <TableData {...tableColumnInfo[4]} activeColumnIDs={activeColumnIDs}>
        {appCount > 0
          ? pluralize(appCount, t('Application'), t('Applications'), true)
          : '-'}
      </TableData>
      <TableData {...tableColumnInfo[5]} activeColumnIDs={activeColumnIDs}>
        <Kebab
          extraProps={{
            resource: obj,
            resourceModel: DRPolicyModel,
            cluster: HUB_CLUSTER_NAME,
          }}
          customKebabItems={kebabActionItems(
            canDeleteDRPolicy,
            appCount,
            appCountLoadedWOError,
            t
          )}
        />
      </TableData>
    </>
  );
};

const DRPolicyList: React.FC<DRPolicyListProps> = (props) => {
  const { t } = useCustomTranslation();
  const [columns] = useActiveColumns({
    columns: React.useMemo<TableColumn<DRPolicyKind>[]>(() => Header(t), [t]),
    showNamespaceOverride: false,
    columnManagementID: null,
  });

  return (
    <VirtualizedTable
      {...props}
      aria-label={t('DRPolicies')}
      columns={columns}
      Row={DRPolicyRow}
    />
  );
};

export const DRPolicyListPage: React.FC = () => {
  const { t } = useCustomTranslation();
  const [drPolicies, drPoliciesLoaded, drPoliciesLoadError] =
    useK8sWatchResource<DRPolicyKind[]>(getDRPolicyResourceObj());
  const [policyToAppCount, appCountLoadedWOError] =
    useProtectedApplicationsWatch();

  const location = useLocation();
  const drPolicyListPagePath = location.pathname.replace(/\/$/, '');
  const drPolicyCreatePagePath = `${drPolicyListPagePath}/${referenceForModel(
    DRPolicyModel
  )}/~new`;

  const [canDeleteDRPolicy] = useAccessReview(
    {
      group: DRPolicyModel?.apiGroup,
      resource: DRPolicyModel?.plural,
      namespace: null,
      verb: 'delete',
    },
    HUB_CLUSTER_NAME
  );
  const [data, filteredData, onFilterChange] = useListPageFilter(drPolicies);
  const navigate = useNavigate();

  return (
    <ListPageBody>
      {drPolicies?.length === 0 ? (
        // All length 0 cases are handled by EmptyPage
        <EmptyPage
          title={t('No disaster recovery policies yet')}
          buttonText={t('Create DRPolicy')}
          canAccess={!drPoliciesLoadError && drPoliciesLoaded}
          // Stop loading when DRPolicy read is success or any error occured
          // For DRPolicy read permission issue, loaded is always false and error is non empty
          isLoaded={drPoliciesLoaded || !!drPoliciesLoadError}
          onClick={() => navigate(drPolicyCreatePagePath)}
        >
          <Trans t={t}>
            Configure recovery to your failover cluster with a disaster recovery
            policy.
            <br />
            Click the <strong>Create DRPolicy</strong> button to get started.
          </Trans>
        </EmptyPage>
      ) : (
        <>
          <div className="mco-drpolicy-list__header">
            <ListPageFilter
              data={data}
              loaded={!!drPolicies?.length}
              onFilterChange={onFilterChange}
              hideColumnManagement={true}
            />
            <div className="mco-drpolicy-list__createlink">
              <ListPageCreateLink
                to={drPolicyCreatePagePath}
                createAccessReview={{
                  groupVersionKind: referenceForModel(DRPolicyModel),
                }}
              >
                {t('Create DRPolicy')}
              </ListPageCreateLink>
            </div>
          </div>
          <DRPolicyList
            data={filteredData}
            unfilteredData={drPolicies}
            loaded={drPoliciesLoaded}
            loadError={drPoliciesLoadError}
            rowData={{
              canDeleteDRPolicy,
              appCountLoadedWOError,
              policyToAppCount,
            }}
          />
        </>
      )}
    </ListPageBody>
  );
};

type RowData = {
  canDeleteDRPolicy: boolean;
  appCountLoadedWOError: boolean;
  policyToAppCount: DRPolicyToAppCount;
};

type DRPolicyListProps = {
  data: DRPolicyKind[];
  unfilteredData: DRPolicyKind[];
  loaded: boolean;
  loadError: any;
  rowData?: RowData;
};
