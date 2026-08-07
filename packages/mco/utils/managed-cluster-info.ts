import { ClusterProviders } from '@odf/mco/hooks/use-storage-provisioner';
import {
  ACMManagedClusterKind,
  ACMManagedClusterViewKind,
  ConnectedClient,
  ManagedClusterInfoType,
  ODFConfigInfoType,
  ODFInfoYamlObject,
} from '@odf/mco/types';
import {
  getLabel,
  getName,
  getNamespace,
  getResourceCondition,
} from '@odf/shared/selectors';
import { ConfigMapKind } from '@odf/shared/types';
import { load } from 'js-yaml';
import * as _ from 'lodash-es';
import {
  CLUSTER_ID,
  MANAGED_CLUSTER_CONDITION_AVAILABLE,
  MANAGED_CLUSTER_JOINED,
  MANAGED_CLUSTER_VIEW_PROCESSING,
} from '../constants';
import { getMajorVersion } from './common';
import {
  getNameNamespace,
  isMinimumSupportedODFVersion,
  validateManagedClusterCondition,
} from './disaster-recovery';

type ClusterToODFInfoMap = {
  [clusterId in string]: ODFConfigInfoType;
};

const getODFInfo = (
  requiredODFVersion: string,
  odfInfoConfigData: { [key: string]: string }
): [ODFConfigInfoType, ConnectedClient[]] => {
  try {
    // Managed cluster with multiple StorageSystems is not currently supported for DR
    // ToDo: Update this once we add support for multiple clusters
    const odfInfoKey = Object.keys(odfInfoConfigData)[0];
    const odfInfoYaml = odfInfoConfigData[odfInfoKey];
    const odfInfo: ODFInfoYamlObject = load(odfInfoYaml);
    const storageClusterName = odfInfo?.storageCluster?.namespacedName?.name;
    const storageClusterNamespace =
      odfInfo?.storageCluster?.namespacedName?.namespace;

    const odfVersion = getMajorVersion(odfInfo?.version);
    const storageClusterCount = Object.keys(odfInfoConfigData).length;
    const storageClusterNamespacedName = getNameNamespace(
      storageClusterName,
      storageClusterNamespace
    );
    const cephFSID = odfInfo?.storageCluster?.cephClusterFSID;

    const isValidODFVersion = isMinimumSupportedODFVersion(
      odfVersion,
      requiredODFVersion
    );

    const deploymentType = odfInfo?.deploymentType;

    return [
      {
        odfVersion,
        isValidODFVersion,
        storageClusterCount,
        storageClusterInfo: {
          storageClusterNamespacedName,
          cephFSID,
          deploymentType,
        },
      },
      odfInfo?.clients || [],
    ];
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);

    return [
      {
        odfVersion: '',
        isValidODFVersion: false,
        storageClusterCount: 0,
        storageClusterInfo: {
          storageClusterNamespacedName: '',
          cephFSID: '',
          deploymentType: '',
        },
      },
      [],
    ];
  }
};

const getManagedClusterInfo = (
  cluster: ACMManagedClusterKind,
  clusterToODFInfoMap: ClusterToODFInfoMap,
  providersByCluster?: ClusterProviders[]
): ManagedClusterInfoType => {
  const clusterId = getLabel(cluster, CLUSTER_ID);
  const clusterName = getName(cluster);
  const odfInfo =
    clusterToODFInfoMap?.[clusterId] || clusterToODFInfoMap?.[clusterName];
  const providers = providersByCluster?.find(
    (provider) => provider.cluster === clusterName
  )?.providers;
  return {
    id: clusterId,
    metadata: cluster.metadata,
    isManagedClusterAvailable: validateManagedClusterCondition(
      cluster,
      MANAGED_CLUSTER_CONDITION_AVAILABLE
    ),
    odfInfo,
    providers,
    storageProvisionersCount:
      providers?.reduce((acc, provider) => acc + provider.count, 0) ?? 0,
    storageClientsCount: odfInfo?.storageClusterInfo?.clientInfo ? 1 : 0,
  };
};

const clusterToODFInfoMapping = (
  mcvs: ACMManagedClusterViewKind[],
  requiredODFVersion: string
): ClusterToODFInfoMap =>
  mcvs?.reduce((acc, mcv) => {
    const condition = getResourceCondition(
      mcv,
      MANAGED_CLUSTER_VIEW_PROCESSING
    );
    if (condition?.status !== 'True') {
      // early exit for unprocessed mcvs
      return acc;
    }

    const odfInfoConfig = mcv?.status?.result as ConfigMapKind;
    const odfInfoConfigData = odfInfoConfig?.data || {};
    const [odfInfo, clients] = getODFInfo(
      requiredODFVersion,
      odfInfoConfigData
    );
    if (!!clients.length) {
      // Copying the ODF config from provider cluster to client managed clusters.
      // Client managed clusters will use cluster id as key to find the ODF config.
      clients.forEach((client) => {
        const odfInfoCopy = _.cloneDeep(odfInfo);
        odfInfoCopy.storageClusterInfo.clientInfo = client;
        acc[client.clusterId] = odfInfoCopy;
      });
    } else {
      // Non-client managed clusters will use cluster name as key to find the ODF config.
      acc[getNamespace(mcv)] = odfInfo;
    }
    return acc;
  }, {} as ClusterToODFInfoMap);

export const getManagedClusterInfoTypes = (
  managedClusters: ACMManagedClusterKind[],
  mcvs: ACMManagedClusterViewKind[],
  requiredODFVersion: string,
  providersByCluster?: ClusterProviders[]
): ManagedClusterInfoType[] => {
  const clusterIdToODFInfoMap = clusterToODFInfoMapping(
    mcvs,
    requiredODFVersion
  );

  return (managedClusters ?? []).reduce((acc, cluster) => {
    if (validateManagedClusterCondition(cluster, MANAGED_CLUSTER_JOINED))
      return [
        ...acc,
        getManagedClusterInfo(
          cluster,
          clusterIdToODFInfoMap,
          providersByCluster
        ),
      ];
    return acc;
  }, []);
};
