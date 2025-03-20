import { ACMSubscriptionModel } from '@odf/shared';
import { ACMSubscriptionKind } from '../types';

export const mockSubscription1: ACMSubscriptionKind = {
  apiVersion: `${ACMSubscriptionModel.apiGroup}/${ACMSubscriptionModel.apiVersion}`,
  kind: ACMSubscriptionModel.kind,
  metadata: {
    name: 'mock-subscription-1',
    namespace: 'test-ns',
    labels: { app: 'mock-application-1' },
  },
  spec: {
    placement: {
      placementRef: {
        kind: 'Placement',
        name: 'mock-placement-1',
      },
    },
  },
};

export const mockSubscription2: ACMSubscriptionKind = {
  apiVersion: `${ACMSubscriptionModel.apiGroup}/${ACMSubscriptionModel.apiVersion}`,
  kind: ACMSubscriptionModel.kind,
  metadata: {
    name: 'mock-subscription-2',
    namespace: 'test-ns',
    labels: { app: 'mock-application-2' },
  },
  spec: {
    placement: {
      placementRef: {
        kind: 'Placement',
        name: 'mock-placement-2',
      },
    },
  },
};
