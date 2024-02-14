import {
  NodesPerZoneMap,
  ValidationType,
  EncryptionType,
  ResourceProfile,
} from '@odf/core/types';
import {
  getNodeCPUCapacity,
  getNodeAllocatableMemory,
  getZone,
  isFlexibleScaling,
  getDeviceSetCount,
  createDeviceSet,
  isResourceProfileAllowed,
} from '@odf/core/utils';
import { StorageClassWizardStepExtensionProps as ExternalStorage } from '@odf/odf-plugin-sdk/extensions';
import {
  NOOBAA_EXTERNAL_PG_TLS_SECRET_NAME,
  NOOBA_EXTERNAL_PG_SECRET_NAME,
} from '@odf/shared/constants';
import {
  getLabel,
  getName,
  getNamespace,
  getUID,
  getAnnotations,
} from '@odf/shared/selectors';
import {
  NetworkAttachmentDefinitionKind,
  NodeKind,
  StorageClusterKind,
} from '@odf/shared/types';
import {
  getNodeRoles,
  humanizeCpuCores,
  convertToBaseValue,
  getRack,
  humanizeBinaryBytes,
} from '@odf/shared/utils';
import { Base64 } from 'js-base64';
import * as _ from 'lodash-es';
import {
  MINIMUM_NODES,
  IP_FAMILY,
  NO_PROVISIONER,
  OCS_DEVICE_SET_FLEXIBLE_REPLICA,
  OCS_DEVICE_SET_MINIMUM_REPLICAS,
  ATTACHED_DEVICES_ANNOTATION,
  DISASTER_RECOVERY_TARGET_ANNOTATION,
} from '../../constants';
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

export const getTotalMemoryInGiB = (nodes: WizardNodeState[]): number =>
  humanizeBinaryBytes(getTotalMemory(nodes), null, 'GiB').value;

export const getAllZone = (nodes: WizardNodeState[]): Set<string> =>
  nodes.reduce(
    (total: Set<string>, { zone }) => (zone ? total.add(zone) : total),
    new Set<string>()
  );

export const getVendorDashboardLinkFromMetrics = (
  systemKind: string,
  systemName: string,
  systemNamespace: string,
  subComponent?: string
) =>
  `/odf/system/ns/${systemNamespace}/${systemKind}/${systemName}/overview${
    subComponent ? '/' + subComponent : ''
  }`;

export const getExternalStorage = (
  id: WizardState['backingStorage']['externalStorage'] = '',
  supportedExternalStorage: ExternalStorage[]
) => supportedExternalStorage.find((p) => p.model.kind === id);

