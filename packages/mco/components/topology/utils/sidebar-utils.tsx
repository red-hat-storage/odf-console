import * as React from 'react';
import { DRPlacementControlModel } from '@odf/shared';
import { referenceForModel } from '@odf/shared/utils';
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
} from '@patternfly/react-icons';

export const getAppLink = (name: string, namespace: string) => {
  return `/k8s/ns/${namespace}/${referenceForModel(DRPlacementControlModel)}/${name}`;
};

export const DRStatusIcon: React.FC<{ status: string }> = ({ status }) => {
  switch (status) {
    case 'Critical':
      return (
        <>
          <ExclamationCircleIcon color="var(--pf-v6-global--danger-color--100)" />
          <span>{status}</span>
        </>
      );
    case 'Available':
      return (
        <>
          <CheckCircleIcon color="var(--pf-v6-global--success-color--100)" />
          <span>{status}</span>
        </>
      );
    case 'FailedOver':
      return (
        <>
          <ExclamationCircleIcon color="var(--pf-v6-global--warning-color--100)" />
          <span>{status}</span>
        </>
      );
    default:
      return <span>{status}</span>;
  }
};
