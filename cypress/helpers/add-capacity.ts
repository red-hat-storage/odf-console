import * as _ from 'lodash-es';

export const createOSDTreeMap = (nodes) =>
  nodes.reduce((acc, curr) => Object.assign(acc, { [curr.id]: curr }), {});

export const getDeviceCount = (storageCluster) =>
  storageCluster?.spec?.storageDeviceSets[0].count;

export const getIds = (nodes, type: string): number[] =>
  nodes.filter((node) => node.type === type).map((node) => node.id);

export const getNewOSDIds = (nodes, osds: number[]): number[] =>
  nodes
    .filter((node) => node.type === 'osd' && osds.indexOf(node.id) === -1)
    .map((node) => node.id);

export const verifyZoneOSDMapping = (
  zones: number[],
  osds: number[],
  osdtree
): boolean => {
  let filteredOsds = [...osds];
  zones.forEach((zone) => {
    const hostId = osdtree[zone].children[0];
    const len = osdtree[hostId].children.length;
    filteredOsds = filteredOsds.filter(
      (osd) => osd !== osdtree[hostId].children[len - 1]
    );
  });

  return filteredOsds.length === 0;
};

export const getPodName = (pod) => pod.metadata.name;

export const getPodRestartCount = (pod) =>
  pod.status.containerStatuses[0].restartCount;

export const getPresentPod = (pods, podName: string) =>
  pods.items.find((pod) => getPodName(pod) === podName);

export const isNodeReady = (node): boolean => {
  const conditions = node.status?.conditions ?? [];
  const readyState: any = _.find(conditions, { type: 'Ready' });

  return readyState && readyState.status === 'True';
};

export const SIZE_MAP = {
  '512Gi': 0.5,
  '2Ti': 2,
  '4Ti': 4,
};

const ZONE_LABELS = [
  'topology.kubernetes.io/zone',
  'failure-domain.beta.kubernetes.io/zone',
];
const RACK_LABEL = 'topology.rook.io/rack';
const MIN_REPLICAS = 3;

/**
 * Counts unique zones (or racks) from ODF-labeled nodes to determine replica count.
 * Expects nodes already filtered by the ODF label (cluster.ocs.openshift.io/openshift-storage).
 */
export const getReplicaCountFromNodes = (odfNodes: any[]): number => {
  const zones = new Set(
    odfNodes
      .map((n) =>
        ZONE_LABELS.reduce((z, l) => z || n.metadata?.labels?.[l], '')
      )
      .filter(Boolean)
  );

  let replicaBase = zones.size;

  if (replicaBase === 0) {
    const racks = new Set(
      odfNodes.map((n) => n.metadata?.labels?.[RACK_LABEL]).filter(Boolean)
    );
    replicaBase = racks.size;
  }

  if (replicaBase < MIN_REPLICAS) replicaBase = MIN_REPLICAS;
  return replicaBase;
};

export const verifyNodeOSDMapping = (
  nodes: number[],
  osds: number[],
  osdtree
): boolean => {
  let filteredOsds = [...osds];
  nodes.forEach((node) => {
    const len = osdtree[node].children.length;
    filteredOsds = filteredOsds.filter(
      (osd) => osd !== osdtree[node].children[len - 1]
    );
  });

  return filteredOsds.length === 0;
};
