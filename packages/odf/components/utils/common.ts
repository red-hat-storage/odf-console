import {
  NodesPerZoneMap,
  ValidationType,
  EncryptionType,
} from '@odf/core/types';
import { MIN_SPEC_RESOURCES, MIN_DEVICESET_RESOURCES } from '@odf/core/types';
import {
  getNodeCPUCapacity,
  getNodeAllocatableMemory,
  getZone,
  getNodeRoles,
  isFlexibleScaling,
  getDeviceSetCount,
  createDeviceSet,
  shouldDeployAsMinimal,
} from '@odf/core/utils';
import { CEPH_STORAGE_NAMESPACE } from '@odf/shared/constants';
import { OCSStorageClusterModel } from '@odf/shared/models';
import { getLabel, getName, getUID } from '@odf/shared/selectors';
import { NodeKind, StorageClusterKind } from '@odf/shared/types';
import {
  referenceForModel,
  humanizeCpuCores,
  convertToBaseValue,
} from '@odf/shared/utils';
import { Base64 } from 'js-base64';
import * as _ from 'lodash-es';
import {
  MINIMUM_NODES,
  IP_FAMILY,
  NO_PROVISIONER,
  OCS_DEVICE_SET_FLEXIBLE_REPLICA,
  ATTACHED_DEVICES_ANNOTATION,
  OCS_INTERNAL_CR_NAME,
} from '../../constants';
import { IBMFlashSystemModel } from '../../models';
import { SUPPORTED_EXTERNAL_STORAGE } from '../create-storage-system/external-storage';
import { WizardNodeState, WizardState } from '../create-storage-system/reducer';

export const pluralize = (
  count: number,
  singular: string,
  plural: string = `${singular}s`,
  includeCount: boolean = true
) => {
  const pluralized = `${count === 1 ? singular : plural}`;
  return includeCount ? `${count || 0} ${pluralized}` : pluralized;
};

export const getTotalCpu = (nodes: WizardNodeState[]): number =>
  nodes.reduce(
    (total: number, { cpu }) => total + humanizeCpuCores(Number(cpu)).value,
    0
  );

export const getTotalMemory = (nodes: WizardNodeState[]): number =>
  nodes.reduce(
    (total: number, { memory }) => total + convertToBaseValue(memory),
    0
  );

export const getAllZone = (nodes: WizardNodeState[]): Set<string> =>
  nodes.reduce(
    (total: Set<string>, { zone }) => (zone ? total.add(zone) : total),
    new Set<string>()
  );

export const getVendorDashboardLinkFromMetrics = (
  systemType: string,
  systemName: string,
  subComponent?: string
) => {
  const systemKind =
    systemType === 'OCS'
      ? referenceForModel(OCSStorageClusterModel)
      : referenceForModel(IBMFlashSystemModel);
  return `/odf/system/${systemKind}/${systemName}/overview${
    subComponent ? '/' + subComponent : ''
  }`;
};

export const getExternalStorage = (
  id: WizardState['backingStorage']['externalStorage'] = ''
) => SUPPORTED_EXTERNAL_STORAGE.find((p) => p.model.kind === id);

export const createWizardNodeState = (
  nodes: NodeKind[] = []
): WizardNodeState[] =>
  nodes.map((node) => {
    const name = getName(node);
    const hostName = getLabel(node, 'kubernetes.io/hostname', '');
    const cpu = getNodeCPUCapacity(node);
    const memory = getNodeAllocatableMemory(node);
    const zone = getZone(node);
    const uid = getUID(node);
    const roles = getNodeRoles(node).sort();
    const labels = node?.metadata?.labels;
    const taints = node?.spec?.taints;
    return {
      name,
      hostName,
      cpu,
      memory,
      zone,
      uid,
      roles,
      labels,
      taints,
    };
  });

export const calculateRadius = (size: number) => {
  const radius = size / 2;
  const podStatusStrokeWidth = (8 / 104) * size;
  const podStatusInset = (5 / 104) * size;
  const podStatusOuterRadius = radius - podStatusInset;
  const podStatusInnerRadius = podStatusOuterRadius - podStatusStrokeWidth;
  const decoratorRadius = radius * 0.25;

  return {
    radius,
    podStatusInnerRadius,
    podStatusOuterRadius,
    decoratorRadius,
    podStatusStrokeWidth,
    podStatusInset,
  };
};

