import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk';
import { SpecProvider, SpecType } from '../constants';

export type BackingStoreKind = K8sResourceCommon & {
  spec: {
    [key in SpecProvider]: {
      [key: string]: string;
    };
  } & {
    type: SpecType;
  };
};

export type MCGPayload = K8sResourceCommon & {
  spec: {
    type: string;
    ssl: boolean;
    [key: string]: any;
  };
};
