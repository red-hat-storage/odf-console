import {
  k8sList,
  K8sResourceCommon,
  SetFeatureFlag,
} from '@openshift-console/dynamic-plugin-sdk';
import { SECOND, DEFAULT_SYNC_TIME } from './constants';
import { AcmMultiClusterObservabilityModel } from './models';
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

const acmMcoDetector: FeatureDetector = async (
  setFlag: SetFeatureFlag,
  flagKey: string,
  id: any
) => {
  // This set the flag to true only when ACM MultiClusterObservability CRD is in ready state.
  // which is later used by enable storage system.
  try {
    const managedClusters: ACMMultiClusterObservability[] =
      (await k8sList<K8sResourceCommon>({
        model: AcmMultiClusterObservabilityModel,
        queryParams: {},
      })) as ACMMultiClusterObservability[];
    const isEnabled = managedClusters?.[0]?.status?.conditions?.some(
      (condition) => condition.status === 'True' && condition.type === 'Ready'
    );
    if (isEnabled) {
      setFlag(flagKey, true);
      clearInterval(intervals[id]);
    }
  } catch (error) {
    setFlag(flagKey, false);
  }
};

const flagController: FlagController[] = [
  {
    flagKey: 'ACM_MCO',
    featureDetector: acmMcoDetector,
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
