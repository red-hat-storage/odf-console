import { action } from 'typesafe-actions';

export type ODFSystemFlagsPayload = {
  systemFlags: {
    [namespace: string]: {
      odfSystemName: string;
      ocsClusterName: string;
      isInternalMode: boolean;
      isExternalMode: boolean;
      isNoobaaStandalone: boolean;
      isNoobaaAvailable: boolean;
      isCephAvailable: boolean;
      isRGWAvailable: boolean;
      isNFSEnabled: boolean;
    };
  };
  areFlagsLoaded: boolean;
  flagsLoadError: unknown;
};

export enum ODFSystemFlagsActions {
  SetODFSystemFlags = 'setODFSystemFlags',
}

export type ODFSystemFlagsActionTypes = {
  type: ODFSystemFlagsActions;
  payload: ODFSystemFlagsPayload;
};

export const setODFSystemFlags = (
  payload: ODFSystemFlagsPayload
): ODFSystemFlagsActionTypes =>
  action(ODFSystemFlagsActions.SetODFSystemFlags, payload);
