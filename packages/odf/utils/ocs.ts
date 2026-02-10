import { WizardNodeState } from '@odf/core/components/create-storage-system/reducer';
import { NodeData, ResourceProfile } from '@odf/core/types';
import { OCS_PROVISIONERS } from '@odf/shared';
import { NamespaceModel } from '@odf/shared/models';
import {
  DeviceSet,
  K8sResourceKind,
  NodeKind,
  ResourceConstraints,
  StorageClassResourceKind,
  StorageClusterKind,
  Taint,
} from '@odf/shared/types';
import {
  humanizeCpuCores,
  convertToBaseValue,
  getRack,
} from '@odf/shared/utils';
import {
  k8sPatch,
  MatchExpression,
} from '@openshift-console/dynamic-plugin-sdk';
import * as _ from 'lodash-es';
import {
  HOSTNAME_LABEL_KEY,
  LABEL_OPERATOR,
  MINIMUM_NODES,
  ocsTaint,
  RESOURCE_PROFILE_REQUIREMENTS_MAP,
  ZONE_LABELS,
} from '../constants';

const getPVStorageClass = (pv) => pv?.spec?.storageClassName;
export const NO_DEVICE_CLASS = '__NO_DEVICE_CLASS__';

const getSelectedNodes = (
  scName: string,
  pvData: K8sResourceKind[],
  nodesData: NodeKind[]
): NodeKind[] => {
  const pvs: K8sResourceKind[] = getSCAvailablePVs(pvData, scName);
  const scNodeNames = getAssociatedNodes(pvs);
  const tableData: NodeKind[] = nodesData.filter(
    (node: NodeKind) =>
      scNodeNames.includes(node.metadata.name) ||
      scNodeNames.includes(node.metadata.labels?.['kubernetes.io/hostname'])
  );
  return tableData;
};

const hasOCSTaint = (node: NodeKind) => {
  const taints: Taint[] = node.spec?.taints || [];
  return taints.some((taint: Taint) => _.isEqual(taint, ocsTaint));
};

const getNodeInfo = (nodes: NodeKind[]) =>
  nodes.reduce(
    (data, node) => {
      const cpus = humanizeCpuCores(Number(getNodeCPUCapacity(node))).value;
      const memoryRaw = getNodeAllocatableMemory(node);
      const memory = convertToBaseValue(memoryRaw);
      const zone = getZone(node);
      data.cpu += cpus;
      data.memory += memory;
      if (zone && (hasOCSTaint(node) || hasNoTaints(node)))
        data.zones.add(zone);
      return data;
    },
    {
      cpu: 0,
      memory: 0,
      zones: new Set<string>(),
    }
  );

const countNodesPerZone = (nodes: NodeKind[]) =>
  nodes.reduce((acc, curr) => {
    const zone = getZone(curr);
    acc.hasOwnProperty(zone) ? (acc[zone] += 1) : (acc[zone] = 1);
    return acc;
  }, {});

const getTopologyInfo = (nodes: NodeKind[]) =>
  nodes.reduce(
    (data, node) => {
      const zone = getZone(node);
      const rack = getRack(node);
      if (zone && (hasOCSTaint(node) || hasNoTaints(node)))
        data.zones.add(zone);
      if (rack && (hasOCSTaint(node) || hasNoTaints(node)))
        data.racks.add(rack);
      return data;
    },
    {
      zones: new Set<string>(),
      racks: new Set<string>(),
    }
  );

export const getAllZone = (nodes: WizardNodeState[]): Set<string> =>
  nodes.reduce(
    (total: Set<string>, { zone }) => (zone ? total.add(zone) : total),
    new Set<string>()
  );

export const isFlexibleScaling = (
  nodes: WizardNodeState[],
  isNoProvisioner: boolean,
  enableArbiter: boolean
): boolean =>
  isNoProvisioner &&
  !enableArbiter &&
  nodes.length >= MINIMUM_NODES &&
  getAllZone(nodes).size < 3;

/**
 * Returns the minimum required resources taking into account the OSD pods.
 * Default requirements assume 3 OSDs deployed.
 */
export const getResourceProfileRequirements = (
  profile: ResourceProfile,
  osdAmount: number
): { minCpu: number; minMem: number } => {
  const { minCpu, minMem, osd } = RESOURCE_PROFILE_REQUIREMENTS_MAP[profile];
  const extraOsds = osdAmount - 3;
  let cpu = minCpu;
  let mem = minMem;
  if (extraOsds > 0) {
    cpu += Math.ceil(extraOsds * osd.cpu);
    mem += Math.ceil(extraOsds * osd.mem);
  }
  return { minCpu: cpu, minMem: mem };
};

/**
 * Checks if the selected nodes' resources meet the minimum requirements of the selected resource profile.
 * @param profile A resource profile.
 * @param cpu The amount CPUs.
 * @param memory The amount of selected nodes' memory in GiB.
 * @param memory The amount of OSD pods.
 * @returns boolean
 */
export const isResourceProfileAllowed = (
  profile: ResourceProfile,
  cpu: number,
  memory: number,
  osdAmount: number
): boolean => {
  const { minCpu, minMem } = getResourceProfileRequirements(profile, osdAmount);

  return cpu >= minCpu && memory >= minMem;
};

export const isValidCapacityAutoScalingConfig = (
  enabled: boolean,
  capacityLimit: string
) => !enabled || !!capacityLimit;

