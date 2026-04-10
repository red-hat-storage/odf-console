import {
  ExternalCephState,
  ExternalCephStateValues,
  ExternalCephStateKeys,
  ResourceProfile,
  ErasureCodingScheme,
} from '@odf/core/types';
import {
  ExternalStateValues,
  ExternalState,
} from '@odf/odf-plugin-sdk/extensions';
import { NetworkAttachmentDefinitionKind, NodeKind } from '@odf/shared/types';
import * as _ from 'lodash-es';
import {
  DiskSize,
  KMSEmptyState,
  NO_PROVISIONER,
  deviceTypeDropdownItems,
  diskModeDropdownItems,
} from '../../constants';
import {
  DiskType,
  EncryptionType,
  KMSConfig,
  NetworkType,
  BackingStorageType,
  DeploymentType,
  VolumeTypeValidation,
} from '../../types';

export type WizardState = CreateStorageSystemState;
export type WizardDispatch = React.Dispatch<CreateStorageSystemAction>;

export type WizardCommonProps = {
  state: WizardState;
  dispatch: WizardDispatch;
};

/* State of CreateStorageSystem */
export const initialState: CreateStorageSystemState = {
  stepIdReached: 1,
  storageClass: { name: '', provisioner: '' },
  nodes: [],
  backingStorage: {
    type: BackingStorageType.EXISTING,
    systemNamespace: '',
    externalStorage: '',
    deployment: DeploymentType.FULL,
  },
  advancedSettings: {
    useErasureCoding: false,
    erasureCodingScheme: null as ErasureCodingScheme | null,
    enableForcefulDeployment: false,
    forcefulDeploymentConfirmation: '',
  },
  optionalSettings: {
    enableNFS: false,
    // using equality check on "null", do not make it "false" as default
    isRBDStorageClassDefault: null,
    isVirtualizeStorageClassDefault: null,
    useExternalPostgres: false,
    externalPostgres: {
      username: '',
      password: '',
      serverName: '',
      port: null,
      databaseName: '',
      tls: {
        enabled: false,
        allowSelfSignedCerts: false,
        enableClientSideCerts: false,
        keys: {
          private: null,
          public: null,
        },
      },
    },
    isDbBackup: false,
    dbBackup: {
      schedule: '0 0 * * *',
      volumeSnapshot: {
        maxSnapshots: 5,
        volumeSnapshotClass: '',
      },
    },
  },
  capacityAndNodes: {
    enableArbiter: false,
    enableTaint: false,
    arbiterLocation: '',
    capacity: null,
    pvCount: 0,
    resourceProfile: ResourceProfile.Balanced,
    capacityAutoScaling: {
      capacityLimit: null,
      enable: false,
    },
    volumeValidationType: VolumeTypeValidation.NONE,
  },
  createStorageClass: {},
  connectionDetails: {},
  createLocalVolumeSet: {
    volumeSetName: '',
    isValidDiskSize: true,
    // we only support SSD, other options (All/HDD) are disabled
    diskType: DiskType.SSD,
    diskMode: diskModeDropdownItems.BLOCK,
    deviceType: [deviceTypeDropdownItems.DISK, deviceTypeDropdownItems.PART],
    isValidDeviceType: true,
    maxDiskLimit: '',
    minDiskSize: '1',
    maxDiskSize: '',
    diskSizeUnit: DiskSize.Gi,
    isValidMaxSize: true,
    showConfirmModal: false,
    chartNodes: new Set(),
  },
  securityAndNetwork: {
    usePublicNetwork: false,
    useClusterNetwork: false,
    encryption: {
      inTransit: false,
      clusterWide: false,
      storageClass: false,
      advanced: false,
      hasHandled: true,
    },
    kms: KMSEmptyState,
    publicNetwork: null,
    clusterNetwork: null,
    addressRanges: {
      public: [],
      cluster: [],
    },
    networkType: NetworkType.DEFAULT,
    isMultusAcknowledged: false,
  },
};

