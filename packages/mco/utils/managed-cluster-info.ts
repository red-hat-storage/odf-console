import { ClusterProviders } from '@odf/mco/hooks/use-storage-provisioner';
import {
  ACMManagedClusterKind,
  ConnectedClient,
  ManagedClusterInfoType,
  ODFConfigInfoType,
  StorageVendorPresence,
} from '@odf/mco/types';
import { getLabel, getName } from '@odf/shared/selectors';
import { ConfigMapKind } from '@odf/shared/types';
import {
  CLUSTER_ID,
  MANAGED_CLUSTER_CONDITION_AVAILABLE,
  MANAGED_CLUSTER_JOINED,
} from '../constants';
import { getMajorVersion } from './common';
import {
  getNameNamespace,
  isMinimumSupportedODFVersion,
  validateManagedClusterCondition,
} from './disaster-recovery';

type ClientInfo = {
  clusterID: string;
  name: string;
  clientManagedClusterName?: string;
  clientID?: string;
  providerInfo: {
    version: string;
    deploymentType: string;
    cephClusterFSID: string;
    storageProviderEndpoint: string;
    namespacedName: { name: string; namespace: string };
    providerManagedClusterName: string;
  };
};

type IbmStorageScaleInfo = {
  version: string;
  operatorNamespace: string;
  cluster: { name: string };
  sourceManifests: string[];
};

type ClusterStorageInfo = {
  odfInfo?: ODFConfigInfoType;
  odfEntryCount?: number;
  storageProviders?: {
    odf?: StorageVendorPresence;
    scale?: StorageVendorPresence;
  };
};

type ClusterToStorageInfoMap = {
  [clusterNameOrId: string]: ClusterStorageInfo;
};

const ensureStorageInfo = (
  map: ClusterToStorageInfoMap,
  key: string
): ClusterStorageInfo => {
  if (!map[key]) {
    map[key] = { storageProviders: {} };
  } else if (!map[key].storageProviders) {
    map[key].storageProviders = {};
  }
  return map[key];
};

export const getManagedClusterInfoTypes = (
  managedClusters: ACMManagedClusterKind[],
  odfClientInfoConfigMap: ConfigMapKind | undefined,
  scaleInfoConfigMap: ConfigMapKind | undefined,
  requiredODFVersion: string,
  providersByCluster?: ClusterProviders[]
): ManagedClusterInfoType[] => {
  const combinedMap: ClusterToStorageInfoMap = {};
  const odfConfigData = odfClientInfoConfigMap?.data || {};

  Object.entries(odfConfigData).forEach(([key, value]) => {
    try {
      const clientInfo: ClientInfo = JSON.parse(value);
      const [managedClusterName] = key.split('_');
      const version = getMajorVersion(clientInfo.providerInfo.version);
      const isValidODFVersion = isMinimumSupportedODFVersion(
        version,
        requiredODFVersion
      );
      const storageClusterNamespacedName = getNameNamespace(
        clientInfo.providerInfo.namespacedName.name,
        clientInfo.providerInfo.namespacedName.namespace
      );

      const info = ensureStorageInfo(combinedMap, managedClusterName);
      info.odfEntryCount = (info.odfEntryCount || 0) + 1;
      info.odfInfo = {
        odfVersion: version,
        isValidODFVersion,
        storageClusterCount: info.odfEntryCount,
        storageClusterInfo: {
          storageClusterNamespacedName,
          cephFSID: clientInfo.providerInfo.cephClusterFSID,
          deploymentType: clientInfo.providerInfo.deploymentType,
          ...(clientInfo.clientID
            ? {
                clientInfo: {
                  name: clientInfo.name,
                  clusterId: clientInfo.clusterID,
                } as ConnectedClient,
              }
            : {}),
        },
      };
      info.storageProviders!.odf = {
        version,
        clusterName: clientInfo.providerInfo.namespacedName.name,
      };
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to parse ODF client info:', err);
    }
  });

  const scaleConfigData = scaleInfoConfigMap?.data || {};
  Object.entries(scaleConfigData).forEach(([key, value]) => {
    try {
      const scaleInfo: IbmStorageScaleInfo = JSON.parse(value);
      const [managedClusterName] = key.split('_');
      const version = getMajorVersion(scaleInfo.version);

      const info = ensureStorageInfo(combinedMap, managedClusterName);
      info.storageProviders!.scale = {
        version,
        clusterName: scaleInfo.cluster.name,
      };
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to parse IBM Storage Scale info:', err);
    }
  });

  return (managedClusters ?? []).reduce((acc, cluster) => {
    if (!validateManagedClusterCondition(cluster, MANAGED_CLUSTER_JOINED))
      return acc;

    const clusterId = getLabel(cluster, CLUSTER_ID);
    const clusterName = getName(cluster);
    const storageInfo =
      combinedMap[clusterId] || combinedMap[clusterName] || {};
    const providers = providersByCluster?.find(
      (provider) => provider.cluster === clusterName
    )?.providers;

    return [
      ...acc,
      {
        id: clusterId,
        metadata: cluster.metadata,
        isManagedClusterAvailable: validateManagedClusterCondition(
          cluster,
          MANAGED_CLUSTER_CONDITION_AVAILABLE
        ),
        odfInfo: storageInfo.odfInfo,
        storageProviders: storageInfo.storageProviders,
        providers,
        storageProvisionersCount:
          providers?.reduce((sum, provider) => sum + provider.count, 0) ?? 0,
        storageClientsCount: storageInfo.odfInfo?.storageClusterInfo?.clientInfo
          ? 1
          : 0,
      },
    ];
  }, [] as ManagedClusterInfoType[]);
};
