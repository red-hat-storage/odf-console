import * as React from 'react';
import { pluralize } from '@odf/core/components/utils';
import {
  createSecretNameFromS3,
  fetchRamenS3Profiles,
  updateRamenHubOperatorConfig,
} from '@odf/mco/utils/tps-payload-creator';
import {
  DRClusterModel,
  DRPolicyModel,
  MirrorPeerModel,
  SecretModel,
} from '@odf/shared';
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
  k8sDelete,
} from '@openshift-console/dynamic-plugin-sdk';
import { Trans } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom-v5-compat';
import {
  HUB_CLUSTER_NAME,
  ODFMCO_OPERATOR_NAMESPACE,
  ReplicationType,
} from '../../constants';
import {
  DRPolicyToAppCount,
  getDRPolicyResourceObj,
  useProtectedApplicationsWatch,
} from '../../hooks';
import { DRClusterKind, DRPolicyKind, MirrorPeerKind } from '../../types';
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
    unpairedDRClusters,
  } = rowData;

  const clusterNames = obj?.spec?.drClusters?.map((clusterName) => (
    <p key={clusterName}> {clusterName} </p>
  ));
  const appCount = policyToAppCount?.[getName(obj)] || 0;
  const syncInterval = obj?.spec?.schedulingInterval;
  const replicationType = getReplicationType(obj);

  const cleanupDRCluster = React.useCallback(
    async (drp: DRPolicyKind) => {
      for (const drClusterName of drp.spec?.drClusters ?? []) {
        const associatedPolicies = drClusterToPoliciesMap[drClusterName] || [];
        // If more than one DRPolicy is using the same DRCluster, then only the last DRPolicy deleting will be doing the cleanup of DRCluster and its associated resources
        if (associatedPolicies.length === 1) {
          const drClusterToCleanup = unpairedDRClusters.find(
            (dc) => dc.metadata?.name === drClusterName
          );
          if (drClusterToCleanup) {
            const s3ProfileName = drClusterToCleanup?.spec?.s3ProfileName;
            // eslint-disable-next-line no-await-in-loop
            const ramenS3Profiles = await fetchRamenS3Profiles();
            const s3Profile = ramenS3Profiles.find(
              (profile) => profile.s3ProfileName === s3ProfileName
            );
            const { s3Bucket, s3CompatibleEndpoint, s3Region } = s3Profile;
            const secretName = createSecretNameFromS3({
              clusterName: drClusterName,
              bucketName: s3Bucket,
              region: s3Region,
              endpoint: s3CompatibleEndpoint,
              s3ProfileName: s3ProfileName,
            });

            // eslint-disable-next-line no-await-in-loop
            await k8sDelete({
              model: SecretModel,
              resource: {
                metadata: {
                  name: secretName,
                  namespace: ODFMCO_OPERATOR_NAMESPACE,
                },
              },
            });

            // eslint-disable-next-line no-await-in-loop
            await updateRamenHubOperatorConfig({
              namespace: ODFMCO_OPERATOR_NAMESPACE,
              profile: s3Profile,
              remove: true,
            });

            // eslint-disable-next-line no-await-in-loop
            await k8sDelete({
              model: DRClusterModel,
              resource: drClusterToCleanup,
            });
          }
        }
      }
    },
    [drClusterToPoliciesMap, unpairedDRClusters]
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
            cleanupBeforeDelete: cleanupDRCluster,
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

// Get the DRClusters list with no entry in any of the MirrorPeers. It means its self managed setup for ThirdParty DR
/**
 * Returns a list of DRClusterKind objects that are not paired in any MirrorPeerKind.
 *
 * Iterates through the provided mirrorPeers and collects the cluster names from items
 * where the `manageS3` property is falsy (not managed by MirrorPeer, hence candidate for cleanup).
 * Then, filters the drClusters array to include only those clusters whose names are not present
 * in the pairedClusters set.
 *
 * @param drClusters - Array of DRClusterKind objects representing all DR clusters.
 * @param mirrorPeers - Array of MirrorPeerKind objects representing mirror peer relationships.
 * @returns Array of DRClusterKind objects that are not paired in any mirror peer.
 */
const getUnpairedDRClusters = (
  drClusters: DRClusterKind[],
  mirrorPeers: MirrorPeerKind[]
): DRClusterKind[] => {
  const pairedClusters = new Set<string>();
  mirrorPeers.forEach((mp) => {
    const managedS3 = mp?.spec?.manageS3;
    mp?.spec?.items?.forEach((item) => {
      if (managedS3) pairedClusters.add(item.clusterName);
    });
  });
  return drClusters.filter((dc) => !pairedClusters.has(dc.metadata.name));
};

export const DRPolicyListPage: React.FC = () => {
  const { t } = useCustomTranslation();
  const [drPolicies, drPoliciesLoaded, drPoliciesLoadError] =
    useK8sWatchResource<DRPolicyKind[]>(getDRPolicyResourceObj());
  const [policyToAppCount, appCountLoadedWOError] =
    useProtectedApplicationsWatch();

  const [mirrorPeers, mirrorPeerLoaded, mirrorPeerLoadError] =
    useK8sWatchResource<MirrorPeerKind[]>({
      kind: referenceForModel(MirrorPeerModel),
      isList: true,
      namespaced: false,
    });

  const [drClusters, drClustersLoaded, drClustersLoadError] =
    useK8sWatchResource<DRClusterKind[]>({
      kind: referenceForModel(DRClusterModel),
      isList: true,
      namespaced: false,
    });

  // Get the list of DRClusters which are not part of any MirrorPeer. If its part of MirrorPeer, then its managed by ODF itself and hence it will be responsible for cleanup
  // If not part of MirrorPeer, then its self managed ThirdParty DR setup and we need to check if more than one DRPolicy is using the same DRCluster
  const unpairedDRClusters = React.useMemo(() => {
    if (
      drClustersLoaded &&
      mirrorPeerLoaded &&
      !drClustersLoadError &&
      !mirrorPeerLoadError
    ) {
      return getUnpairedDRClusters(drClusters, mirrorPeers);
    }
    return [];
  }, [
    drClusters,
    drClustersLoaded,
    drClustersLoadError,
    mirrorPeers,
    mirrorPeerLoaded,
    mirrorPeerLoadError,
  ]);

  // Map unpaired DRClusters to a list of DRPolicies it is associated with. This means that this DRCluster is part of a ThirdParty DR setup. This is being done to check if more than one DRPolicy is using the same DRCluster
  // which will be deciding factor for cleanup steps while deleting a DRPolicy
  // Only the last DRPolicy using a DRCluster will be doing the cleanup of DRCluster and its associated resources
  const drClusterToPoliciesMap = React.useMemo(() => {
    const map: Record<string, DRPolicyKind[]> = {};
    if (
      unpairedDRClusters.length > 0 &&
      drPoliciesLoaded &&
      !drPoliciesLoadError
    ) {
      unpairedDRClusters.forEach((dc) => {
        const associatedPolicies = drPolicies.filter((policy) =>
          policy.spec?.drClusters?.includes(dc.metadata.name)
        );
        if (associatedPolicies.length > 0) {
          map[dc.metadata?.name] = associatedPolicies;
        }
      });
    }
    return map;
  }, [unpairedDRClusters, drPolicies, drPoliciesLoaded, drPoliciesLoadError]);

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
              drClusterToPoliciesMap,
              unpairedDRClusters,
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
  unpairedDRClusters: DRClusterKind[];
};

type DRPolicyListProps = {
  data: DRPolicyKind[];
  unfilteredData: DRPolicyKind[];
  loaded: boolean;
  loadError: any;
  rowData?: RowData;
};