type CreateStorageSystemState = {
  stepIdReached: number;
  storageClass: { name: string; provisioner?: string };
  nodes: WizardNodeState[];
  backingStorage: {
    type: BackingStorageType;
    systemNamespace: string;
    externalStorage: string;
    deployment: DeploymentType;
  };
  advancedSettings: {
    useErasureCoding: boolean;
    erasureCodingScheme: ErasureCodingScheme | null;
    enableForcefulDeployment: boolean;
    forcefulDeploymentConfirmation: string;
  };
  optionalSettings: {
    enableNFS: boolean;
    isRBDStorageClassDefault: boolean | null;
    useExternalPostgres: boolean;
    isVirtualizeStorageClassDefault: boolean | null;
    externalPostgres: {
      username: string;
      password: string;
      serverName: string;
      port: string | null;
      databaseName: string;
      tls: {
        enabled: boolean;
        allowSelfSignedCerts: boolean;
        enableClientSideCerts: boolean;
        keys: {
          private: File | null;
          public: File | null;
        };
      };
    };
    isDbBackup: boolean;
    dbBackup: {
      schedule: string;
      volumeSnapshot: {
        maxSnapshots: number;
        volumeSnapshotClass: string;
      };
    };
  };
  createStorageClass: ExternalState;
  connectionDetails: ExternalCephState;
  capacityAndNodes: {
    enableArbiter: boolean;
    enableTaint: boolean;
    arbiterLocation: string;
    // @TODO: Remove union types and use "number" as type.
    // Requires refactoring osd size dropdown.
    capacity: string | number;
    capacityAutoScaling: CapacityAutoScalingState;
    pvCount: number;
    resourceProfile: ResourceProfile;
    volumeValidationType: VolumeTypeValidation;
  };
  securityAndNetwork: {
    usePublicNetwork: boolean;
    useClusterNetwork: boolean;
    encryption: EncryptionType;
    kms: KMSConfig;
    publicNetwork: NetworkAttachmentDefinitionKind;
    clusterNetwork: NetworkAttachmentDefinitionKind;
    addressRanges: AddressRanges;
    isMultusAcknowledged: boolean;
    networkType: NetworkType;
  };
  createLocalVolumeSet: LocalVolumeSet;
};

type AddressRanges = {
  public: string[];
  cluster: string[];
};

export type WizardNodeState = {
  name: string;
  hostName: string;
  cpu: string;
  memory: string;
  zone: string;
  rack: string;
  uid: string;
  roles: string[];
  labels: NodeKind['metadata']['labels'];
  taints: NodeKind['spec']['taints'];
  architecture: string;
  annotations?: NodeKind['metadata']['annotations'];
};

export type CapacityAutoScalingState = {
  capacityLimit: string;
  enable: boolean;
};

export type LocalVolumeSet = {
  volumeSetName: string;
  isValidDiskSize: boolean;
  diskType: DiskType;
  diskMode: string;
  deviceType: string[];
  isValidDeviceType: boolean;
  maxDiskLimit: string;
  minDiskSize: string;
  maxDiskSize: string;
  diskSizeUnit: DiskSize;
  isValidMaxSize: boolean;
  showConfirmModal: boolean;
  chartNodes: Set<string>;
};

const setDeployment = (state: WizardState, deploymentType: DeploymentType) => {
  /*
   * Wizard state should be reset when a new deployment type is selected
   * in order to avoid stale state collisions since each deployment mode
   * has its own supported configuration.
   *
   * Its not required if the user has not visited more than first step.
   */
  if (state.stepIdReached !== 1) {
    const { type } = state.backingStorage;
    return {
      ...initialState,
      storageClass:
        type === BackingStorageType.EXISTING
          ? state.storageClass
          : initialState.storageClass,
      backingStorage: {
        ...state.backingStorage,
        deployment: deploymentType,
      },
    };
  }

  state.backingStorage.deployment = deploymentType;
  state.optionalSettings.enableNFS = initialState.optionalSettings.enableNFS;
  state.optionalSettings.isRBDStorageClassDefault =
    initialState.optionalSettings.isRBDStorageClassDefault;
  state.optionalSettings.isVirtualizeStorageClassDefault =
    initialState.optionalSettings.isVirtualizeStorageClassDefault;
  return state;
};

