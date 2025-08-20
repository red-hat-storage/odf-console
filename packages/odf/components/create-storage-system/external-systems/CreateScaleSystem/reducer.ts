import { WizardNodeState } from '../../reducer';

export type ScaleSystemState = {
  name: string;
  selectedNodes: WizardNodeState[];
  managementEndpoint: {
    [id: string]: {
      host: string;
      port: string;
    };
  };
  userName: string;
  password: string;
  caCertificate: string;
  encryptionEnabled: boolean;
  tenantId: string;
  fileSystemName: string;
  encryptionUserName: string;
  encryptionPassword: string;
  serverInformation: string;
  encrptionPort: string;
  remoteRKM: string;
  encryptionCert: string;
  client: string;
};

export const initialState: ScaleSystemState = {
  name: '',
  selectedNodes: [],
  managementEndpoint: {},
  userName: '',
  password: '',
  caCertificate: '',
  encryptionEnabled: false,
  serverInformation: '',
  tenantId: '',
  fileSystemName: '',
  encryptionUserName: '',
  encryptionPassword: '',
  encrptionPort: '',
  remoteRKM: '',
  encryptionCert: '',
  client: '',
};

export type ScaleSystemAction =
  | {
      type: 'SET_NAME';
      payload: string;
    }
  | {
      type: 'SET_SELECTED_NODES';
      payload: WizardNodeState[];
    }
  | {
      type: 'SET_MANAGEMENT_ENDPOINT_HOST';
      payload: {
        id: string;
        host: string;
      };
    }
  | {
      type: 'SET_MANAGEMENT_ENDPOINT_PORT';
      payload: {
        id: string;
        port: string;
      };
    }
  | {
      type: 'SET_USER_NAME';
      payload: string;
    }
  | {
      type: 'SET_PASSWORD';
      payload: string;
    }
  | {
      type: 'SET_CA_CERTIFICATE';
      payload: string;
    }
  | {
      type: 'SET_ENCRYPTION_ENABLED';
      payload: boolean;
    }
  | {
      type: 'SET_SERVER_INFORMATION';
      payload: string;
    }
  | {
      type: 'SET_ENCRYPTION_USER_NAME';
      payload: string;
    }
  | {
      type: 'SET_ENCRYPTION_PASSWORD';
      payload: string;
    }
  | {
      type: 'SET_ENCRYPTION_PORT';
      payload: string;
    }
  | {
      type: 'SET_TENANT_ID';
      payload: string;
    }
  | {
      type: 'SET_ENCRYPTION_ENABLED';
      payload: boolean;
    }
  | {
      type: 'SET_SERVER_INFORMATION';
      payload: string;
    }
  | {
      type: 'SET_FILE_SYSTEM_NAME';
      payload: string;
    }
  | {
      type: 'SET_REMOTE_RKM';
      payload: string;
    }
  | {
      type: 'SET_ENCRYPTION_CERT';
      payload: string;
    }
  | {
      type: 'SET_CLIENT';
      payload: string;
    };

export const scaleSystemReducer = (
  state: ScaleSystemState,
  action: ScaleSystemAction
) => {
  switch (action.type) {
    case 'SET_NAME':
      return { ...state, name: action.payload };
    case 'SET_SELECTED_NODES':
      return { ...state, selectedNodes: action.payload };
    case 'SET_MANAGEMENT_ENDPOINT_HOST':
      return {
        ...state,
        managementEndpoint: {
          ...state.managementEndpoint,
          [action.payload.id]: {
            ...state.managementEndpoint[action.payload.id],
            host: action.payload.host,
          },
        },
      };
    case 'SET_MANAGEMENT_ENDPOINT_PORT':
      return {
        ...state,
        managementEndpoint: {
          ...state.managementEndpoint,
          [action.payload.id]: {
            ...state.managementEndpoint[action.payload.id],
            port: action.payload.port,
          },
        },
      };
    case 'SET_USER_NAME':
      return { ...state, userName: action.payload };
    case 'SET_PASSWORD':
      return { ...state, password: action.payload };
    case 'SET_CA_CERTIFICATE':
      return { ...state, caCertificate: action.payload };
    case 'SET_ENCRYPTION_ENABLED':
      return { ...state, encryptionEnabled: action.payload };
    case 'SET_SERVER_INFORMATION':
      return { ...state, serverInformation: action.payload };
    case 'SET_TENANT_ID':
      return { ...state, tenantId: action.payload };
    case 'SET_FILE_SYSTEM_NAME':
      return { ...state, fileSystemName: action.payload };
    case 'SET_ENCRYPTION_USER_NAME':
      return { ...state, encryptionUserName: action.payload };
    case 'SET_ENCRYPTION_PASSWORD':
      return { ...state, encryptionPassword: action.payload };
    case 'SET_ENCRYPTION_PORT':
      return { ...state, encrptionPort: action.payload };
    case 'SET_REMOTE_RKM':
      return { ...state, remoteRKM: action.payload };
    case 'SET_ENCRYPTION_CERT':
      return { ...state, encryptionCert: action.payload };
    case 'SET_CLIENT':
      return { ...state, client: action.payload };
    default:
      return state;
  }
};
