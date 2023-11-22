import { SelfSubjectAccessReviewModel } from '@odf/shared/models';
import {
  k8sCreate,
  k8sList,
  K8sResourceCommon,
  SelfSubjectAccessReviewKind,
  SetFeatureFlag,
} from '@openshift-console/dynamic-plugin-sdk';
import * as _ from 'lodash-es';
import {
  SECOND,
  DEFAULT_SYNC_TIME,
  ACM_OBSERVABILITY_FLAG,
  ADMIN_FLAG,
  HUB_CLUSTER_NAME,
} from './constants';
import { AcmMultiClusterObservabilityModel, MirrorPeerModel } from './models';
import { ACMMultiClusterObservability } from './types';

let intervals: NodeJS.Timeout[] = [];

type FeatureDetector = (
  setFlag: SetFeatureFlag,
  flagKey: string,
  intervalId: any
) => Promise<void>;

type FlagController = {
  flagKey: string;
  featureDetector: FeatureDetector;
  syncTime?: number;
};

// Check the user's access to some resources.
const ssarChecks = {
  [ADMIN_FLAG]: {
    group: MirrorPeerModel.apiGroup,
    resource: MirrorPeerModel.plural,
    verb: 'create',
  },
};

const handleError = (
  res: any,
  flagKey: string,
  setFlag: SetFeatureFlag,
  intervalId: any
) => {
  if (res?.response instanceof Response) {
    const status = res?.response?.status;
    if (_.includes([502], status)) {
      setFlag(flagKey, undefined);
      clearInterval(intervals[intervalId]);
    }
    if (!_.includes([401, 403, 500], status)) {
      setFlag(flagKey, undefined);
    }
  } else {
    setFlag(flagKey, undefined);
    clearInterval(intervals[intervalId]);
  }
};

const acmObservabilityDetector: FeatureDetector = async (
  setFlag: SetFeatureFlag,
  flagKey: string,
  id: any
) => {
  // This set the flag to true only when ACM MultiClusterObservability CRD is in ready state.
  // which is later used by enable storage system.
  try {
    const acmObservability: ACMMultiClusterObservability[] =
      (await k8sList<K8sResourceCommon>({
        model: AcmMultiClusterObservabilityModel,
        queryParams: { cluster: HUB_CLUSTER_NAME },
      })) as ACMMultiClusterObservability[];
    if (!!acmObservability.length) {
      const isEnabled = acmObservability?.[0]?.status?.conditions?.some(
        (condition) => condition.status === 'True' && condition.type === 'Ready'
      );
      setFlag(flagKey, isEnabled);
      isEnabled && clearInterval(intervals[id]);
    } else {
      setFlag(flagKey, undefined);
      clearInterval(intervals[id]);
    }
  } catch (error) {
    handleError(error, flagKey, setFlag, id);
  }
};

export const detectSSAR = async (
  setFlag: SetFeatureFlag,
  flagKey: string,
  id: any
) => {
  try {
    const result: SelfSubjectAccessReviewKind = (await k8sCreate({
      model: SelfSubjectAccessReviewModel,
      data: {
        apiVersion: 'authorization.k8s.io/v1',
        kind: 'SelfSubjectAccessReview',
        spec: { resourceAttributes: ssarChecks[flagKey] },
      },
    })) as SelfSubjectAccessReviewKind;
    const isAllowed = result?.status?.allowed;
    setFlag(flagKey, isAllowed);
    _.isBoolean(isAllowed) && clearInterval(intervals[id]);
  } catch (error) {
    handleError(error, flagKey, setFlag, id);
  }
};

const flagController: FlagController[] = [
  {
    flagKey: ACM_OBSERVABILITY_FLAG,
    featureDetector: acmObservabilityDetector,
  },
  {
    flagKey: ADMIN_FLAG,
    featureDetector: detectSSAR,
  },
];

export const setFeatureFlag = async (
  setFlag: SetFeatureFlag
): Promise<void> => {
  flagController.map(async (controller, id) => {
    await controller.featureDetector(setFlag, controller.flagKey, id);
    const intervalId = setInterval(
      controller.featureDetector,
      (controller.syncTime || DEFAULT_SYNC_TIME) * SECOND,
      setFlag,
      controller.flagKey,
      id
    );
    intervals[id] = intervalId;
  });
};
