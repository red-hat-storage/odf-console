import * as React from 'react';
import { pluralize } from '@odf/core/components/utils';
import { findMirrorPeerForPair } from '@odf/mco/utils/mirrorpeer';
import {
  deleteS3ConfigurationByName,
  deleteSecretByName,
  getExternalS3SecretName,
} from '@odf/mco/utils/s3-configuration';
import {
  DRPolicyModel,
  ListPageFilterWrapper,
  MirrorPeerModel,
  S3ConfigurationModel,
} from '@odf/shared';
import EmptyPage from '@odf/shared/empty-state-page/empty-page';
import { useAccessReview } from '@odf/shared/hooks/rbac-hook';
import { Kebab } from '@odf/shared/kebab/kebab';
import { getName } from '@odf/shared/selectors';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { isNotFoundError, referenceForModel } from '@odf/shared/utils';
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
  k8sListItems,
} from '@openshift-console/dynamic-plugin-sdk';
import { Trans } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router';
import { HUB_CLUSTER_NAME, ReplicationType } from '../../constants';
import {
  DRPolicyToAppCount,
  getDRPolicyResourceObj,
  useProtectedApplicationsWatch,
} from '../../hooks';
import { DRPolicyKind, MirrorPeerKind, S3ConfigurationKind } from '../../types';
import { getReplicationType, isDRPolicyValidated } from '../../utils';
import { deleteMirrorPeerByName } from '../create-dr-policy/utils/k8s-utils';
import { Header, kebabActionItems, tableColumnInfo } from './helper';
import './drpolicy-list-page.scss';

const ignoreNotFound = (error: unknown) => {
  if (!isNotFoundError(error)) throw error;
};

type SecretRef = { name: string; namespace?: string };

/** Deletes what no remaining DRPolicy uses; keeps failed secret deletes so a retry finishes them. */
export const createPolicyCleanup = () => {
  const pendingSecrets = new Map<string, SecretRef>();

  return async (drp: DRPolicyKind): Promise<void> => {
    const policyClusters = drp.spec?.drClusters ?? [];
    // Listed now, not from watches, so stale data or a failed list can't skip cleanup.
    const [drPolicies, s3Configurations, mirrorPeers] = await Promise.all([
      k8sListItems<DRPolicyKind>({ model: DRPolicyModel, queryParams: {} }),
      k8sListItems<S3ConfigurationKind>({
        model: S3ConfigurationModel,
        queryParams: {},
      }),
      k8sListItems<MirrorPeerKind>({ model: MirrorPeerModel, queryParams: {} }),
    ]);
    const clustersInUse = new Set(
      drPolicies
        .filter(
          (policy) =>
            getName(policy) !== getName(drp) &&
            !policy.metadata?.deletionTimestamp
        )
        .flatMap((policy) => policy.spec?.drClusters ?? [])
    );

    for (const config of s3Configurations) {
      const managedClusters = config.spec?.managedClusters ?? [];
      const isUnused =
        managedClusters.length > 0 &&
        managedClusters.every(
          (cluster) =>
            policyClusters.includes(cluster) && !clustersInUse.has(cluster)
        );
      // eslint-disable-next-line no-continue
      if (!isUnused) continue;

      const name = getName(config);
      // Delete the S3Configuration before the secret it points at.
      // eslint-disable-next-line no-await-in-loop
      await deleteS3ConfigurationByName(name).catch(ignoreNotFound);
      // Only remove a secret this wizard created; a user-supplied one is theirs.
      const secretRef = config.spec?.externalS3?.secretRef;
      if (secretRef?.name === getExternalS3SecretName(name)) {
        pendingSecrets.set(
          `${secretRef.namespace}/${secretRef.name}`,
          secretRef
        );
      }
    }

    for (const [key, { name, namespace }] of pendingSecrets) {
      // eslint-disable-next-line no-await-in-loop
      await deleteSecretByName(name, namespace).catch(ignoreNotFound);
      pendingSecrets.delete(key);
    }

    if (
      policyClusters.length === 2 &&
      policyClusters.every((cluster) => !clustersInUse.has(cluster))
    ) {
      const mirrorPeer = findMirrorPeerForPair(
        policyClusters as [string, string],
        mirrorPeers
      );
      if (mirrorPeer) {
        await deleteMirrorPeerByName(getName(mirrorPeer)).catch(ignoreNotFound);
      }
    }
  };
};

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

  // The modal keeps this instance, so a retry sees the secrets still pending.
  const cleanupAfterDelete = React.useMemo(createPolicyCleanup, []);

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
            cleanupAfterDelete,
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
