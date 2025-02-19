import {
  PrometheusResponse,
  K8sResourceCommon,
  FirehoseResult,
  SubsystemHealth,
} from '@openshift-console/dynamic-plugin-sdk';
import { TFunction } from 'react-i18next';

export type HumanizeResult = {
  value: number;
  unit: string;
  string: string;
};

export type RowFunctionArgs<T = any, C = any> = {
  obj: T;
  columns: any[];
  customData?: C;
};

export type K8sResourceCondition = {
  type: string;
  status: keyof typeof K8sResourceConditionStatus;
  lastTransitionTime?: string;
  reason?: string;
  message?: string;
};

export enum K8sResourceConditionStatus {
  True = 'True',
  False = 'False',
  Unknown = 'Unknown',
}

export type StorageClass = K8sResourceCommon & {
  provisioner: string;
  parameters: object;
  reclaimPolicy?: string;
  volumeBindingMode?: string;
  allowVolumeExpansion?: boolean;
};

export type PrometheusHealthHandler = (
  responses: {
    response: PrometheusResponse;
    error: any;
  }[],
  t?: TFunction,
  additionalResource?: FirehoseResult<K8sResourceCommon | K8sResourceCommon[]>
) => SubsystemHealth;
