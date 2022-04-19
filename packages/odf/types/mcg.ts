import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk';
import {
  NS_NOOBAA_TYPE_MAP,
  NS_PROVIDERS_NOOBAA_MAP,
  SpecProvider,
  SpecType,
} from '../constants';

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

export type nsSpecProvider =
  typeof NS_PROVIDERS_NOOBAA_MAP[keyof typeof NS_PROVIDERS_NOOBAA_MAP];

export type nsSpecType =
  typeof NS_NOOBAA_TYPE_MAP[keyof typeof NS_NOOBAA_TYPE_MAP];

export type NamespaceStoreKind = K8sResourceCommon & {
  spec: {
    [key in nsSpecProvider]: {
      [key: string]: string;
    };
  } & {
    type: nsSpecType;
  };
};
