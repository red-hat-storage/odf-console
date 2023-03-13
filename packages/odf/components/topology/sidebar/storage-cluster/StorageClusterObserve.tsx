import * as React from 'react';
import { UtilizationContent as ExternalUtilizationContent } from '@odf/ocs/dashboards/persistent-external/utilization-card';
import { UtilizationContent as InternalUtilizationContent } from '@odf/ocs/dashboards/persistent-internal/utilization-card/utilization-card';
import {
  K8sResourceCommon,
  useFlag,
} from '@openshift-console/dynamic-plugin-sdk';
import { CEPH_FLAG, OCS_INDEPENDENT_FLAG } from '../../../../features';

export const StorageClusterObserve: React.FC<{ resource?: K8sResourceCommon }> =
  () => {
    const isIndependent = useFlag(OCS_INDEPENDENT_FLAG);
    const isCephAvailable = useFlag(CEPH_FLAG);
    const isInternal = !isIndependent && isCephAvailable;

    return isInternal ? (
      <InternalUtilizationContent />
    ) : (
      <ExternalUtilizationContent />
    );
  };
