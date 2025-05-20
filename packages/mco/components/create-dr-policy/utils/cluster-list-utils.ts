import { ConnectedClient, ODFInfoYamlObject } from '@odf/mco/types';
import {
  getMajorVersion,
  ValidateManagedClusterCondition,
  isMinimumSupportedODFVersion,
  getNameNamespace,
} from '@odf/mco/utils';
import {
  getLabel,
  getName,
  getNamespace,
  getResourceCondition,
} from '@odf/shared/selectors';
import { ConfigMapKind } from '@odf/shared/types';
import { sortRows } from '@odf/shared/utils';
import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk';
import { load } from 'js-yaml';
import * as _ from 'lodash-es';
import { TFunction } from 'react-i18next';
import {
  MAX_ALLOWED_CLUSTERS,
  MANAGED_CLUSTER_JOINED,
  MANAGED_CLUSTER_CONDITION_AVAILABLE,
  CLUSTER_ID,
  MANAGED_CLUSTER_VIEW_PROCESSING,
} from '../../../constants';
import {
  ACMManagedClusterKind,
  ACMManagedClusterViewKind,
} from '../../../types';
import { ManagedClusterInfoType, ODFConfigInfoType } from '../utils/reducer';

export const INITIAL_PAGE_NUMBER = 1;
export const COUNT_PER_PAGE_NUMBER = 10;

export enum ClusterListColumns {
  ManagedCluster,
  AvailabilityStatus,
  DataFoundation,
  StorageClients,
}

export const getColumns = (t: TFunction<string>) => [
  {
    columnName: t('Managed Cluster'),
    sortFunction: (a, b, c) => sortRows(a, b, c, 'metadata.name'),
  },
  {
    columnName: t('Availability status'),
    sortFunction: (a, b, c) => sortRows(a, b, c, 'isManagedClusterAvailable'),
  },
  {
    columnName: t('Data Foundation'),
    sortFunction: (a, b, c) => sortRows(a, b, c, 'odfInfo.odfVersion'),
  },
  {
    columnName: t('Storage clients'),
    sortFunction: (a, b, c) => sortRows(a, b, c, 'metadata.name'),
  },
];

export const getColumnHelper = (
  name: ClusterListColumns,
  t: TFunction<string>
) => {
  const columns = getColumns(t);
  switch (name) {
    case ClusterListColumns.ManagedCluster:
      return columns[0];
    case ClusterListColumns.AvailabilityStatus:
      return columns[1];
    case ClusterListColumns.DataFoundation:
      return columns[2];
    case ClusterListColumns.StorageClients:
      return columns[3];
  }
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
  clusterToODFInfoMap: ClusterToODFInfoMap
): ManagedClusterInfoType => {
  const clusterId = getLabel(cluster, CLUSTER_ID);
  const clusterName = getName(cluster);
  return {
    id: clusterId,
    metadata: cluster.metadata,
    isManagedClusterAvailable: ValidateManagedClusterCondition(
      cluster,
      MANAGED_CLUSTER_CONDITION_AVAILABLE
    ),
    odfInfo:
      clusterToODFInfoMap?.[clusterId] || clusterToODFInfoMap?.[clusterName],
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
  requiredODFVersion: string
): ManagedClusterInfoType[] => {
  const clusterIdToODFInfoMap = clusterToODFInfoMapping(
    mcvs,
    requiredODFVersion
  );
  return managedClusters?.reduce((acc, cluster) => {
    if (ValidateManagedClusterCondition(cluster, MANAGED_CLUSTER_JOINED))
      return [...acc, getManagedClusterInfo(cluster, clusterIdToODFInfoMap)];
    return acc;
  }, []);
};

export const isRowSelectable = (
  cluster: K8sResourceCommon,
  selectedClusters: ManagedClusterInfoType[]
) =>
  selectedClusters.length < MAX_ALLOWED_CLUSTERS ||
  !!selectedClusters.find(
    (selectedCluster) => getName(selectedCluster) === getName(cluster)
  );

type ClusterToODFInfoMap = {
  [clusterId in string]: ODFConfigInfoType;
};
