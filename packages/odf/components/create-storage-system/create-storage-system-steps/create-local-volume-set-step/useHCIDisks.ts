import * as React from 'react';
import { WizardNodeState } from '@odf/core/components/create-storage-system/reducer';
import { createWizardNodeState } from '@odf/core/components/utils';
import {
  OCS_TOLERATION,
  CONTROL_PLANE,
  cephStorageLabel,
  LABEL_OPERATOR,
  deviceTypeDropdownItems,
} from '@odf/core/constants';
import { HCI_PLATFORM } from '@odf/core/features';
import { useNodesData } from '@odf/core/hooks';
import { NodeData } from '@odf/core/types';
import {
  nodesWithoutTaints,
  nodesIncludingControlPlane,
  getLocalVolumeSetRequestData,
  createLocalVolumeDiscovery,
} from '@odf/core/utils';
import { LocalVolumeDiscovery, LocalVolumeSetModel } from '@odf/shared';
import { StorageClusterKind, Toleration } from '@odf/shared/types';
import { isOcsLabeledNode } from '@odf/shared/utils';
import {
  useFlag,
  k8sCreate,
  k8sList,
} from '@openshift-console/dynamic-plugin-sdk';
import { DiskSize } from '../../../../constants';
import { DiskType, LocalVolumeSetKind } from '../../../../types';

export type HCIDiskProfile = {
  minDiskSize: string;
  maxDiskSize: string;
  diskSizeUnit: DiskSize;
};

const ONE_TIB = 1024 ** 4;

export const deriveHCIDiskProfile = (bmhs: any[]): HCIDiskProfile => {
  let maxDataDisk = 0;

  for (const bmh of bmhs) {
    for (const disk of bmh?.status?.hardware?.storage || []) {
      const size = disk.sizeBytes || 0;
      if (size > ONE_TIB) maxDataDisk = Math.max(maxDataDisk, size);
    }
  }

  // Atollon: 23-26 TiB drives
  if (maxDataDisk > 20 * ONE_TIB)
    return {
      minDiskSize: '22',
      maxDiskSize: '27',
      diskSizeUnit: DiskSize.Ti,
    };
  // Dell/Lenovo 7.68 TB (~6.98 TiB)
  if (maxDataDisk > 5 * ONE_TIB)
    return {
      minDiskSize: '6',
      maxDiskSize: '8',
      diskSizeUnit: DiskSize.Ti,
    };
  // Dell/Lenovo 3.84 TB (~3.49 TiB)
  if (maxDataDisk > 2 * ONE_TIB)
    return {
      minDiskSize: '3',
      maxDiskSize: '5',
      diskSizeUnit: DiskSize.Ti,
    };
  // Fallback: wide open, exclude boot drives only
  return {
    minDiskSize: '1',
    maxDiskSize: '',
    diskSizeUnit: DiskSize.Ti,
  };
};

export const HCI_DISK_DISCOVERY_DEFAULTS = {
  minDiskSize: '1',
  maxDiskSize: '',
  diskSizeUnit: DiskSize.Ti,
  diskType: DiskType.SSD,
  deviceTypes: [deviceTypeDropdownItems.DISK, deviceTypeDropdownItems.PART],
  volumeMode: 'Block',
  volumeSetName: 'ibm-spectrum-fusion-local',
  storageClassName: 'ibm-spectrum-fusion-local',
} as const;

export const CONTROL_PLANE_TOLERATIONS: Toleration[] = [
  {
    key: 'node-role.kubernetes.io/control-plane',
    operator: 'Exists',
    effect: 'NoSchedule',
  },
  {
    key: 'node-role.kubernetes.io/control-plane',
    operator: 'Exists',
    effect: 'NoExecute',
  },
  {
    key: 'node-role.kubernetes.io/master',
    operator: 'Exists',
    effect: 'NoSchedule',
  },
  {
    key: 'node-role.kubernetes.io/master',
    operator: 'Exists',
    effect: 'NoExecute',
  },
];

const HCI_TOLERATIONS: Toleration[] = [
  OCS_TOLERATION,
  ...CONTROL_PLANE_TOLERATIONS,
];

const findExistingLVS = async (
  ns: string
): Promise<LocalVolumeSetKind | undefined> => {
  const allLvs = (await k8sList({
    model: LocalVolumeSetModel,
    queryParams: { ns },
    requestInit: null,
  })) as LocalVolumeSetKind[];
  const expectedName = HCI_DISK_DISCOVERY_DEFAULTS.volumeSetName;
  const expectedSC = HCI_DISK_DISCOVERY_DEFAULTS.storageClassName;
  const storageLabel = cephStorageLabel('');
  return allLvs?.find((lvs) => {
    if (lvs.metadata?.name === expectedName) return true;
    if ((lvs.spec as any)?.storageClassName !== expectedSC) return false;
    return lvs.spec?.nodeSelector?.nodeSelectorTerms?.some((term: any) =>
      term.matchExpressions?.some((expr: any) => expr.key === storageLabel)
    );
  });
};

