import {
  ExternalCephState,
  ExternalCephStateValues,
  ExternalCephStateKeys,
  ResourceProfile,
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
    enableNFS: boolean;
    isRBDStorageClassDefault: boolean | null;
    useExternalPostgres: boolean;
    isVirtualizeStorageClassDefault: boolean | null;
    externalPostgres: {
      username: string;
      password: string;
      serverName: string;
      port: string;
      databaseName: string;
      tls: {
        enabled: boolean;
        allowSelfSignedCerts: boolean;
        enableClientSideCerts: boolean;
        keys: {
          private: File;
          public: File;
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
  state.advancedSettings.enableNFS = initialState.advancedSettings.enableNFS;
  state.advancedSettings.isRBDStorageClassDefault =
    initialState.advancedSettings.isRBDStorageClassDefault;
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
    case 'backingStorage/setType':
      return setBackingStorageType(newState, action.payload);
    case 'backingStorage/setSystemNamespace':
      newState.backingStorage.systemNamespace = action.payload;
      break;
    case 'advancedSettings/enableNFS':
      newState.advancedSettings.enableNFS = action.payload;
      break;
    case 'advancedSettings/setIsRBDStorageClassDefault':
      newState.advancedSettings.isRBDStorageClassDefault = action.payload;
      break;
    case 'advancedSettings/setIsVirtualizeStorageClassDefault':
      newState.advancedSettings.isVirtualizeStorageClassDefault =
        action.payload;
      break;
    case 'advancedSettings/useExternalPostgres':
      newState.advancedSettings.useExternalPostgres = action.payload;
      break;
    case 'advancedSettings/externalPostgres/setUsername':
      newState.advancedSettings.externalPostgres.username = action.payload;
      break;
    case 'advancedSettings/externalPostgres/setPassword':
      newState.advancedSettings.externalPostgres.password = action.payload;
      break;
    case 'advancedSettings/externalPostgres/setServerName':
      newState.advancedSettings.externalPostgres.serverName = action.payload;
      break;
    case 'advancedSettings/externalPostgres/setPort':
      newState.advancedSettings.externalPostgres.port = action.payload;
      break;
    case 'advancedSettings/externalPostgres/setDatabaseName':
      newState.advancedSettings.externalPostgres.databaseName = action.payload;
      break;
    case 'advancedSettings/externalPostgres/tls/enableTLS':
      newState.advancedSettings.externalPostgres.tls.enabled = action.payload;
      break;
    case 'advancedSettings/externalPostgres/tls/allowSelfSignedCerts':
      newState.advancedSettings.externalPostgres.tls.allowSelfSignedCerts =
        action.payload;
      break;

    case 'advancedSettings/externalPostgres/tls/enableClientSideCerts':
      newState.advancedSettings.externalPostgres.tls.enableClientSideCerts =
        action.payload;
      break;
    case 'advancedSettings/externalPostgres/tls/keys/setPrivateKey':
      newState.advancedSettings.externalPostgres.tls.keys.private =
        action.payload;
      break;
    case 'advancedSettings/externalPostgres/tls/keys/setPublicKey':
      newState.advancedSettings.externalPostgres.tls.keys.public =
        action.payload;
      break;

    case 'backingStorage/setDeployment':
      return setDeployment(newState, action.payload);
    case 'backingStorage/setExternalStorage':
      newState.backingStorage.externalStorage = action.payload;
      break;
    case 'advancedSettings/dbBackup/volumeSnapshot/maxSnapshots':
      newState.advancedSettings.dbBackup.volumeSnapshot.maxSnapshots =
        action.payload;
      break;
    case 'advancedSettings/dbBackup/volumeSnapshot/volumeSnapshotClass':
      newState.advancedSettings.dbBackup.volumeSnapshot.volumeSnapshotClass =
        action.payload;
      break;
    case 'advancedSettings/dbBackup/schedule':
      newState.advancedSettings.dbBackup.schedule = action.payload;
      break;
    case 'advancedSettings/setDbBackup':
      newState.advancedSettings.isDbBackup = action.payload;
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
      type: 'advancedSettings/enableNFS';
      payload: WizardState['advancedSettings']['enableNFS'];
    }
  | {
      type: 'advancedSettings/setIsRBDStorageClassDefault';
      payload: WizardState['advancedSettings']['isRBDStorageClassDefault'];
    }
  | {
      type: 'advancedSettings/setIsVirtualizeStorageClassDefault';
      payload: WizardState['advancedSettings']['isVirtualizeStorageClassDefault'];
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
      type: 'advancedSettings/useExternalPostgres';
      payload: WizardState['advancedSettings']['useExternalPostgres'];
    }
  | {
      type: 'advancedSettings/externalPostgres/setUsername';
      payload: WizardState['advancedSettings']['externalPostgres']['username'];
    }
  | {
      type: 'advancedSettings/externalPostgres/setPassword';
      payload: WizardState['advancedSettings']['externalPostgres']['password'];
    }
  | {
      type: 'advancedSettings/externalPostgres/setServerName';
      payload: WizardState['advancedSettings']['externalPostgres']['serverName'];
    }
  | {
      type: 'advancedSettings/externalPostgres/setPort';
      payload: WizardState['advancedSettings']['externalPostgres']['port'];
    }
  | {
      type: 'advancedSettings/externalPostgres/setDatabaseName';
      payload: WizardState['advancedSettings']['externalPostgres']['databaseName'];
    }
  | {
      type: 'advancedSettings/externalPostgres/tls/enableTLS';
      payload: WizardState['advancedSettings']['externalPostgres']['tls']['enabled'];
    }
  | {
      type: 'advancedSettings/externalPostgres/tls/allowSelfSignedCerts';
      payload: WizardState['advancedSettings']['externalPostgres']['tls']['allowSelfSignedCerts'];
    }
  | {
      type: 'advancedSettings/externalPostgres/tls/enableClientSideCerts';
      payload: WizardState['advancedSettings']['externalPostgres']['tls']['enableClientSideCerts'];
    }
  | {
      type: 'advancedSettings/externalPostgres/tls/keys/setPrivateKey';
      payload: WizardState['advancedSettings']['externalPostgres']['tls']['keys']['private'];
    }
  | {
      type: 'advancedSettings/externalPostgres/tls/keys/setPublicKey';
      payload: WizardState['advancedSettings']['externalPostgres']['tls']['keys']['public'];
    }
  | {
      type: 'advancedSettings/setDbBackup';
      payload: WizardState['advancedSettings']['isDbBackup'];
    }
  | {
      type: 'advancedSettings/dbBackup/volumeSnapshot/maxSnapshots';
      payload: WizardState['advancedSettings']['dbBackup']['volumeSnapshot']['maxSnapshots'];
    }
  | {
      type: 'advancedSettings/dbBackup/volumeSnapshot/volumeSnapshotClass';
      payload: WizardState['advancedSettings']['dbBackup']['volumeSnapshot']['volumeSnapshotClass'];
    }
  | {
      type: 'advancedSettings/dbBackup/schedule';
      payload: WizardState['advancedSettings']['dbBackup']['schedule'];
    };
