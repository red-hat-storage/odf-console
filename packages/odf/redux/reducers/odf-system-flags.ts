import { produce } from 'immer';
import {
  ODFSystemFlagsActionTypes,
  ODFSystemFlagsPayload,
  ODFSystemFlagsActions,
} from '../actions';

const initialState: ODFSystemFlagsPayload = {
  systemFlags: {},
  areFlagsLoaded: false,
  flagsLoadError: undefined,
};

export const odfSystemFlagsReducer = (
  odfNamespaceState = initialState,
  action: ODFSystemFlagsActionTypes
): ODFSystemFlagsPayload => {
  const payload = action.payload;
  switch (action.type) {
    case ODFSystemFlagsActions.SetODFSystemFlags:
      return produce(odfNamespaceState, (draft) => {
        draft.systemFlags = payload.systemFlags;
        draft.areFlagsLoaded = payload.areFlagsLoaded;
        draft.flagsLoadError = payload.flagsLoadError;
      });
    default:
      return odfNamespaceState;
  }
};
