import { AWS_REGIONS, BC_PROVIDERS, createFormAction } from '../../constants';

export type ProviderDataState = {
  name: string;
  provider: BC_PROVIDERS;
  secretName: string;
  secretKey: string;
  accessKey: string;
  region: string;
  target: string;
  endpoint: string;
};

export type StoreAction =
  | { type: createFormAction.SET_NAME; value: string }
  | { type: createFormAction.SET_PROVIDER; value: string }
  | { type: createFormAction.SET_SECRET_NAME; value: string }
  | { type: createFormAction.SET_SECRET_KEY; value: string }
  | { type: createFormAction.SET_ACCESS_KEY; value: string }
  | { type: createFormAction.SET_REGION; value: string }
  | { type: createFormAction.SET_TARGET; value: string }
  | { type: createFormAction.SET_END_POINT; value: string };

export type BackingStoreProviderDataState = ProviderDataState & {
  numVolumes: number;
  gcpJSON: string;
  volumeSize: string;
  storageClass: string;
};

export type BackingStoreAction =
  | StoreAction
  | { type: createFormAction.SET_GCP_JSON; value: string }
  | { type: createFormAction.SET_PVC_VOLUME; value: number }
  | { type: createFormAction.SET_PVC_VOLUME_SIZE; value: string }
  | { type: createFormAction.SET_PVC_STORAGE_CLASS; value: string };

export const initialState: BackingStoreProviderDataState = {
  name: '',
  provider: BC_PROVIDERS.AWS,
  secretName: '',
  secretKey: '',
  accessKey: '',
  region: AWS_REGIONS[0],
  gcpJSON: '',
  target: '',
  endpoint: '',
  numVolumes: 1,
  volumeSize: '50Gi',
  storageClass: '',
};

export const providerDataReducer = (
  state: BackingStoreProviderDataState,
  action: BackingStoreAction
) => {
  const { value } = action;
  switch (action.type) {
    case createFormAction.SET_NAME:
      return Object.assign({}, state, { name: value });
    case createFormAction.SET_PROVIDER:
      return Object.assign({}, state, { provider: value });
    case createFormAction.SET_SECRET_NAME:
      return Object.assign({}, state, { secretName: value });
    case createFormAction.SET_SECRET_KEY:
      return Object.assign({}, state, { secretKey: value });
    case createFormAction.SET_ACCESS_KEY:
      return Object.assign({}, state, { accessKey: value });
    case createFormAction.SET_REGION:
      return Object.assign({}, state, { region: value });
    case createFormAction.SET_GCP_JSON:
      return Object.assign({}, state, { gcpJSON: value });
    case createFormAction.SET_TARGET:
      return Object.assign({}, state, { target: value });
    case createFormAction.SET_END_POINT:
      return Object.assign({}, state, { endpoint: value });
    case createFormAction.SET_PVC_VOLUME:
      return Object.assign({}, state, { numVolumes: value });
    case createFormAction.SET_PVC_VOLUME_SIZE:
      return Object.assign({}, state, { volumeSize: value });
    case createFormAction.SET_PVC_STORAGE_CLASS:
      return Object.assign({}, state, { storageClass: value });
    default:
      return initialState;
  }
};
