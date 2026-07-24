import { McgPerformanceProfile, ResourceProfile } from '@odf/core/types';
import { StorageClusterKind } from '@odf/shared';

export type ConfigurePerformanceProfileFormState = {
  inProgress: boolean;
  errorMessage: string | null;
  resourceProfile: ResourceProfile | null;
  mcgPerformanceProfile: McgPerformanceProfile | null;
};

export const initialConfigurePerformanceProfileState: ConfigurePerformanceProfileFormState =
  {
    inProgress: false,
    errorMessage: null,
    resourceProfile: null,
    mcgPerformanceProfile: null,
  };

export const initProfileStates = (
  storageCluster: StorageClusterKind
): ConfigurePerformanceProfileFormState => ({
  ...initialConfigurePerformanceProfileState,
  resourceProfile: storageCluster.spec?.resourceProfile ?? null,
  mcgPerformanceProfile:
    storageCluster.spec?.multiCloudGateway?.performanceProfile ?? null,
});

export enum ConfigurePerformanceProfileActionType {
  SET_INPROGRESS = 'SET_INPROGRESS',
  SET_ERROR_MESSAGE = 'SET_ERROR_MESSAGE',
  SET_RESOURCE_PROFILE = 'SET_RESOURCE_PROFILE',
  SET_MCG_PERFORMANCE_PROFILE = 'SET_MCG_PERFORMANCE_PROFILE',
}

export type ConfigurePerformanceProfileAction =
  | {
      type: ConfigurePerformanceProfileActionType.SET_INPROGRESS;
      payload: boolean;
    }
  | {
      type: ConfigurePerformanceProfileActionType.SET_ERROR_MESSAGE;
      payload: string | null;
    }
  | {
      type: ConfigurePerformanceProfileActionType.SET_RESOURCE_PROFILE;
      payload: ResourceProfile | null;
    }
  | {
      type: ConfigurePerformanceProfileActionType.SET_MCG_PERFORMANCE_PROFILE;
      payload: McgPerformanceProfile | null;
    };

export const configurePerformanceProfileReducer = (
  state: ConfigurePerformanceProfileFormState,
  action: ConfigurePerformanceProfileAction
): ConfigurePerformanceProfileFormState => {
  switch (action.type) {
    case ConfigurePerformanceProfileActionType.SET_INPROGRESS:
      return { ...state, inProgress: action.payload };
    case ConfigurePerformanceProfileActionType.SET_ERROR_MESSAGE:
      return { ...state, errorMessage: action.payload };
    case ConfigurePerformanceProfileActionType.SET_RESOURCE_PROFILE:
      return { ...state, resourceProfile: action.payload };
    case ConfigurePerformanceProfileActionType.SET_MCG_PERFORMANCE_PROFILE:
      return { ...state, mcgPerformanceProfile: action.payload };
    default:
      return state;
  }
};
