import { NAME_NAMESPACE_SPLIT_CHAR } from '@odf/mco/constants';
import { DRPolicyKind } from '@odf/mco/types';
import {
  K8sResourceCommon,
  MatchExpression,
} from '@openshift-console/dynamic-plugin-sdk';
import * as _ from 'lodash-es';

export enum ProtectionMethodType {
  RECIPE = 'RECIPE',
  RESOURCE_LABEL = 'RESOURCE_LABEL',
}

export enum EnrollDiscoveredApplicationStateType {
  SET_CLUSTER_NAME = 'NAMESPACE/SET_CLUSTER_NAME',
  SET_NAMESPACES = 'NAMESPACE/SET_NAMESPACES',
  SET_PROTECTION_METHOD = 'CONFIGURATION/SET_PROTECTION_METHOD',
  SET_RECIPE_NAME_NAMESPACE = 'CONFIGURATION/RECIPE/SET_RECIPE_NAME_NAMESPACE',
  SET_K8S_RESOURCE_LABEL_EXPRESSIONS = 'CONFIGURATION/RESOURCE_LABEL/SET_K8S_RESOURCE_LABEL_EXPRESSIONS',
  SET_PVC_LABEL_EXPRESSIONS = 'CONFIGURATION/RESOURCE_LABEL/SET_PVC_LABEL_EXPRESSIONS',
  SET_POLICY = 'REPLICATION/SET_POLICY',
  SET_K8S_RESOURCE_REPLICATION_INTERVAL = 'REPLICATION/SET_K8S_RESOURCE_REPLICATION_INTERVAL',
  SET_NAME = 'NAMESPACE/SET_NAME',
  ENABLE_CONSISTENCY_GROUP = 'CONFIGURATION/ENABLE_CONSISTENCY_GROUP',
}

export type EnrollDiscoveredApplicationState = {
  namespace: {
    // Single or multi namespaces of the discovered application
    namespaces: K8sResourceCommon[];
    // Cluster name of the discovered application
    clusterName: string;
    // DRPC name to protect the discovered application
    name: string;
  };
  configuration: {
    // recipe CRD (or) normal K8s CR label based protection
    protectionMethod: ProtectionMethodType;
    recipe: {
      // selected recipe CR name from the managed cluster
      recipeName: string;
      // recipe CR namespace
      recipeNamespace: string;
    };
    resourceLabels: {
      k8sResourceLabelExpressions: MatchExpression[];
      pvcLabelExpressions: MatchExpression[];
    };
    isConsistencyGroupEnabled: boolean;
  };
  replication: {
    drPolicy: DRPolicyKind;
    k8sResourceReplicationInterval: string;
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
    name: '',
  },
  configuration: {
    // Resource label as a default option
    protectionMethod: ProtectionMethodType.RESOURCE_LABEL,
    recipe: {
      recipeName: '',
      recipeNamespace: '',
    },
    resourceLabels: {
      k8sResourceLabelExpressions: [],
      pvcLabelExpressions: [],
    },
    isConsistencyGroupEnabled: false,
  },
  replication: {
    drPolicy: {},
    k8sResourceReplicationInterval: '5m',
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
    }
  | {
      type: EnrollDiscoveredApplicationStateType.SET_PROTECTION_METHOD;
      payload: ProtectionMethodType;
    }
  | {
      type: EnrollDiscoveredApplicationStateType.SET_RECIPE_NAME_NAMESPACE;
      payload: string;
    }
  | {
      type: EnrollDiscoveredApplicationStateType.SET_K8S_RESOURCE_LABEL_EXPRESSIONS;
      payload: MatchExpression[];
    }
  | {
      type: EnrollDiscoveredApplicationStateType.SET_PVC_LABEL_EXPRESSIONS;
      payload: MatchExpression[];
    }
  | {
      type: EnrollDiscoveredApplicationStateType.SET_POLICY;
      payload: DRPolicyKind;
    }
  | {
      type: EnrollDiscoveredApplicationStateType.SET_K8S_RESOURCE_REPLICATION_INTERVAL;
      payload: string;
    }
  | {
      type: EnrollDiscoveredApplicationStateType.SET_NAME;
      payload: string;
    }
  | {
      type: EnrollDiscoveredApplicationStateType.ENABLE_CONSISTENCY_GROUP;
      payload: boolean;
    };

export const reducer: EnrollReducer = (state, action) => {
  // State shallow copy
  switch (action.type) {
    case EnrollDiscoveredApplicationStateType.SET_CLUSTER_NAME: {
      // Cluser change requires state reset
      const newState =
        state.namespace.clusterName !== action.payload
          ? _.cloneDeep(initialState)
          : state;
      return {
        ...newState,
        namespace: {
          ...newState.namespace,
          clusterName: action.payload,
          name: state.namespace.name,
        },
      };
    }
    case EnrollDiscoveredApplicationStateType.SET_NAMESPACES: {
      // Namespace change requires configuration state reset
      return {
        ...state,
        namespace: {
          ...state.namespace,
          namespaces: action.payload,
        },
        configuration: _.cloneDeep(initialState.configuration),
      };
    }
    case EnrollDiscoveredApplicationStateType.SET_PROTECTION_METHOD: {
      return {
        ...state,
        configuration: {
          ...state.configuration,
          protectionMethod: action.payload,
        },
      };
    }
    case EnrollDiscoveredApplicationStateType.SET_RECIPE_NAME_NAMESPACE: {
      const [recipeName, recipeNamespace] = action.payload.split(
        NAME_NAMESPACE_SPLIT_CHAR
      );
      return {
        ...state,
        configuration: {
          ...state.configuration,
          recipe: {
            recipeName,
            recipeNamespace,
          },
        },
      };
    }
    case EnrollDiscoveredApplicationStateType.SET_K8S_RESOURCE_LABEL_EXPRESSIONS: {
      return {
        ...state,
        configuration: {
          ...state.configuration,
          resourceLabels: {
            ...state.configuration.resourceLabels,
            k8sResourceLabelExpressions: action.payload,
          },
        },
      };
    }
    case EnrollDiscoveredApplicationStateType.SET_PVC_LABEL_EXPRESSIONS: {
      return {
        ...state,
        configuration: {
          ...state.configuration,
          resourceLabels: {
            ...state.configuration.resourceLabels,
            pvcLabelExpressions: action.payload,
          },
        },
      };
    }
    case EnrollDiscoveredApplicationStateType.SET_POLICY: {
      return {
        ...state,
        replication: {
          ...state.replication,
          drPolicy: action.payload,
        },
      };
    }
    case EnrollDiscoveredApplicationStateType.SET_K8S_RESOURCE_REPLICATION_INTERVAL: {
      return {
        ...state,
        replication: {
          ...state.replication,
          k8sResourceReplicationInterval: action.payload,
        },
      };
    }
    case EnrollDiscoveredApplicationStateType.SET_NAME: {
      return {
        ...state,
        namespace: {
          ...state.namespace,
          name: action.payload,
        },
      };
    }
    case EnrollDiscoveredApplicationStateType.ENABLE_CONSISTENCY_GROUP: {
      return {
        ...state,
        configuration: {
          ...state.configuration,
          isConsistencyGroupEnabled: action.payload,
        },
      };
    }
    default:
      throw new TypeError(`${action} is not a valid reducer action`);
  }
};
