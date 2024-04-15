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
  KMSEmptyState,
  NO_PROVISIONER,
  deviceTypeDropdownItems,
  diskModeDropdownItems,
} from '../../constants';
import {
  EncryptionType,
  KMSConfig,
  NetworkType,
  BackingStorageType,
  DeploymentType,
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
    enableNFS: false,
    // using equality check on "null", do not make it "false" as default
    isRBDStorageClassDefault: null,
    externalStorage: '',
    deployment: DeploymentType.FULL,
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
  },
  capacityAndNodes: {
    enableArbiter: false,
    enableTaint: false,
    arbiterLocation: '',
    capacity: null,
    pvCount: 0,
    resourceProfile: ResourceProfile.Balanced,
  },
  createStorageClass: {},
  connectionDetails: {},
  createLocalVolumeSet: {
    volumeSetName: '',
    isValidDiskSize: true,
    diskType: 'All',
    diskMode: diskModeDropdownItems.BLOCK,
    deviceType: [deviceTypeDropdownItems.DISK, deviceTypeDropdownItems.PART],
    isValidDeviceType: true,
    maxDiskLimit: '',
    minDiskSize: '1',
    maxDiskSize: '',
    diskSizeUnit: 'Gi',
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
    networkType: NetworkType.DEFAULT,
  },
  dataProtection: {
    enableRDRPreparation: false,
  },
};

type CreateStorageSystemState = {
  stepIdReached: number;
  storageClass: { name: string; provisioner?: string };
  nodes: WizardNodeState[];
  backingStorage: {
    type: BackingStorageType;
    systemNamespace: string;
    enableNFS: boolean;
    isRBDStorageClassDefault: boolean | null;
    externalStorage: string;
    deployment: DeploymentType;
    useExternalPostgres: boolean;
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
    pvCount: number;
    resourceProfile: ResourceProfile;
  };
  securityAndNetwork: {
    encryption: EncryptionType;
    kms: KMSConfig;
    publicNetwork: NetworkAttachmentDefinitionKind;
    clusterNetwork: NetworkAttachmentDefinitionKind;
    networkType: NetworkType;
  };
  createLocalVolumeSet: LocalVolumeSet;
  dataProtection: {
    enableRDRPreparation: boolean;
  };
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
};

