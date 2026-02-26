import {
  NodesPerZoneMap,
  ValidationType,
  EncryptionType,
  ResourceProfile,
  NodeData,
  VolumeTypeValidation,
  NetworkType,
} from '@odf/core/types';
import {
  getNodeCPUCapacity,
  getZone,
  isFlexibleScaling,
  getDeviceSetCount,
  createDeviceSet,
  isResourceProfileAllowed,
  getNodeTotalMemory,
  isValidCapacityAutoScalingConfig,
} from '@odf/core/utils';
import { StorageClassWizardStepExtensionProps as ExternalStorage } from '@odf/odf-plugin-sdk/extensions';
import {
  NOOBAA_EXTERNAL_PG_TLS_SECRET_NAME,
  NOOBA_EXTERNAL_PG_SECRET_NAME,
  DEFAULT_DEVICECLASS,
} from '@odf/shared/constants';
import { getLabel, getName, getNamespace, getUID } from '@odf/shared/selectors';
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
  IPFamily,
  NO_PROVISIONER,
  OCS_DEVICE_SET_FLEXIBLE_REPLICA,
  OCS_DEVICE_SET_MINIMUM_REPLICAS,
  ATTACHED_DEVICES_ANNOTATION,
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

/**
 * We get the total cpu & memory as calculating the cpu & memory available for scheduling
 * is a hard computational problem that can't be solved at the UI level.
 * See: https://bugzilla.redhat.com/show_bug.cgi?id=2263148#c2
 * Moreover, on Day-2 operations it can lead to inconsistent information
 * (due to end user workloads and/or other factors that can alter the available resources)
 * e.g. misleadingly warning the end user about not having enough resources for a
 * successfully applied performance mode.
 */
