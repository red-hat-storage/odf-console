import { ArgoApplicationSetModel } from '@odf/shared';
import { PLACEMENT_REF_LABEL } from '../constants';
import { ArgoApplicationSetKind } from '../types';

export const mockApplicationSet1: ArgoApplicationSetKind = {
  apiVersion: `${ArgoApplicationSetModel.apiGroup}/${ArgoApplicationSetModel.apiVersion}`,
  kind: ArgoApplicationSetModel.kind,
  metadata: {
    name: 'mock-appset-1',
    namespace: 'test-ns',
  },
  spec: {
    generators: [
      {
        clusterDecisionResource: {
          labelSelector: {
            matchLabels: {
              [PLACEMENT_REF_LABEL]: 'mock-placement-1',
            },
          },
        },
      },
    ],
    template: {
      spec: {
        destination: {
          namespace: 'test-ns',
        },
      },
    },
  },
};

export const mockApplicationSet2: ArgoApplicationSetKind = {
  apiVersion: `${ArgoApplicationSetModel.apiGroup}/${ArgoApplicationSetModel.apiVersion}`,
  kind: ArgoApplicationSetModel.kind,
  metadata: {
    name: 'mock-appset-2',
    namespace: 'test-ns',
  },
  spec: {
    generators: [
      {
        clusterDecisionResource: {
          labelSelector: {
            matchLabels: {
              [PLACEMENT_REF_LABEL]: 'mock-placement-2',
            },
          },
        },
      },
    ],
    template: {
      spec: {
        destination: {
          namespace: 'test-ns',
        },
      },
    },
  },
};