export type LocalVolumeSet = {
  volumeSetName: string;
  isValidDiskSize: boolean;
  diskType: string;
  diskMode: string;
  deviceType: string[];
  isValidDeviceType: boolean;
  maxDiskLimit: string;
  minDiskSize: string;
  maxDiskSize: string;
  diskSizeUnit: string;
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
  state.backingStorage.enableNFS = initialState.backingStorage.enableNFS;
  state.backingStorage.isRBDStorageClassDefault =
    initialState.backingStorage.isRBDStorageClassDefault;
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
    case 'wizard/setResourceProfile':
      newState.capacityAndNodes.resourceProfile = action.payload;
      break;
    case 'backingStorage/setType':
      return setBackingStorageType(newState, action.payload);
    case 'backingStorage/setSystemNamespace':
      newState.backingStorage.systemNamespace = action.payload;
      break;
    case 'backingStorage/enableNFS':
      newState.backingStorage.enableNFS = action.payload;
      break;
    case 'backingStorage/setIsRBDStorageClassDefault':
      newState.backingStorage.isRBDStorageClassDefault = action.payload;
      break;
    case 'backingStorage/useExternalPostgres':
      newState.backingStorage.useExternalPostgres = action.payload;
      break;
    case 'backingStorage/externalPostgres/setUsername':
      newState.backingStorage.externalPostgres.username = action.payload;
      break;
    case 'backingStorage/externalPostgres/setPassword':
      newState.backingStorage.externalPostgres.password = action.payload;
      break;
    case 'backingStorage/externalPostgres/setServerName':
      newState.backingStorage.externalPostgres.serverName = action.payload;
      break;
    case 'backingStorage/externalPostgres/setPort':
      newState.backingStorage.externalPostgres.port = action.payload;
      break;
    case 'backingStorage/externalPostgres/setDatabaseName':
      newState.backingStorage.externalPostgres.databaseName = action.payload;
      break;
    case 'backingStorage/externalPostgres/tls/enableTLS':
      newState.backingStorage.externalPostgres.tls.enabled = action.payload;
      break;
    case 'backingStorage/externalPostgres/tls/allowSelfSignedCerts':
      newState.backingStorage.externalPostgres.tls.allowSelfSignedCerts =
        action.payload;
      break;

    case 'backingStorage/externalPostgres/tls/enableClientSideCerts':
      newState.backingStorage.externalPostgres.tls.enableClientSideCerts =
        action.payload;
      break;
    case 'backingStorage/externalPostgres/tls/keys/setPrivateKey':
      newState.backingStorage.externalPostgres.tls.keys.private =
        action.payload;
      break;
    case 'backingStorage/externalPostgres/tls/keys/setPublicKey':
      newState.backingStorage.externalPostgres.tls.keys.public = action.payload;
      break;

    case 'backingStorage/setDeployment':
      return setDeployment(newState, action.payload);
    case 'backingStorage/setExternalStorage':
      newState.backingStorage.externalStorage = action.payload;
      break;
    case 'capacityAndNodes/capacity':
      newState.capacityAndNodes.capacity = action.payload;
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
    case 'dataProtection/enableRDRPreparation':
      newState.dataProtection.enableRDRPreparation = action.payload;
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
      type: 'wizard/setResourceProfile';
      payload: WizardState['capacityAndNodes']['resourceProfile'];
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
      type: 'backingStorage/enableNFS';
      payload: WizardState['backingStorage']['enableNFS'];
    }
  | {
      type: 'backingStorage/setIsRBDStorageClassDefault';
      payload: WizardState['backingStorage']['isRBDStorageClassDefault'];
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
      type: 'securityAndNetwork/setNetworkType';
      payload: WizardState['securityAndNetwork']['networkType'];
    }
  | {
      type: 'dataProtection/enableRDRPreparation';
      payload: WizardState['dataProtection']['enableRDRPreparation'];
    }
  | {
      type: 'backingStorage/useExternalPostgres';
      payload: WizardState['backingStorage']['useExternalPostgres'];
    }
  | {
      type: 'backingStorage/externalPostgres/setUsername';
      payload: WizardState['backingStorage']['externalPostgres']['username'];
    }
  | {
      type: 'backingStorage/externalPostgres/setPassword';
      payload: WizardState['backingStorage']['externalPostgres']['password'];
    }
  | {
      type: 'backingStorage/externalPostgres/setServerName';
      payload: WizardState['backingStorage']['externalPostgres']['serverName'];
    }
  | {
      type: 'backingStorage/externalPostgres/setPort';
      payload: WizardState['backingStorage']['externalPostgres']['port'];
    }
  | {
      type: 'backingStorage/externalPostgres/setDatabaseName';
      payload: WizardState['backingStorage']['externalPostgres']['databaseName'];
    }
  | {
      type: 'backingStorage/externalPostgres/tls/enableTLS';
      payload: WizardState['backingStorage']['externalPostgres']['tls']['enabled'];
    }
  | {
      type: 'backingStorage/externalPostgres/tls/allowSelfSignedCerts';
      payload: WizardState['backingStorage']['externalPostgres']['tls']['allowSelfSignedCerts'];
    }
  | {
      type: 'backingStorage/externalPostgres/tls/enableClientSideCerts';
      payload: WizardState['backingStorage']['externalPostgres']['tls']['enableClientSideCerts'];
    }
  | {
      type: 'backingStorage/externalPostgres/tls/keys/setPrivateKey';
      payload: WizardState['backingStorage']['externalPostgres']['tls']['keys']['private'];
    }
  | {
      type: 'backingStorage/externalPostgres/tls/keys/setPublicKey';
      payload: WizardState['backingStorage']['externalPostgres']['tls']['keys']['public'];
    };