export const getAssociatedNodes = (pvs: K8sResourceKind[]): string[] => {
  const nodes = pvs.reduce((res, pv) => {
    const matchExpressions: MatchExpression[] =
      pv?.spec?.nodeAffinity?.required?.nodeSelectorTerms?.[0]
        ?.matchExpressions || [];
    matchExpressions.forEach(({ key, operator, values }) => {
      if (key === HOSTNAME_LABEL_KEY && operator === LABEL_OPERATOR) {
        values.forEach((value) => res.add(value));
      }
    });
    return res;
  }, new Set<string>());

  return Array.from(nodes);
};

export const nodesWithoutTaints = (nodes: NodeData[] = []): NodeData[] =>
  nodes.filter((node: NodeData) => hasOCSTaint(node) || hasNoTaints(node));

export const getNodeCPUCapacity = (node: NodeKind): string =>
  _.get(node.status, 'capacity.cpu');

export const getNodeMemoryCapacity = (node: NodeKind): string =>
  _.get(node.status, 'capacity.memory');

export const getNodeAllocatableMemory = (node: NodeKind): string =>
  _.get(node.status, 'allocatable.memory');

/**
 * Get the total memory from node metrics or fallback to CR capacity memory.
 */
export const getNodeTotalMemory = (node: NodeData): string => {
  const metricMemory = _.get(node.metrics, 'memory');
  if (!metricMemory || isNaN(Number(metricMemory))) {
    return getNodeMemoryCapacity(node);
  }
  return metricMemory;
};

export const hasNoTaints = (node: NodeKind) => {
  return _.isEmpty(node.spec?.taints);
};

export const checkArbiterCluster = (
  storageCluster: StorageClusterKind
): boolean => storageCluster?.spec?.arbiter?.enable;

export const checkFlexibleScaling = (
  storageCluster: StorageClusterKind
): boolean => storageCluster?.spec?.flexibleScaling;

export const getRequestedPVCSize = (pvc): string =>
  pvc?.spec?.resources?.requests?.storage;

export const getSCAvailablePVs = (pvsData, sc: string) =>
  pvsData.filter(
    (pv) => getPVStorageClass(pv) === sc && pv.status.phase === 'Available'
  ) || [];

export const getCurrentDeviceSetIndex = (
  deviceSets: DeviceSet[],
  selectedSCName: string,
  deviceClass: string
): number =>
  deviceSets.findIndex((ds) => {
    const matchesSC =
      ds.dataPVCTemplate.spec.storageClassName === selectedSCName;

    /* if the deviceClass is noDeviceClassKey, we need match it with an index having empty string. */
    const matchesDeviceClass =
      deviceClass === NO_DEVICE_CLASS
        ? !ds.deviceClass
        : ds.deviceClass === deviceClass;

    return matchesSC && matchesDeviceClass;
  });

export const createDeviceSet = (
  scName: string,
  osdSize: string,
  portable: boolean,
  replica: number,
  count: number,
  resources?: ResourceConstraints,
  deviceClass?: string
): DeviceSet => ({
  name: `ocs-deviceset-${scName}`,
  count,
  portable,
  replica,
  ...(deviceClass && { deviceClass }),
  resources: resources ?? {},
  placement: {},
  dataPVCTemplate: {
    spec: {
      storageClassName: scName,
      accessModes: ['ReadWriteOnce'],
      volumeMode: 'Block',
      resources: {
        requests: {
          storage: osdSize,
        },
      },
    },
  },
});

export const getDeviceSetCount = (pvCount: number, replica: number): number =>
  Math.floor(pvCount / replica) || 1;

export const getOsdAmount = (
  deviceSetCount: number,
  deviceSetReplica: number
) => deviceSetCount * deviceSetReplica;

export const filterSC = (sc: StorageClassResourceKind) =>
  !!sc &&
  !OCS_PROVISIONERS.some((ocsProvisioner: string) =>
    sc?.provisioner?.includes(ocsProvisioner)
  );

export const getZone = (node: NodeKind) =>
  node.metadata.labels?.[ZONE_LABELS[0]] ||
  node.metadata.labels?.[ZONE_LABELS[1]];

export const isArbiterSC = (
  scName: string,
  pvData: K8sResourceKind[],
  nodesData: NodeKind[]
): boolean => {
  const tableData: NodeKind[] = getSelectedNodes(scName, pvData, nodesData);
  const uniqZones: Set<string> = new Set(nodesData.map(getZone));
  const uniqSelectedNodesZones: Set<string> = getNodeInfo(tableData).zones;
  if (_.compact([...uniqZones]).length < 3) return false;
  if (uniqSelectedNodesZones.size !== 2) return false;
  const zonePerNode = countNodesPerZone(tableData);
  return Object.keys(zonePerNode).every((zone) => zonePerNode[zone] >= 2);
};

export const isValidTopology = (
  scName: string,
  pvData: K8sResourceKind[],
  nodesData: NodeKind[]
): boolean => {
  const tableData: NodeKind[] = getSelectedNodes(scName, pvData, nodesData);

  /** For AWS scenario, checking if PVs are in 3 different zones or not
   *  For Baremetal/Vsphere scenario, checking if PVs are in 3 different racks or not
   */
  const { zones, racks } = getTopologyInfo(tableData);
  return zones.size >= MINIMUM_NODES || racks.size >= MINIMUM_NODES;
};

export const labelOCSNamespace = (ns: string): Promise<any> =>
  k8sPatch({
    model: NamespaceModel,
    resource: {
      metadata: {
        name: ns,
      },
    },
    data: [
      {
        op: 'add',
        path: '/metadata/labels',
        value: { 'openshift.io/cluster-monitoring': 'true' },
      },
    ],
  });
