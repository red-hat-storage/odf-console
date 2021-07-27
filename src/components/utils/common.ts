import { K8sKind } from 'badhikar-dynamic-plugin-sdk/lib/api/common-types';

export const referenceForModel = (model: K8sKind) =>
  `${model.apiGroup}~${model.apiVersion}~${model.kind}`;
