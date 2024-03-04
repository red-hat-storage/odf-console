import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk';
import * as _ from 'lodash-es';

export enum EnrollDiscoveredApplicationStateType {
  SET_CLUSTER_NAME = 'NAMESPACE/SET_CLUSTER_NAME',
  SET_NAMESPACES = 'NAMESPACE/SET_NAMESPACES',
}

export type EnrollDiscoveredApplicationState = {
  namespace: {
    // Single or multi namespaces of the discovered application
    namespaces: K8sResourceCommon[];
    // Cluster name of the discovered application
    clusterName: string;
  };
};

export type EnrollReducer = (
  state: EnrollDiscoveredApplicationState,
  action: EnrollDiscoveredApplicationAction
) => EnrollDiscoveredApplicationState;

// State of EnrollDiscoveredApplication
export const initialState: EnrollDiscoveredApplicationState = {
  namespace: {
    clusterName: '',
    namespaces: [],
  },
};

// Actions of EnrollDiscoveredApplication
export type EnrollDiscoveredApplicationAction =
  | {
      type: EnrollDiscoveredApplicationStateType.SET_CLUSTER_NAME;
      payload: string;
    }
  | {
      type: EnrollDiscoveredApplicationStateType.SET_NAMESPACES;
      payload: K8sResourceCommon[];
    };

export const reducer: EnrollReducer = (state, action) => {
  let newState: EnrollDiscoveredApplicationState = _.cloneDeep(state);
  switch (action.type) {
    case EnrollDiscoveredApplicationStateType.SET_CLUSTER_NAME: {
      // Cluser change requires state reset
      if (newState.namespace.clusterName !== action.payload) {
        newState = _.cloneDeep(initialState);
      }
      newState.namespace.clusterName = action.payload;
      break;
    }
    case EnrollDiscoveredApplicationStateType.SET_NAMESPACES: {
      newState.namespace.namespaces = action.payload;
      break;
    }
    default:
      throw new TypeError(`${action} is not a valid reducer action`);
  }
  return newState;
};