const MIN_DATA_ZONES = 2;
const MIN_NODES_PER_DATA_ZONE = 2;
const MULTI_ZONE_THRESHOLD = 4;

const isControlPlane = (node: WizardNodeState): boolean =>
  node.roles?.includes(CONTROL_PLANE) || node.roles?.includes('master');

const groupNodesByZone = (
  nodes: WizardNodeState[]
): Record<string, WizardNodeState[]> =>
  nodes.reduce<Record<string, WizardNodeState[]>>((acc, node) => {
    const zone = node.zone;
    if (zone) {
      (acc[zone] ??= []).push(node);
    }
    return acc;
  }, Object.create(null));

const detectArbiterTopology = (
  nodes: WizardNodeState[]
): { isArbiterTopology: boolean; arbiterZone: string } => {
  const zoneMap = groupNodesByZone(nodes);
  const allZones = Object.keys(zoneMap);

  if (allZones.length <= 1 || allZones.length >= MULTI_ZONE_THRESHOLD)
    return { isArbiterTopology: false, arbiterZone: '' };

  const dataZones: string[] = [];
  const arbiterCandidates: string[] = [];

  for (const zone of allZones) {
    const zoneNodes = zoneMap[zone];
    if (zoneNodes.length >= MIN_NODES_PER_DATA_ZONE) {
      dataZones.push(zone);
    } else if (zoneNodes.some(isControlPlane)) {
      arbiterCandidates.push(zone);
    }
  }

  if (dataZones.length >= MIN_DATA_ZONES && arbiterCandidates.length > 0) {
    const arbiterZone = arbiterCandidates.reduce((best, z) =>
      zoneMap[z].length < zoneMap[best].length ? z : best
    );
    return { isArbiterTopology: true, arbiterZone };
  }

  return { isArbiterTopology: false, arbiterZone: '' };
};

export type UseHCIDisksResult = {
  isLoading: boolean;
  error: string;
  discoveryNodes: WizardNodeState[];
  isHCI: boolean;
  lvsExists: boolean;
  createHCILocalVolumeSet: () => Promise<LocalVolumeSetKind | void>;
  storageClusterMutator: (sc: StorageClusterKind) => StorageClusterKind;
};

