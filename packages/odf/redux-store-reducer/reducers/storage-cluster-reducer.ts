import { Actions, ActionTypes } from '../actions/storage-cluster-actions';

type State = {
  storageClusterName: string | null;
};

const initialState: State = {
  storageClusterName: null,
};

export default (state = initialState, action: ActionTypes): State => {
  switch (action.type) {
    case Actions.SetStorageClusterName:
      return {
        ...state,
        storageClusterName: action.payload.storageClusterName,
      };
    default:
      return state;
  }
};
