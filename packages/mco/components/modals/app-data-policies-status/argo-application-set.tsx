import * as React from 'react';
import { getNamespace, getName } from '@odf/shared/selectors';
import * as _ from 'lodash-es';
import { DRPCStatus } from '../../../constants';
import {
  getDRClusterResourceObj,
  getDRPlacementControlResourceObj,
  getDRPolicyResourceObj,
  useDisasterRecoveryResourceWatch,
} from '../../../hooks';
import { ArgoApplicationSetKind } from '../../../types';
import {
  findPlacementNameFromAppSet,
  findDRResourceUsingPlacement,
  findDRType,
} from '../../../utils';
import { DRStatusProps } from './dr-status';
import { StatusPopover } from './status-popover';

const getResources = (namespace: string) => ({
  resources: {
    drClusters: getDRClusterResourceObj(),
    drPolicies: getDRPolicyResourceObj(),
    drPlacementControls: getDRPlacementControlResourceObj({ namespace }),
  },
});

export const ArogoApplicationSetStatus: React.FC<
  ArogoApplicationSetStatusProps
> = ({ application }) => {
  const [drResources] = useDisasterRecoveryResourceWatch(
    getResources(getNamespace(application))
  );

  const drStatus: DRStatusProps[] = React.useMemo(() => {
    const placementName = findPlacementNameFromAppSet(application);
    // TODO change to appset remote workload namespace
    const drResource = findDRResourceUsingPlacement(
      placementName,
      getNamespace(application),
      drResources?.formattedResources
    );
    if (!_.isEmpty(drResource)) {
      const drpc = drResource?.drPlacementControls?.[0];
      const drPolicy = drResource?.drPolicy;
      const status = drpc?.status?.phase as DRPCStatus;
      const targetCluster = [
        DRPCStatus.FailedOver,
        DRPCStatus.FailingOver,
      ].includes(status)
        ? drpc?.spec?.failoverCluster
        : drpc?.spec?.preferredCluster;
      return [
        {
          policyName: getName(drPolicy),
          status: status,
          dataLastSyncedOn: drpc?.status?.lastGroupSyncTime,
          schedulingInterval: drPolicy?.spec?.schedulingInterval,
          targetCluster: targetCluster,
          replicationType: findDRType(drResource?.drClusters),
        },
      ];
    }
    return [];
  }, [drResources, application]);

  return <StatusPopover disasterRecoveryStatus={drStatus} />;
};

type ArogoApplicationSetStatusProps = {
  application: ArgoApplicationSetKind;
};
