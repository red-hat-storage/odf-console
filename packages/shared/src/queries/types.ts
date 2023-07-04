import { K8sModel } from '@openshift-console/dynamic-plugin-sdk';

export enum BreakdownCardFields {
  PROJECTS = 'Projects',
  STORAGE_CLASSES = 'Storage Classes',
  PODS = 'Pods',
}

export enum BreakdownCardFieldsWithParams {
  PVCS = 'PVCs',
}

export type BreakdownCardQueryMap = {
  [key in BreakdownCardFields]: {
    model: K8sModel;
    metric: string;
    queries: {
      [key: string]: string;
    };
  };
};

export type BreakdownCardFieldsValues = {
  model: K8sModel;
  metric: string;
  queries: {
    [key: string]: string;
  };
};
