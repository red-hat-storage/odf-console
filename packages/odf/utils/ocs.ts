import { CEPH_STORAGE_NAMESPACE } from '@odf/shared/constants';
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
import { humanizeCpuCores, convertToBaseValue } from '@odf/shared/utils';
import { humanizeBinaryBytes } from '@odf/shared/utils';
import {
  k8sPatch,
  MatchExpression,
} from '@openshift-console/dynamic-plugin-sdk';
import * as _ from 'lodash';
import {
  HOSTNAME_LABEL_KEY,
  LABEL_OPERATOR,
  MINIMUM_NODES,
  ocsTaint,
  OCS_PROVISIONERS,
  RACK_LABEL,
  ZONE_LABELS,
} from '../constants';

const NODE_ROLE_PREFIX = 'node-role.kubernetes.io/';

const getPVStorageClass = (pv) => pv?.spec?.storageClassName;

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

const getRack = (node: NodeKind) => node.metadata.labels?.[RACK_LABEL];

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

export const isFlexibleScaling = (nodes: number, zones: number): boolean =>
  !!(nodes >= MINIMUM_NODES && zones < 3);

export const shouldDeployAsMinimal = (
  cpu: number,
  memory: number,
  nodesCount: number
): boolean => {
  if (nodesCount >= MINIMUM_NODES) {
    const humanizedMem = humanizeBinaryBytes(memory, null, 'GiB').value;
    return cpu < 30 || humanizedMem < 72;
  }
  return false;
};

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

export const nodesWithoutTaints = (nodes: NodeKind[] = []) =>
  nodes.filter((node: NodeKind) => hasOCSTaint(node) || hasNoTaints(node));

export const getNodeCPUCapacity = (node: NodeKind): string =>
  _.get(node.status, 'capacity.cpu');

export const getNodeAllocatableMemory = (node: NodeKind): string =>
  _.get(node.status, 'allocatable.memory');

export const hasNoTaints = (node: NodeKind) => {
  return _.isEmpty(node.spec?.taints);
};

export const getNodeRole = (node: NodeKind): string =>
  getNodeRoles(node).includes('master') ? 'master' : 'worker';

export const getNodeRoles = (node: NodeKind): string[] => {
  const labels = _.get(node, 'metadata.labels');
  return _.reduce(
    labels,
    (acc: string[], v: string, k: string) => {
      if (k.startsWith(NODE_ROLE_PREFIX)) {
        acc.push(k.slice(NODE_ROLE_PREFIX.length));
      }
      return acc;
    },
    []
  );
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
  );

export const getCurrentDeviceSetIndex = (
  deviceSets: DeviceSet[],
  selectedSCName: string
): number =>
  deviceSets.findIndex(
    (ds) => ds.dataPVCTemplate.spec.storageClassName === selectedSCName
  );

export const createDeviceSet = (
  scName: string,
  osdSize: string,
  portable: boolean,
  replica: number,
  count: number,
  resources?: ResourceConstraints
): DeviceSet => ({
  name: `ocs-deviceset-${scName}`,
  count,
  portable,
  replica,
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

export const filterSC = (sc: StorageClassResourceKind) =>
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

export const labelOCSNamespace = (): Promise<any> =>
  k8sPatch({
    model: NamespaceModel,
    resource: {
      metadata: {
        name: CEPH_STORAGE_NAMESPACE,
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