export const capacityAndNodesValidate = (
  nodes: WizardNodeState[],
  enableStretchCluster: boolean,
  isNoProvSC: boolean
): ValidationType[] => {
  const validations = [];

  const totalCpu = getTotalCpu(nodes);
  const totalMemory = getTotalMemory(nodes);
  const zones = getAllZone(nodes);

  if (
    !enableStretchCluster &&
    isNoProvSC &&
    isFlexibleScaling(nodes.length, zones.size)
  ) {
    validations.push(ValidationType.ATTACHED_DEVICES_FLEXIBLE_SCALING);
  }
  if (shouldDeployAsMinimal(totalCpu, totalMemory, nodes.length)) {
    validations.push(ValidationType.MINIMAL);
  }
  if (!enableStretchCluster && nodes.length && nodes.length < MINIMUM_NODES) {
    validations.push(ValidationType.MINIMUMNODES);
  }
  return validations;
};

export const isValidStretchClusterTopology = (
  nodesPerZoneMap: NodesPerZoneMap,
  allZones: string[]
): boolean => {
  if (allZones.length >= 3) {
    const validNodesWithPVPerZone = allZones.filter(
      (zone) => nodesPerZoneMap[zone] >= 2
    );
    return validNodesWithPVPerZone.length >= 2;
  }
  return false;
};

export const getPVAssociatedNodesPerZone = (
  nodes: WizardNodeState[]
): NodesPerZoneMap =>
  nodes.reduce((data, { zone }) => {
    if (data[zone]) data[zone] += 1;
    else if (zone) data[zone] = 1;
    return data;
  }, {});

export const getZonesFromNodesKind = (nodes: NodeKind[]) =>
  nodes.reduce((data, node) => {
    const zone = getZone(node);
    if (!data.includes(zone)) data.push(zone);
    return data;
  }, []);

export const getIPFamily = (addr: string): IP_FAMILY => {
  const ipPattern = /^[0-9]*\.[0-9]*\.[0-9]*\.[0-9]*$/;
  return ipPattern.test(addr) ? IP_FAMILY.IPV4 : IP_FAMILY.IPV6;
};

export const checkError = (
  data: string = '{}',
  requiredKeys = [],
  requiresEncodingKeys = [],
  ipFamily = IP_FAMILY.IPV4
): string => {
  const parsedData = JSON.parse(data);
  const providedKeys = _.map(parsedData, (item) => item.name);
  const emptyKeys = [];
  const base64ErrorKeys = [];
  _.map(parsedData, (item) => {
    if (_.isEmpty(item.data)) emptyKeys.push(item.name ?? 'Unrecongnized key');
    if (requiresEncodingKeys.includes(item.name)) {
      _.isEmpty(item.data?.userKey) &&
        _.isEmpty(item.data?.adminKey) &&
        base64ErrorKeys.push(item.name ?? 'Unrecognized key');
      try {
        atob(item.data?.userKey ?? item.data?.adminKey);
      } catch (e) {
        base64ErrorKeys.push(item.name ?? 'Unrecognized key');
      }
    }
  });

  // Check for missing keys
  // example required_key = rook-csi-rbd-node providedKey = rook-csi-rbd-node-vavuthupr10278-rbd
  const allRequiredKeys = _.concat(requiredKeys, requiresEncodingKeys);
  const missingKeys = allRequiredKeys?.filter(
    (requiredKey) =>
      !providedKeys?.find((providedKey) => providedKey.includes(requiredKey))
  );
  if (missingKeys.length > 0 && providedKeys.length > 0) {
    return `${_.uniq(missingKeys).join(', ')} ${pluralize(
      _.uniq(missingKeys).length,
      'is',
      'are'
    )} missing.`;
  }

  if (emptyKeys.length > 0) {
    return `${_.uniq(emptyKeys).join(', ')} ${pluralize(
      emptyKeys.length,
      'has',
      'have'
    )} empty ${pluralize(emptyKeys.length, 'value')}.`;
  }

  if (base64ErrorKeys.length > 0) {
    return `${_.uniq(base64ErrorKeys).join(', ')} ${pluralize(
      base64ErrorKeys.length,
      'key'
    )} ${pluralize(
      base64ErrorKeys.length,
      'has',
      'have'
    )} malformed Base64 encoding ${pluralize(
      base64ErrorKeys.length,
      'value'
    )}.`;
  }

  // Check IP Compatibility
  const endpoints = _.find(parsedData, { name: 'rook-ceph-mon-endpoints' });
  const ipAddr = (endpoints as any).data?.data
    ?.split('=')?.[1]
    ?.split(':')?.[0];

  if (ipFamily !== getIPFamily(ipAddr)) {
    return 'The IP Family of the two clusters do not match.';
  }

  return '';
};

export const createDownloadFile = (data: string = ''): string =>
  `data:application/octet-stream;charset=utf-8,${encodeURIComponent(
    Base64.decode(data)
  )}`;