export const createWizardNodeState = (
  nodes: NodeKind[] = []
): WizardNodeState[] =>
  nodes.map((node) => {
    const name = getName(node);
    const hostName = getLabel(node, 'kubernetes.io/hostname', '');
    const cpu = getNodeCPUCapacity(node);
    const memory = getNodeAllocatableMemory(node);
    const zone = getZone(node);
    const rack = getRack(node);
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
      rack,
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
  isNoProvSC: boolean,
  resourceProfile: ResourceProfile
): ValidationType[] => {
  const validations = [];

  const totalCpu = getTotalCpu(nodes);
  const totalMemory = getTotalMemoryInGiB(nodes);
  const zones = getAllZone(nodes);

  if (
    !enableStretchCluster &&
    isNoProvSC &&
    isFlexibleScaling(nodes.length, zones.size)
  ) {
    validations.push(ValidationType.ATTACHED_DEVICES_FLEXIBLE_SCALING);
  }
  if (!enableStretchCluster && nodes.length && nodes.length < MINIMUM_NODES) {
    validations.push(ValidationType.MINIMUMNODES);
  } else if (nodes.length && nodes.length >= MINIMUM_NODES) {
    if (!isResourceProfileAllowed(resourceProfile, totalCpu, totalMemory)) {
      validations.push(ValidationType.RESOURCE_PROFILE);
    } else if (
      resourceProfile === ResourceProfile.Lean &&
      !isResourceProfileAllowed(ResourceProfile.Balanced, totalCpu, totalMemory)
    ) {
      validations.push(ValidationType.MINIMAL);
    }
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

const getUniqueZonesSet = (nodes: WizardNodeState[]): Set<string> => {
  return nodes.reduce((acc, curr) => {
    !!curr.zone && acc.add(curr.zone);
    return acc;
  }, new Set<string>());
};

const getUniqueRacksSet = (nodes: WizardNodeState[]): Set<string> => {
  return nodes.reduce((acc, curr) => {
    !!curr.rack && acc.add(curr.rack);
    return acc;
  }, new Set<string>());
};

export const getReplicasFromSelectedNodes = (
  nodes: WizardNodeState[]
): number => {
  const zones = getUniqueZonesSet(nodes);
  let replicas = zones.size;
  // If there are no zones, look for racks.
  if (!replicas) {
    const racks = getUniqueRacksSet(nodes);
    replicas = racks.size;
  }
  // When there are not enough zones/racks, we set the minimum replicas.
  // When there are more than 3 zones/racks, we set one OSD for each zone/rack.
  return replicas < OCS_DEVICE_SET_MINIMUM_REPLICAS
    ? OCS_DEVICE_SET_MINIMUM_REPLICAS
    : replicas;
};

export const getDeviceSetReplica = (
  isStretchCluster: boolean,
  isFlexibleReplicaScaling: boolean,
  nodes: WizardNodeState[]
) => {
  if (isFlexibleReplicaScaling) {
    return OCS_DEVICE_SET_FLEXIBLE_REPLICA;
  }
  const replicas = getReplicasFromSelectedNodes(nodes);
  if (isStretchCluster) {
    return replicas + 1;
  }

  return replicas;
};

const generateNetworkCardName = (resource: NetworkAttachmentDefinitionKind) =>
  `${getNamespace(resource)}/${getName(resource)}`;

type OCSRequestData = {
  storageClass: WizardState['storageClass'];
  storage: string;
  encryption: EncryptionType;
  resourceProfile: ResourceProfile;
  nodes: WizardNodeState[];
  flexibleScaling: boolean;
  publicNetwork?: NetworkAttachmentDefinitionKind;
  clusterNetwork?: NetworkAttachmentDefinitionKind;
  kmsEnable?: boolean;
  selectedArbiterZone?: string;
  stretchClusterChecked?: boolean;
  availablePvsCount?: number;
  isMCG?: boolean;
  isNFSEnabled?: boolean;
  shouldSetCephRBDAsDefault?: boolean;
  enableRDRPreparation?: boolean;
  storageClusterNamespace: string;
  useExternalPostgres?: boolean;
  allowNoobaaPostgresSelfSignedCerts?: boolean;
  enableNoobaaClientSideCerts?: boolean;
  storageClusterName: string;
};

export const getOCSRequestData = ({
  storageClass,
  storage,
  encryption,
  resourceProfile,
  nodes,
  flexibleScaling,
  publicNetwork,
  clusterNetwork,
  kmsEnable,
  selectedArbiterZone,
  stretchClusterChecked,
  availablePvsCount,
  isMCG,
  isNFSEnabled,
  shouldSetCephRBDAsDefault,
  enableRDRPreparation,
  storageClusterNamespace,
  useExternalPostgres,
  allowNoobaaPostgresSelfSignedCerts,
  enableNoobaaClientSideCerts,
  storageClusterName,
}: OCSRequestData): StorageClusterKind => {
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
      name: storageClusterName,
      namespace: storageClusterNamespace,
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
          deviceSetCount
        ),
      ],
      ...Object.assign(
        getNetworkField(publicNetwork, clusterNetwork, encryption.inTransit)
      ),
      managedResources: {
        cephBlockPools: { defaultStorageClass: shouldSetCephRBDAsDefault },
      },
    };

    if (enableRDRPreparation) {
      requestData.metadata.annotations = {
        ...getAnnotations(requestData, {}),
        [DISASTER_RECOVERY_TARGET_ANNOTATION]: 'true',
      };
    }
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

  if (isNFSEnabled) {
    // for NFS, supported only for full deployment and non-external mode
    requestData.spec.nfs = {
      enable: true,
    };
  }

  if (useExternalPostgres) {
    requestData.spec.multiCloudGateway = {
      ...requestData.spec.multiCloudGateway,
      externalPgConfig: {
        pgSecretName: NOOBA_EXTERNAL_PG_SECRET_NAME,
        allowSelfSignedCerts: allowNoobaaPostgresSelfSignedCerts,
      },
    };
    if (enableNoobaaClientSideCerts) {
      requestData.spec.multiCloudGateway.externalPgConfig = {
        ...requestData.spec.multiCloudGateway.externalPgConfig,
        tlsSecretName: NOOBAA_EXTERNAL_PG_TLS_SECRET_NAME,
      };
    }
  }

  requestData.spec.resourceProfile = resourceProfile;

  return requestData;
};

const getNetworkField = (
  publicNetwork: NetworkAttachmentDefinitionKind,
  clusterNetwork: NetworkAttachmentDefinitionKind,
  inTransitEncryption: boolean
) => {
  const publicNetworkString = generateNetworkCardName(publicNetwork);
  const privateNetworkString = generateNetworkCardName(clusterNetwork);
  const multusNetwork =
    !_.isEmpty(publicNetwork) || !_.isEmpty(clusterNetwork)
      ? {
          provider: 'multus',
          selectors: {
            ...Object.assign(
              publicNetwork ? { public: publicNetworkString } : {}
            ),
            ...Object.assign(
              clusterNetwork ? { cluster: privateNetworkString } : {}
            ),
          },
        }
      : {};
  return {
    network: {
      ...multusNetwork,
      connections: {
        encryption: {
          enabled: inTransitEncryption,
        },
      },
    },
  };
};