export const useHCIDisks = ({
  namespace,
  includeControlPlaneNodes = false,
  diskProfile,
  enableDiscovery = true,
}: {
  namespace: string;
  includeControlPlaneNodes?: boolean;
  diskProfile?: HCIDiskProfile;
  enableDiscovery?: boolean;
}): UseHCIDisksResult => {
  const isHCI = useFlag(HCI_PLATFORM);

  const [rawNodes, rawNodesLoaded, rawNodesLoadError] = useNodesData(
    false,
    includeControlPlaneNodes
  );

  const [discoveryInProgress, setDiscoveryInProgress] = React.useState(false);
  const [discoveryError, setDiscoveryError] = React.useState<string>('');
  const [lvsInProgress, setLvsInProgress] = React.useState(false);
  const [lvsError, setLvsError] = React.useState<string>('');
  const [lvsExists, setLvsExists] = React.useState(false);

  const allNodes: WizardNodeState[] = React.useMemo(() => {
    if (!rawNodesLoaded || rawNodesLoadError) return [];
    const nodes = rawNodes as NodeData[];
    return createWizardNodeState(
      includeControlPlaneNodes
        ? nodesIncludingControlPlane(nodes)
        : nodesWithoutTaints(nodes)
    );
  }, [rawNodes, rawNodesLoaded, rawNodesLoadError, includeControlPlaneNodes]);

  const discoveryNodes: WizardNodeState[] = React.useMemo(() => {
    if (!isHCI || !allNodes.length) return [];
    const odfLabeledNodes = allNodes.filter((node) => isOcsLabeledNode(node));
    return odfLabeledNodes.length > 0 ? odfLabeledNodes : allNodes;
  }, [isHCI, allNodes]);

  const controlPlanePresent = React.useMemo(
    () => discoveryNodes.some(isControlPlane),
    [discoveryNodes]
  );

  const arbiter = React.useMemo(
    () => detectArbiterTopology(discoveryNodes),
    [discoveryNodes]
  );

  const discoveryNodesCount = discoveryNodes.length;
  React.useEffect(() => {
    if (!enableDiscovery || !isHCI || !namespace || !discoveryNodesCount)
      return;

    const runDiscovery = async () => {
      setDiscoveryInProgress(true);
      setDiscoveryError('');
      try {
        const existing = (await k8sList({
          model: LocalVolumeDiscovery,
          queryParams: { ns: namespace },
          requestInit: null,
        })) as any[];
        const storageLabel = cephStorageLabel('');
        const ocsLvd = existing?.find(
          (lvd: any) =>
            lvd.spec?.tolerations?.some(
              (t: any) => t.key === OCS_TOLERATION.key
            ) ||
            lvd.spec?.nodeSelector?.nodeSelectorTerms?.some((term: any) =>
              term.matchExpressions?.some(
                (expr: any) => expr.key === storageLabel
              )
            )
        );
        if (ocsLvd) {
          const lvdHostNames: Set<string> = new Set(
            ocsLvd.spec?.nodeSelector?.nodeSelectorTerms?.flatMap(
              (term: any) =>
                term.matchExpressions
                  ?.filter(
                    (expr: any) =>
                      expr.key === 'kubernetes.io/hostname' &&
                      expr.operator === 'In'
                  )
                  ?.flatMap((expr: any) => expr.values || []) || []
            ) || []
          );
          const allCovered =
            lvdHostNames.size === 0 ||
            discoveryNodes.every((n) => lvdHostNames.has(n.hostName));
          if (allCovered) {
            setDiscoveryInProgress(false);
            return;
          }
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('HCI: failed to list existing LVD, will create new', err);
      }

      const hostNames = discoveryNodes.map((node) => node.hostName);
      try {
        await createLocalVolumeDiscovery(hostNames, namespace, HCI_TOLERATIONS);
      } catch (createErr: any) {
        setDiscoveryError(createErr?.message || String(createErr));
      } finally {
        setDiscoveryInProgress(false);
      }
    };

    runDiscovery();
  }, [enableDiscovery, isHCI, namespace, discoveryNodesCount, discoveryNodes]);

  React.useEffect(() => {
    if (!isHCI || !namespace) return;
    findExistingLVS(namespace)
      .then((found) => {
        if (found) setLvsExists(true);
      })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.error('Failed to find existing LVS', err);
      });
  }, [isHCI, namespace]);

  const createHCILocalVolumeSet =
    React.useCallback(async (): Promise<LocalVolumeSetKind | void> => {
      if (!isHCI || !discoveryNodes.length || !namespace) return;

      setLvsInProgress(true);
      setLvsError('');

      try {
        const existing = await findExistingLVS(namespace);
        if (existing) {
          setLvsExists(true);
          setLvsInProgress(false);
          return existing;
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn(
          'HCI: failed to check for existing LVS, will create new',
          err
        );
      }

      const d = HCI_DISK_DISCOVERY_DEFAULTS;
      const storageLabel = cephStorageLabel('');
      const nodeHostNames = discoveryNodes.map((node) => node.hostName);

      const requestData = getLocalVolumeSetRequestData(
        {
          volumeSetName: d.volumeSetName,
          storageClassName: d.storageClassName,
          diskMode: d.volumeMode,
          deviceType: d.deviceTypes,
          diskType: d.diskType,
          minDiskSize: diskProfile?.minDiskSize ?? d.minDiskSize,
          maxDiskSize: diskProfile?.maxDiskSize ?? d.maxDiskSize,
          diskSizeUnit: diskProfile?.diskSizeUnit ?? d.diskSizeUnit,
          fsType: '',
        },
        nodeHostNames,
        namespace,
        HCI_TOLERATIONS
      );

      requestData.spec.nodeSelector = {
        nodeSelectorTerms: [
          {
            matchExpressions: [
              {
                key: storageLabel,
                operator: LABEL_OPERATOR,
                values: [''],
              },
            ],
          },
        ],
      };

      try {
        const result = (await k8sCreate({
          model: LocalVolumeSetModel,
          data: requestData,
        })) as LocalVolumeSetKind;
        setLvsExists(true);
        return result;
      } catch (err: any) {
        const msg = err?.message || JSON.stringify(err);
        setLvsError(msg);
        throw err;
      } finally {
        setLvsInProgress(false);
      }
    }, [isHCI, discoveryNodes, namespace, diskProfile]);

  const storageClusterMutator = React.useCallback(
    (sc: StorageClusterKind): StorageClusterKind => {
      let result = sc;

      if (controlPlanePresent) {
        const existingTolerations: Toleration[] =
          (result.spec as any).placement?.all?.tolerations ?? [];
        result = {
          ...result,
          spec: {
            ...result.spec,
            placement: {
              ...(result.spec as any).placement,
              all: {
                ...(result.spec as any).placement?.all,
                tolerations: [
                  ...existingTolerations,
                  ...CONTROL_PLANE_TOLERATIONS,
                ],
              },
            },
          } as StorageClusterKind['spec'],
        };
      }

      if (arbiter.isArbiterTopology) {
        result = {
          ...result,
          spec: {
            ...result.spec,
            arbiter: {
              ...result.spec.arbiter,
              enable: true,
            },
            nodeTopologies: {
              ...result.spec.nodeTopologies,
              arbiterLocation: arbiter.arbiterZone,
            },
          },
        };
      }

      return result;
    },
    [controlPlanePresent, arbiter]
  );

  const isLoading = !rawNodesLoaded || discoveryInProgress || lvsInProgress;
  const error = rawNodesLoadError?.message || discoveryError || lvsError || '';

  return {
    isLoading,
    error,
    discoveryNodes,
    isHCI,
    lvsExists,
    createHCILocalVolumeSet,
    storageClusterMutator,
  };
};