const setBackingStorageType = (
  state: WizardState,
  bsType: BackingStorageType
) => {
  /*
   * Wizard state should be reset when a new backing storage type is selected
   * in order to avoid stale state collisions since each backing storage type
   * has its own supported variables. e.g if arbiter was selected and not
   * deselected before changing the backing storage type then storage cluster spec
   * will mark the arbiter option as enabled.
   *
   * Its not required if the user has not visited more than first step.
   */
  if (state.stepIdReached !== 1) {
    return {
      ...initialState,
      backingStorage: {
        ...state.backingStorage,
        type: bsType,
      },
    };
  }

  /* Update storage class state when existing storage class is not selected. */
  if (
    bsType === BackingStorageType.LOCAL_DEVICES ||
    bsType === BackingStorageType.EXTERNAL
  ) {
    state.storageClass = {
      name: '',
      provisioner: bsType === BackingStorageType.EXTERNAL ? '' : NO_PROVISIONER,
    };
  }

  /* Reset external storage when deselected. */
  if (bsType !== BackingStorageType.EXTERNAL) {
    state.backingStorage.externalStorage =
      initialState.backingStorage.externalStorage;
  }

  state.backingStorage.type = bsType;
  return state;
};

/* Reducer of CreateStorageSystem */
export const reducer: WizardReducer = (prevState, action) => {
  const newState: WizardState = _.cloneDeep(prevState);
  switch (action.type) {
    case 'wizard/setStepIdReached':
      newState.stepIdReached = action.payload;
      break;
    case 'wizard/setStorageClass':
      newState.storageClass = {
        name: action.payload.name,
        provisioner: action.payload?.provisioner,
      };
      break;
    case 'wizard/setNodes':
      newState.nodes = action.payload;
      break;
    case 'wizard/setCreateStorageClass':
      newState.createStorageClass = {
        ...newState.createStorageClass,
        [action.payload.field]: action.payload.value,
      };
      break;
    case 'wizard/setConnectionDetails':
      newState.connectionDetails = {
        ...newState.connectionDetails,
        [action.payload.field]: action.payload.value,
      };
      break;
    case 'wizard/setCreateLocalVolumeSet':
      newState.createLocalVolumeSet = {
        ...newState.createLocalVolumeSet,
        [action.payload.field]: action.payload.value,
      };
      break;
    case 'backingStorage/setType': {
      const next = setBackingStorageType(newState, action.payload);
      return next;
    }
    case 'backingStorage/setSystemNamespace':
      newState.backingStorage.systemNamespace = action.payload;
      break;
    case 'advancedSettings/useErasureCoding':
      newState.advancedSettings.useErasureCoding = action.payload;
      if (!action.payload) {
        newState.advancedSettings.erasureCodingScheme = null;
      }
      break;
    case 'advancedSettings/erasureCodingScheme':
      newState.advancedSettings.erasureCodingScheme = action.payload;
      break;
    case 'optionalSettings/enableNFS':
      newState.optionalSettings.enableNFS = action.payload;
      break;
    case 'optionalSettings/setIsRBDStorageClassDefault':
      newState.optionalSettings.isRBDStorageClassDefault = action.payload;
      break;
    case 'optionalSettings/setIsVirtualizeStorageClassDefault':
      newState.optionalSettings.isVirtualizeStorageClassDefault =
        action.payload;
      break;
    case 'optionalSettings/useExternalPostgres':
      newState.optionalSettings.useExternalPostgres = action.payload;
      break;
    case 'advancedSettings/enableForcefulDeployment':
      newState.advancedSettings.enableForcefulDeployment = action.payload;
      // Reset confirmation when disabling
      if (!action.payload) {
        newState.advancedSettings.forcefulDeploymentConfirmation = '';
      }
      break;
    case 'advancedSettings/setForcefulDeploymentConfirmation':
      newState.advancedSettings.forcefulDeploymentConfirmation = action.payload;
      break;
    case 'optionalSettings/externalPostgres/setUsername':
      newState.optionalSettings.externalPostgres.username = action.payload;
      break;
    case 'optionalSettings/externalPostgres/setPassword':
      newState.optionalSettings.externalPostgres.password = action.payload;
      break;
    case 'optionalSettings/externalPostgres/setServerName':
      newState.optionalSettings.externalPostgres.serverName = action.payload;
      break;
    case 'optionalSettings/externalPostgres/setPort':
      newState.optionalSettings.externalPostgres.port = action.payload;
      break;
    case 'optionalSettings/externalPostgres/setDatabaseName':
      newState.optionalSettings.externalPostgres.databaseName = action.payload;
      break;
    case 'optionalSettings/externalPostgres/tls/enableTLS':
      newState.optionalSettings.externalPostgres.tls.enabled = action.payload;
      break;
    case 'optionalSettings/externalPostgres/tls/allowSelfSignedCerts':
      newState.optionalSettings.externalPostgres.tls.allowSelfSignedCerts =
        action.payload;
      break;

    case 'optionalSettings/externalPostgres/tls/enableClientSideCerts':
      newState.optionalSettings.externalPostgres.tls.enableClientSideCerts =
        action.payload;
      break;
    case 'optionalSettings/externalPostgres/tls/keys/setPrivateKey':
      newState.optionalSettings.externalPostgres.tls.keys.private =
        action.payload;
      break;
    case 'optionalSettings/externalPostgres/tls/keys/setPublicKey':
      newState.optionalSettings.externalPostgres.tls.keys.public =
        action.payload;
      break;

    case 'backingStorage/setDeployment': {
      const next = setDeployment(newState, action.payload);
      return next;
    }
    case 'backingStorage/setExternalStorage':
      newState.backingStorage.externalStorage = action.payload;
      break;
    case 'optionalSettings/dbBackup/volumeSnapshot/maxSnapshots':
      newState.optionalSettings.dbBackup.volumeSnapshot.maxSnapshots =
        action.payload;
      break;
    case 'optionalSettings/dbBackup/volumeSnapshot/volumeSnapshotClass':
      newState.optionalSettings.dbBackup.volumeSnapshot.volumeSnapshotClass =
        action.payload;
      break;
    case 'optionalSettings/dbBackup/schedule':
      newState.optionalSettings.dbBackup.schedule = action.payload;
      break;
    case 'optionalSettings/setDbBackup':
      newState.optionalSettings.isDbBackup = action.payload;
      break;
    case 'capacityAndNodes/capacity':
      newState.capacityAndNodes.capacity = action.payload;
      break;
    case 'capacityAndNodes/capacityAutoScaling':
      newState.capacityAndNodes.capacityAutoScaling = action.payload;
      break;
    case 'capacityAndNodes/pvCount':
      newState.capacityAndNodes.pvCount = action.payload;
      break;
    case 'capacityAndNodes/arbiterLocation':
      newState.capacityAndNodes.arbiterLocation = action.payload;
      break;
    case 'capacityAndNodes/enableArbiter':
      newState.capacityAndNodes.enableArbiter = action.payload;
      break;
    case 'capacityAndNodes/enableTaint':
      newState.capacityAndNodes.enableTaint = action.payload;
      break;
    case 'capacityAndNodes/setResourceProfile':
      newState.capacityAndNodes.resourceProfile = action.payload;
      break;
    case 'capacityAndNodes/setVolumeValidationType':
      newState.capacityAndNodes.volumeValidationType = action.payload;
      break;
    case 'securityAndNetwork/setMultusAcknowledged':
      newState.securityAndNetwork.isMultusAcknowledged = action.payload;
      break;
    case 'securityAndNetwork/setKms':
      newState.securityAndNetwork.kms = action.payload;
      break;
    case 'securityAndNetwork/setKmsProviderState':
      newState.securityAndNetwork.kms.providerState = action.payload;
      break;
    case 'securityAndNetwork/setKmsProvider':
      newState.securityAndNetwork.kms.provider = action.payload;
      break;
    case 'securityAndNetwork/setEncryption':
      newState.securityAndNetwork.encryption = action.payload;
      break;
    case 'securityAndNetwork/setClusterNetwork':
      newState.securityAndNetwork.clusterNetwork = action.payload;
      break;
    case 'securityAndNetwork/setPublicNetwork':
      newState.securityAndNetwork.publicNetwork = action.payload;
      break;
    case 'securityAndNetwork/setNetworkType':
      newState.securityAndNetwork.networkType = action.payload;
      if (action.payload !== NetworkType.NIC) {
        newState.securityAndNetwork.usePublicNetwork = false;
        newState.securityAndNetwork.useClusterNetwork = false;
        newState.securityAndNetwork.addressRanges.public = [];
        newState.securityAndNetwork.addressRanges.cluster = [];
      }
      break;
    case 'securityAndNetwork/setUsePublicNetwork':
      newState.securityAndNetwork.usePublicNetwork = action.payload;
      if (!action.payload) {
        newState.securityAndNetwork.addressRanges.public = [];
      }
      break;
    case 'securityAndNetwork/setUseClusterNetwork':
      newState.securityAndNetwork.useClusterNetwork = action.payload;
      if (!action.payload) {
        newState.securityAndNetwork.addressRanges.cluster = [];
      }
      break;
    case 'securityAndNetwork/setPublicCIDR':
      newState.securityAndNetwork.addressRanges.public = action.payload;
      break;
    case 'securityAndNetwork/setCephCIDR':
      newState.securityAndNetwork.addressRanges.cluster = action.payload;
      break;
    default:
      throw new TypeError(`${action} is not a valid reducer action`);
  }
  return newState;
};

