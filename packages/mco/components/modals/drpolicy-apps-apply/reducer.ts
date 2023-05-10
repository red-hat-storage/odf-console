import { AlertVariant } from '@patternfly/react-core';
import { APPLICATION_TYPE } from '../../../constants';
import { PlacementToAppSets, PlacementToDrpcMap } from '../../../types';

export enum MessageType {
  UNSUPPORTED_OPERATION,
}

type Message = {
  text: string;
  description?: string;
  variant: AlertVariant;
};

export enum ApplyPolicyType {
  SET_APP_TYPE = 'SET_APP_TYPE',
  SET_LOADING = 'SET_LOADING',
  SET_MESSAGE = 'SET_MESSAGE',
  SET_PROTECTED_RESOURCES = 'SET_PROTECTED_RESOURCES',
  SET_AVAILABLE_RESOURCES = 'SET_AVAILABLE_RESOURCES',
  SET_DRPC_PVC_LABELS = 'SET_DRPC_PVC_LABELS',
}

export type ApplyPolicyInitialState = {
  appType: APPLICATION_TYPE;
  protectedResources: {
    [APPLICATION_TYPE.APPSET]: PlacementToAppSets[];
  };
  availableResources: {
    [APPLICATION_TYPE.APPSET]: PlacementToAppSets[];
  };
  drpcPvcLabels: {
    [APPLICATION_TYPE.APPSET]: PlacementToDrpcMap;
  };
  loading: boolean;
  message: Message;
};

export const applyPolicyInitialState: ApplyPolicyInitialState = {
  appType: APPLICATION_TYPE.APPSET,
  protectedResources: {
    [APPLICATION_TYPE.APPSET]: [],
  },
  availableResources: {
    [APPLICATION_TYPE.APPSET]: [],
  },
  drpcPvcLabels: {
    [APPLICATION_TYPE.APPSET]: {},
  },
  loading: false,
  message: {
    text: '',
    variant: AlertVariant.info,
  },
};

export type ApplyPolicyAction =
  | {
      type: ApplyPolicyType.SET_APP_TYPE;
      payload: APPLICATION_TYPE;
    }
  | {
      type: ApplyPolicyType.SET_LOADING;
      payload: boolean;
    }
  | {
      type: ApplyPolicyType.SET_MESSAGE;
      payload: Message;
    }
  | {
      type: ApplyPolicyType.SET_PROTECTED_RESOURCES;
      payload: PlacementToAppSets[];
    }
  | {
      type: ApplyPolicyType.SET_AVAILABLE_RESOURCES;
      payload: PlacementToAppSets[];
    }
  | {
      type: ApplyPolicyType.SET_DRPC_PVC_LABELS;
      payload: PlacementToDrpcMap;
    };

export const ApplyPolicyReducer = (
  state: ApplyPolicyInitialState,
  action: ApplyPolicyAction
) => {
  switch (action.type) {
    case ApplyPolicyType.SET_APP_TYPE: {
      return {
        ...state,
        appType: action.payload,
      };
    }
    case ApplyPolicyType.SET_LOADING: {
      return {
        ...state,
        loading: action.payload,
      };
    }
    case ApplyPolicyType.SET_MESSAGE: {
      return {
        ...state,
        message: action.payload,
      };
    }
    case ApplyPolicyType.SET_PROTECTED_RESOURCES: {
      const protectedResources = {
        ...state.protectedResources,
        [state.appType]: action.payload,
      };
      return {
        ...state,
        protectedResources,
      };
    }
    case ApplyPolicyType.SET_AVAILABLE_RESOURCES: {
      const availableResources = {
        ...state.availableResources,
        [state.appType]: action.payload,
      };
      return {
        ...state,
        availableResources,
      };
    }
    case ApplyPolicyType.SET_DRPC_PVC_LABELS: {
      const drpcPvcLabels = {
        ...state.drpcPvcLabels,
        [state.appType]: action.payload,
      };
      return {
        ...state,
        drpcPvcLabels,
      };
    }
    default:
      return state;
  }
};