export const isValidJSON = (fData: string): boolean => {
  try {
    JSON.parse(fData);
    return true;
  } catch (e) {
    return false;
  }
};

export const prettifyJSON = (data: string) =>
  _.isEmpty(data)
    ? ''
    : (() => {
        const jsonData = JSON.parse(data);
        let container = ``;
        _.map(
          jsonData,
          (item) =>
            (container += `${_.upperCase(item.name ?? 'Unrecognized key')} = ${
              item.data ? JSON.stringify(item.data) : 'Unrecognized value'
            }\n`)
        );
        return container;
      })();

export const getUniqueZonesSet = (nodes: WizardNodeState[]): Set<string> => {
  const uniqueZonesSet: Set<string> = nodes.reduce((acc, curr) => {
    acc.add(curr.zone);
    return acc;
  }, new Set<string>());
  return uniqueZonesSet;
};

export const getDeviceSetReplica = (
  isStretchCluster: boolean,
  isFlexibleScaling: boolean,
  nodes: WizardNodeState[]
) => {
  const uniqueZonesSet: Set<string> = getUniqueZonesSet(nodes);
  if (isFlexibleScaling) {
    return OCS_DEVICE_SET_FLEXIBLE_REPLICA;
  }
  if (isStretchCluster) {
    return uniqueZonesSet.size + 1;
  }

  return uniqueZonesSet.size;
};

export const getOCSRequestData = (
  storageClass: WizardState['storageClass'],
  storage: string,
  encryption: EncryptionType,
  isMinimal: boolean,
  nodes: WizardNodeState[],
  flexibleScaling = false,
  publicNetwork?: string,
  clusterNetwork?: string,
  kmsEnable?: boolean,
  selectedArbiterZone?: string,
  stretchClusterChecked?: boolean,
  availablePvsCount?: number,
  isMCG?: boolean
): StorageClusterKind => {
  const scName: string = storageClass.name;
  const isNoProvisioner: boolean = storageClass?.provisioner === NO_PROVISIONER;
  const isPortable: boolean = flexibleScaling ? false : !isNoProvisioner;
  const deviceSetReplica: number = getDeviceSetReplica(
    stretchClusterChecked,
    flexibleScaling,
    nodes
  );

  const deviceSetCount = getDeviceSetCount(availablePvsCount, deviceSetReplica);

  const requestData: StorageClusterKind = {
    apiVersion: 'ocs.openshift.io/v1',
    kind: 'StorageCluster',
    metadata: {
      name: OCS_INTERNAL_CR_NAME,
      namespace: CEPH_STORAGE_NAMESPACE,
    },
    spec: {},
  };

  if (isNoProvisioner) {
    // required for disk list page
    requestData.metadata.annotations = {
      [ATTACHED_DEVICES_ANNOTATION]: 'true',
    };
  }

  if (isMCG) {
    // for mcg standalone deployment
    requestData.spec = {
      multiCloudGateway: {
        dbStorageClassName: scName,
        reconcileStrategy: 'standalone',
      },
    };
  } else {
    // for full deployment - ceph + mcg
    requestData.spec = {
      monDataDirHostPath: isNoProvisioner ? '/var/lib/rook' : '',
      manageNodes: false,
      resources: isMinimal ? MIN_SPEC_RESOURCES : {},
      flexibleScaling,
      arbiter: {
        enable: stretchClusterChecked,
      },
      nodeTopologies: {
        arbiterLocation: selectedArbiterZone,
      },
      storageDeviceSets: [
        createDeviceSet(
          scName,
          storage,
          isPortable,
          deviceSetReplica,
          deviceSetCount,
          isMinimal ? MIN_DEVICESET_RESOURCES : {}
        ),
      ],
      ...Object.assign(
        publicNetwork || clusterNetwork
          ? {
              network: {
                provider: 'multus',
                selectors: {
                  ...Object.assign(
                    publicNetwork ? { public: publicNetwork } : {}
                  ),
                  ...Object.assign(
                    clusterNetwork ? { cluster: clusterNetwork } : {}
                  ),
                },
              },
            }
          : {}
      ),
    };
  }

  if (encryption) {
    requestData.spec.encryption = {
      enable: encryption.clusterWide,
      clusterWide: encryption.clusterWide,
      storageClass: encryption.storageClass,
      kms: {
        enable: kmsEnable,
      },
    };
  }

  if (encryption.clusterWide && !kmsEnable) {
    requestData.spec.security = {
      kms: {
        enableKeyRotation: true,
        schedule: '@weekly',
      },
    };
  }

  return requestData;
};
