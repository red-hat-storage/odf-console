import { ApplicationModel } from '@odf/shared/models';
import { ApplicationKind } from '@odf/shared/types';
import { ACMSubscriptionModel } from '../models';

export const mockApplication1: ApplicationKind = {
  apiVersion: `${ApplicationModel.apiGroup}/${ApplicationModel.apiVersion}`,
  kind: ApplicationModel.kind,
  metadata: {
    name: 'mock-application-1',
    namespace: 'test-ns',
  },
  spec: {
    componentKinds: [
      {
        group: ACMSubscriptionModel.apiGroup,
        kind: ACMSubscriptionModel.kind,
      },
    ],
    selector: {
      matchExpressions: [
        {
          key: 'app',
          operator: 'In',
          values: ['mock-application-1'],
        },
      ],
    },
  },
};

export const mockApplication2: ApplicationKind = {
  apiVersion: `${ApplicationModel.apiGroup}/${ApplicationModel.apiVersion}`,
  kind: ApplicationModel.kind,
  metadata: {
    name: 'mock-application-2',
    namespace: 'test-ns',
  },
  spec: {
    componentKinds: [
      {
        group: ACMSubscriptionModel.apiGroup,
        kind: ACMSubscriptionModel.kind,
      },
    ],
    selector: {
      matchExpressions: [
        {
          key: 'app',
          operator: 'In',
          values: ['mock-application-2'],
        },
      ],
    },
  },
};