export const createWizardNodeState = (
  nodes: NodeData[] = []
): WizardNodeState[] =>
  nodes.map((node) => {
    const name = getName(node);
    const hostName = getLabel(node, 'kubernetes.io/hostname', '');
    const cpu = getNodeCPUCapacity(node);
    const memory = getNodeTotalMemory(node);
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
  state: WizardState['capacityAndNodes'],
  isNoProvSC: boolean,
  osdAmount: number
): ValidationType[] => {
  const validations = [];
  const {
    capacityAutoScaling,
    enableArbiter: enableStretchCluster,
    resourceProfile,
    volumeValidationType,
  } = state;
  const totalCpu = getTotalCpu(nodes);
  const totalMemory = getTotalMemoryInGiB(nodes);

  if (isFlexibleScaling(nodes, isNoProvSC, enableStretchCluster)) {
    validations.push(ValidationType.ATTACHED_DEVICES_FLEXIBLE_SCALING);
  }
  if (!enableStretchCluster && nodes.length && nodes.length < MINIMUM_NODES) {
    validations.push(ValidationType.MINIMUMNODES);
  } else if (nodes.length && nodes.length >= MINIMUM_NODES) {
    if (
      !isResourceProfileAllowed(
        resourceProfile,
        totalCpu,
        totalMemory,
        osdAmount
      )
    ) {
      validations.push(ValidationType.RESOURCE_PROFILE);
    } else if (
      resourceProfile === ResourceProfile.Lean &&
      !isResourceProfileAllowed(
        ResourceProfile.Balanced,
        totalCpu,
        totalMemory,
        osdAmount
      )
    ) {
      validations.push(ValidationType.MINIMAL);
    }
  }
  if (
    ![VolumeTypeValidation.UNKNOWN, VolumeTypeValidation.NONE].includes(
      volumeValidationType
    )
  ) {
    validations.push(ValidationType.VOLUME_TYPE);
  }
  if (
    !isValidCapacityAutoScalingConfig(
      capacityAutoScaling.enable,
      capacityAutoScaling.capacityLimit
    )
  ) {
    validations.push(ValidationType.CAPACITY_AUTOSCALING);
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

export const getIPFamily = (addr: string): IPFamily => {
  const ipPattern = /^[0-9]*\.[0-9]*\.[0-9]*\.[0-9]*$/;
  return ipPattern.test(addr) ? IPFamily.IPV4 : IPFamily.IPV6;
};

export const checkError = (
  data: string = '{}',
  requiredKeys = [],
  requiresEncodingKeys = [],
  ipFamily = IPFamily.IPV4
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
      } catch (_e) {
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

export const createDownloadFile = (data: string): string =>
  !!data
    ? `data:application/octet-stream;charset=utf-8,${encodeURIComponent(
        Base64.decode(data)
      )}`
    : '';

export const isValidJSON = (fData: string): boolean => {
  try {
    JSON.parse(fData);
    return true;
  } catch (_e) {
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

type NetworkConfiguration = Omit<
  WizardState['securityAndNetwork'],
  'encryption' | 'kms'
>;

export type OCSRequestData = {
  storageClass: WizardState['storageClass'];
  storage: string;
  encryption: EncryptionType;
  resourceProfile: ResourceProfile;
  nodes: WizardNodeState[];
  flexibleScaling: boolean;
  networkConfiguration: NetworkConfiguration;
  kmsEnable?: boolean;
  selectedArbiterZone?: string;
  stretchClusterChecked?: boolean;
  availablePvsCount?: number;
  isMCG?: boolean;
  isNFSEnabled?: boolean;
  shouldSetCephRBDAsDefault?: boolean;
  shouldSetVirtualizeSCAsDefault?: boolean;
  storageClusterNamespace: string;
  useExternalPostgres?: boolean;
  enablePostgresqlTls?: boolean;
  allowNoobaaPostgresSelfSignedCerts?: boolean;
  enableNoobaaClientSideCerts?: boolean;
  storageClusterName: string;
  isDbBackup?: boolean;
  dbBackup?: WizardState['advancedSettings']['dbBackup'];
  enableForcefulDeployment?: boolean;
};

export const getOCSRequestData = ({
  storageClass,
  storage,
  encryption,
  resourceProfile,
  nodes,
  flexibleScaling,
  networkConfiguration,
  kmsEnable,
  selectedArbiterZone,
  stretchClusterChecked,
  availablePvsCount,
  isMCG,
  isNFSEnabled,
  shouldSetCephRBDAsDefault,
  shouldSetVirtualizeSCAsDefault,
  storageClusterNamespace,
  useExternalPostgres,
  enablePostgresqlTls,
  allowNoobaaPostgresSelfSignedCerts,
  enableNoobaaClientSideCerts,
  storageClusterName,
  isDbBackup,
  dbBackup,
  enableForcefulDeployment,
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
          undefined,
          DEFAULT_DEVICECLASS
        ),
      ],
      ...Object.assign(
        getNetworkField(networkConfiguration, encryption.inTransit)
      ),
      managedResources: {
        cephBlockPools: {
          defaultStorageClass: shouldSetCephRBDAsDefault,
          defaultVirtualizationStorageClass: shouldSetVirtualizeSCAsDefault,
        },
      },
    };
  }

  if (
    networkConfiguration.networkType === NetworkType.HOST ||
    networkConfiguration.networkType === NetworkType.NIC
  ) {
    requestData.spec.hostNetwork = true;
    requestData.spec.managedResources = {
      ...requestData.spec.managedResources,
      cephObjectStores: { hostNetwork: false },
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

    if (enablePostgresqlTls) {
      requestData.spec.multiCloudGateway.externalPgConfig = {
        ...requestData.spec.multiCloudGateway.externalPgConfig,
        enableTls: enablePostgresqlTls,
      };
    }
    if (enableNoobaaClientSideCerts) {
      requestData.spec.multiCloudGateway.externalPgConfig = {
        ...requestData.spec.multiCloudGateway.externalPgConfig,
        tlsSecretName: NOOBAA_EXTERNAL_PG_TLS_SECRET_NAME,
      };
    }
  }

  requestData.spec.resourceProfile = resourceProfile;

  // Add automatic backup configuration if enabled
  if (isDbBackup) {
    requestData.spec.multiCloudGateway = {
      ...requestData.spec.multiCloudGateway,
      dbBackup: {
        schedule: dbBackup.schedule,
        volumeSnapshot: dbBackup.volumeSnapshot,
      },
    };
  }
  // Add forceful deployment configuration if enabled
  if (enableForcefulDeployment) {
    requestData.spec.forcefulDeployment = {
      enabled: enableForcefulDeployment,
    };
  }

  return requestData;
};

const getNetworkField = (
  networkConfiguration: NetworkConfiguration,
  isTransitEncryptionEnabled: boolean
) => {
  const {
    networkType,
    publicNetwork,
    clusterNetwork,
    addressRanges: { cluster, public: publicAddressRange },
  } = networkConfiguration;
  if (networkType === NetworkType.HOST || networkType === NetworkType.NIC) {
    return {
      network: {
        connections: {
          encryption: {
            enabled: isTransitEncryptionEnabled,
          },
        },
        addressRanges: {
          cluster: cluster,
          public: publicAddressRange,
        },
      },
    } as StorageClusterKind['spec']['network'];
  }
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
          enabled: isTransitEncryptionEnabled,
        },
      },
    },
  };
};

export const getRBDVolumeSnapshotClassName = (clusterName: string) =>
  `${clusterName}-rbdplugin-snapclass`;