export type WizardReducer = (
  prevState: CreateStorageSystemState,
  action: CreateStorageSystemAction
) => CreateStorageSystemState;

/* Actions of CreateStorageSystem */
export type CreateStorageSystemAction =
  | { type: 'wizard/setStepIdReached'; payload: number }
  | {
      type: 'wizard/setStorageClass';
      payload: WizardState['storageClass'];
    }
  | {
      type: 'wizard/setCreateStorageClass';
      payload: { field: string; value: ExternalStateValues };
    }
  | {
      type: 'wizard/setConnectionDetails';
      payload: { field: ExternalCephStateKeys; value: ExternalCephStateValues };
    }
  | {
      type: 'wizard/setCreateLocalVolumeSet';
      payload: {
        field: keyof LocalVolumeSet;
        value: LocalVolumeSet[keyof LocalVolumeSet];
      };
    }
  | {
      type: 'capacityAndNodes/setResourceProfile';
      payload: WizardState['capacityAndNodes']['resourceProfile'];
    }
  | {
      type: 'capacityAndNodes/setVolumeValidationType';
      payload: WizardState['capacityAndNodes']['volumeValidationType'];
    }
  | {
      type: 'backingStorage/setDeployment';
      payload: WizardState['backingStorage']['deployment'];
    }
  | {
      type: 'backingStorage/setType';
      payload: WizardState['backingStorage']['type'];
    }
  | {
      type: 'backingStorage/setSystemNamespace';
      payload: WizardState['backingStorage']['systemNamespace'];
    }
  | {
      type: 'advancedSettings/useErasureCoding';
      payload: WizardState['advancedSettings']['useErasureCoding'];
    }
  | {
      type: 'advancedSettings/erasureCodingScheme';
      payload: WizardState['advancedSettings']['erasureCodingScheme'];
    }
  | {
      type: 'optionalSettings/enableNFS';
      payload: WizardState['optionalSettings']['enableNFS'];
    }
  | {
      type: 'optionalSettings/setIsRBDStorageClassDefault';
      payload: WizardState['optionalSettings']['isRBDStorageClassDefault'];
    }
  | {
      type: 'optionalSettings/setIsVirtualizeStorageClassDefault';
      payload: WizardState['optionalSettings']['isVirtualizeStorageClassDefault'];
    }
  | {
      type: 'backingStorage/setExternalStorage';
      payload: WizardState['backingStorage']['externalStorage'];
    }
  | { type: 'wizard/setNodes'; payload: WizardState['nodes'] }
  | {
      type: 'capacityAndNodes/capacity';
      payload: WizardState['capacityAndNodes']['capacity'];
    }
  | {
      type: 'capacityAndNodes/capacityAutoScaling';
      payload: WizardState['capacityAndNodes']['capacityAutoScaling'];
    }
  | {
      type: 'capacityAndNodes/pvCount';
      payload: WizardState['capacityAndNodes']['pvCount'];
    }
  | {
      type: 'capacityAndNodes/arbiterLocation';
      payload: WizardState['capacityAndNodes']['arbiterLocation'];
    }
  | {
      type: 'capacityAndNodes/enableArbiter';
      payload: WizardState['capacityAndNodes']['enableArbiter'];
    }
  | {
      type: 'capacityAndNodes/enableTaint';
      payload: WizardState['capacityAndNodes']['enableTaint'];
    }
  | {
      type: 'securityAndNetwork/setMultusAcknowledged';
      payload: boolean;
    }
  | {
      type: 'securityAndNetwork/setKms';
      payload: WizardState['securityAndNetwork']['kms'];
    }
  | {
      type: 'securityAndNetwork/setKmsProviderState';
      payload: WizardState['securityAndNetwork']['kms']['providerState'];
    }
  | {
      type: 'securityAndNetwork/setKmsProvider';
      payload: WizardState['securityAndNetwork']['kms']['provider'];
    }
  | {
      type: 'securityAndNetwork/setEncryption';
      payload: WizardState['securityAndNetwork']['encryption'];
    }
  | {
      type: 'securityAndNetwork/setPublicNetwork';
      payload: WizardState['securityAndNetwork']['publicNetwork'];
    }
  | {
      type: 'securityAndNetwork/setClusterNetwork';
      payload: WizardState['securityAndNetwork']['clusterNetwork'];
    }
  | {
      type: 'securityAndNetwork/setPublicCIDR';
      payload: WizardState['securityAndNetwork']['addressRanges']['public'];
    }
  | {
      type: 'securityAndNetwork/setCephCIDR';
      payload: WizardState['securityAndNetwork']['addressRanges']['cluster'];
    }
  | {
      type: 'securityAndNetwork/setNetworkType';
      payload: WizardState['securityAndNetwork']['networkType'];
    }
  | {
      type: 'securityAndNetwork/setUsePublicNetwork';
      payload: boolean;
    }
  | {
      type: 'securityAndNetwork/setUseClusterNetwork';
      payload: boolean;
    }
  | {
      type: 'optionalSettings/useExternalPostgres';
      payload: WizardState['optionalSettings']['useExternalPostgres'];
    }
  | {
      type: 'advancedSettings/enableForcefulDeployment';
      payload: WizardState['advancedSettings']['enableForcefulDeployment'];
    }
  | {
      type: 'advancedSettings/setForcefulDeploymentConfirmation';
      payload: WizardState['advancedSettings']['forcefulDeploymentConfirmation'];
    }
  | {
      type: 'optionalSettings/externalPostgres/setUsername';
      payload: WizardState['optionalSettings']['externalPostgres']['username'];
    }
  | {
      type: 'optionalSettings/externalPostgres/setPassword';
      payload: WizardState['optionalSettings']['externalPostgres']['password'];
    }
  | {
      type: 'optionalSettings/externalPostgres/setServerName';
      payload: WizardState['optionalSettings']['externalPostgres']['serverName'];
    }
  | {
      type: 'optionalSettings/externalPostgres/setPort';
      payload: WizardState['optionalSettings']['externalPostgres']['port'];
    }
  | {
      type: 'optionalSettings/externalPostgres/setDatabaseName';
      payload: WizardState['optionalSettings']['externalPostgres']['databaseName'];
    }
  | {
      type: 'optionalSettings/externalPostgres/tls/enableTLS';
      payload: WizardState['optionalSettings']['externalPostgres']['tls']['enabled'];
    }
  | {
      type: 'optionalSettings/externalPostgres/tls/allowSelfSignedCerts';
      payload: WizardState['optionalSettings']['externalPostgres']['tls']['allowSelfSignedCerts'];
    }
  | {
      type: 'optionalSettings/externalPostgres/tls/enableClientSideCerts';
      payload: WizardState['optionalSettings']['externalPostgres']['tls']['enableClientSideCerts'];
    }
  | {
      type: 'optionalSettings/externalPostgres/tls/keys/setPrivateKey';
      payload: WizardState['optionalSettings']['externalPostgres']['tls']['keys']['private'];
    }
  | {
      type: 'optionalSettings/externalPostgres/tls/keys/setPublicKey';
      payload: WizardState['optionalSettings']['externalPostgres']['tls']['keys']['public'];
    }
  | {
      type: 'optionalSettings/setDbBackup';
      payload: WizardState['optionalSettings']['isDbBackup'];
    }
  | {
      type: 'optionalSettings/dbBackup/volumeSnapshot/maxSnapshots';
      payload: WizardState['optionalSettings']['dbBackup']['volumeSnapshot']['maxSnapshots'];
    }
  | {
      type: 'optionalSettings/dbBackup/volumeSnapshot/volumeSnapshotClass';
      payload: WizardState['optionalSettings']['dbBackup']['volumeSnapshot']['volumeSnapshotClass'];
    }
  | {
      type: 'optionalSettings/dbBackup/schedule';
      payload: WizardState['optionalSettings']['dbBackup']['schedule'];
    };
