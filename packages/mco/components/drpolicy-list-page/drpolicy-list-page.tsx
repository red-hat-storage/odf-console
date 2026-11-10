import * as React from 'react';
import { pluralize } from '@odf/core/components/utils';
import {
  deleteS3ConfigurationByName,
  deleteSecretByName,
  getExternalS3SecretName,
} from '@odf/mco/utils/s3-configuration';
import { DRPolicyModel, ListPageFilterWrapper } from '@odf/shared';
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
  TableData,
  RowProps,
  useActiveColumns,
  TableColumn,
  useK8sWatchResource,
} from '@openshift-console/dynamic-plugin-sdk';
import { Trans } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router';
import { HUB_CLUSTER_NAME, ReplicationType } from '../../constants';
import {
  DRPolicyToAppCount,
  getDRPolicyResourceObj,
  getS3ConfigurationResourceObj,
  useProtectedApplicationsWatch,
} from '../../hooks';
import { DRPolicyKind, S3ConfigurationKind } from '../../types';
import { getReplicationType, isDRPolicyValidated } from '../../utils';
import { Header, kebabActionItems, tableColumnInfo } from './helper';
import './drpolicy-list-page.scss';

const DRPolicyRow: React.FC<RowProps<DRPolicyKind, RowData>> = ({
  obj,
  activeColumnIDs,
  rowData,
}) => {
  const { t } = useCustomTranslation();
  const {
    canDeleteDRPolicy,
    policyToAppCount,
    appCountLoadedWOError,
    drClusterToPoliciesMap,
    s3Configurations,
  } = rowData;

  const clusterNames = obj?.spec?.drClusters?.map((clusterName) => (
    <p key={clusterName}> {clusterName} </p>
  ));
  const appCount = policyToAppCount?.[getName(obj)] || 0;
  const syncInterval = obj?.spec?.schedulingInterval;
  const replicationType = getReplicationType(obj);

  // Deletes S3Configurations only this policy used; must run after the DRPolicy
  // is gone, as MCO blocks deletion while a DRPolicy references its clusters.
  const cleanupS3Configurations = React.useCallback(
    async (drp: DRPolicyKind) => {
      const policyClusters = drp.spec?.drClusters ?? [];
      const toDelete = new Map<string, S3ConfigurationKind>();

      policyClusters.forEach((drClusterName) => {
        const associatedPolicies = drClusterToPoliciesMap[drClusterName] || [];
        // Only the last DRPolicy using a cluster cleans up.
        if (associatedPolicies.length !== 1) {
          return;
        }
        const s3Configuration = s3Configurations.find((config) =>
          config.spec?.managedClusters?.includes(drClusterName)
        );
        // A multi-cluster S3Configuration goes only when no cluster is still covered.
        const isStillInUse = s3Configuration?.spec?.managedClusters?.some(
          (clusterName) =>
            !policyClusters.includes(clusterName) ||
            (drClusterToPoliciesMap[clusterName] || []).length > 1
        );
        if (s3Configuration && !isStillInUse) {
          toDelete.set(getName(s3Configuration), s3Configuration);
        }
      });

      for (const config of toDelete.values()) {
        const name = getName(config);
        // Only remove a secret this wizard created; a user-supplied one is theirs.
        const secretRef = config.spec?.externalS3?.secretRef;
        if (secretRef?.name === getExternalS3SecretName(name)) {
          // eslint-disable-next-line no-await-in-loop
          await deleteSecretByName(secretRef.name, secretRef.namespace).catch(
            (e) => {
              if (e?.response?.status !== 404) throw e;
            }
          );
        }
        // eslint-disable-next-line no-await-in-loop
        await deleteS3ConfigurationByName(name);
      }
    },
    [drClusterToPoliciesMap, s3Configurations]
  );

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
            cleanupAfterDelete: cleanupS3Configurations,
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

  const [s3Configurations] = useK8sWatchResource<S3ConfigurationKind[]>(
    getS3ConfigurationResourceObj()
  );

  // Reference count clusters against the policies using them.
  const drClusterToPoliciesMap = React.useMemo(() => {
    const map: Record<string, DRPolicyKind[]> = {};
    if (drPoliciesLoaded && !drPoliciesLoadError) {
      drPolicies.forEach((policy) => {
        policy.spec?.drClusters?.forEach((clusterName) => {
          map[clusterName] = [...(map[clusterName] ?? []), policy];
        });
      });
    }
    return map;
  }, [drPolicies, drPoliciesLoaded, drPoliciesLoadError]);

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
            <ListPageFilterWrapper
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
              drClusterToPoliciesMap,
              s3Configurations,
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
  drClusterToPoliciesMap: Record<string, DRPolicyKind[]>;
  s3Configurations: S3ConfigurationKind[];
};

type DRPolicyListProps = {
  data: DRPolicyKind[];
  unfilteredData: DRPolicyKind[];
  loaded: boolean;
  loadError: any;
  rowData?: RowData;
};
