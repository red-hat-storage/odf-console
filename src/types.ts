import { K8sResourceCommon } from 'badhikar-dynamic-plugin-sdk';

export type StorageSystemKind = K8sResourceCommon & {
  spec: {
    kind: string;
    name: string;
    namespace: string;
  };
  status: {
    phase: string;
  }
};

export type HumanizeResult = {
  value: number;
  unit: string;
  string: string;
};
