import { produce } from 'immer';
import { nsPayload, nsActions, nsActionTypes } from '../actions';

const initialState: nsPayload = {
  odfNamespace: null,
  isODFNsLoaded: false,
  odfNsLoadError: undefined,
};

export const odfNamespaceReducer = (
  odfNamespaceState = initialState,
  action: nsActionTypes
): nsPayload => {
  const payload = action.payload;
  switch (action.type) {
    case nsActions.SetODFNamespace:
      return produce(odfNamespaceState, (draft) => {
        draft.odfNamespace = payload.odfNamespace;
        draft.isODFNsLoaded = payload.isODFNsLoaded;
        draft.odfNsLoadError = payload.odfNsLoadError;
      });
    default:
      return odfNamespaceState;
  }
};
