import * as React from 'react';
import { UtilizationContent as InternalUtilizationContent } from '@odf/ocs/dashboards/persistent-internal/utilization-card/utilization-card';
import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk';

export const StorageClusterObserve: React.FC<{
  resource?: K8sResourceCommon;
  odfNamespace?: string;
}> = () => {
  return <InternalUtilizationContent />;
};
