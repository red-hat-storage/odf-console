import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk';
import { Selector } from '@openshift-console/dynamic-plugin-sdk/lib/api/common-types';

export type ArgoApplicationSetKind = K8sResourceCommon & {
  spec: {
    generators?: {
      clusterDecisionResource?: {
        configMapRef?: string;
        labelSelector?: Selector;
        requeueAfterSeconds?: number;
      };
    }[];
    template?: {
      spec?: {
        destination?: {
          namespace?: string;
          server?: string;
        };
      };
    };
  };
};
