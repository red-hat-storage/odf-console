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

export enum InfraProviders {
  AWS = 'AWS',
  Azure = 'Azure',
  BareMetal = 'BareMetal',
  GCP = 'GCP',
  IBMCloud = 'IBMCloud',
  None = 'None',
  OpenStack = 'OpenStack',
  OVirt = 'oVirt',
  VSphere = 'VSphere',
}

export type InfrastructureKind = K8sResourceCommon & {
  apiVersion: 'config.openshift.io/v1';
  kind: 'Infrastructure';
  spec: {
    platformSpec: {
      type: InfraProviders;
    };
  };
  status?: {
    platform: InfraProviders;
  };
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

export type PrometheusHealthHandler = (
  responses: {
    response: PrometheusResponse;
    error: any;
  }[],
  t?: TFunction,
  additionalResource?: FirehoseResult<K8sResourceCommon | K8sResourceCommon[]>
) => SubsystemHealth;

export type RowFunctionArgs<T = any, C = any> = {
  obj: T;
  columns: any[];
  customData?: C;
};

export type StorageClass = K8sResourceCommon & {
  provisioner: string;
  parameters: object;
  reclaimPolicy?: string;
  volumeBindingMode?: string;
  allowVolumeExpansion?: boolean;
};

export type CRDVersion = {
  name: string;
  served: boolean;
  storage: boolean;
  schema: {
    // NOTE: Actually a subset of JSONSchema, but using this type for convenience
    openAPIV3Schema: any;
  };
};

export type CustomResourceDefinitionKind = {
  spec: {
    group: string;
    versions: CRDVersion[];
    names: {
      kind: string;
      singular: string;
      plural: string;
      listKind: string;
      shortNames?: string[];
    };
    scope: 'Cluster' | 'Namespaced';
  };
  status?: {
    conditions?: K8sResourceCondition[];
  };
} & K8sResourceCommon;
