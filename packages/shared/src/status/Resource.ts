import { K8sResourceKind } from '@odf/shared/types';

export const resourceStatus = (resource: K8sResourceKind): string =>
  resource?.status?.phase || '';
