import { produce } from 'immer';
import { NsPayload, NsActions, NsActionTypes } from '../actions';

const initialState: NsPayload = {
  odfNamespace: null,
  isODFNsLoaded: false,
  odfNsLoadError: undefined,
};

export const odfNamespaceReducer = (
  odfNamespaceState = initialState,
  action: NsActionTypes
): NsPayload => {
  const payload = action.payload;
  switch (action.type) {
    case NsActions.SetODFNamespace:
      return produce(odfNamespaceState, (draft) => {
        draft.odfNamespace = payload.odfNamespace;
        draft.isODFNsLoaded = payload.isODFNsLoaded;
        draft.odfNsLoadError = payload.odfNsLoadError;
      });
    default:
      return odfNamespaceState;
  }
};
