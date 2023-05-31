import * as React from 'react';
import { getNamespace, getName } from '@odf/shared/selectors';
import { useK8sWatchResources } from '@openshift-console/dynamic-plugin-sdk';
import * as _ from 'lodash-es';
import { DRPC_STATUS } from '../../../constants';
import { useDRResourceParser, getDRResources } from '../../../hooks';
import { ArgoApplicationSetKind, WatchDRResourceType } from '../../../types';
import {
  findPlacementNameFromAppSet,
  findDRResourceUsingPlacement,
  findDRType,
} from '../../../utils';
import { DRStatusProps } from './dr-status';
import { StatusPopover } from './status-popover';

export const ArogoApplicationSetStatus: React.FC<ArogoApplicationSetStatusProps> =
  ({ application }) => {
    const appNamespace = getNamespace(application);
    const drResources = useK8sWatchResources<WatchDRResourceType>(
      getDRResources(appNamespace)
    );
    const drParserResult = useDRResourceParser({ resources: drResources });
    const { data: drResult, loaded, loadError } = drParserResult || {};
    const placementName = findPlacementNameFromAppSet(application);

    const drStatus: DRStatusProps[] = React.useMemo(() => {
      if (loaded && !loadError) {
        const drResource = findDRResourceUsingPlacement(
          placementName,
          appNamespace,
          drResult
        );
        if (!_.isEmpty(drResource)) {
          const drpc = drResource?.drPlacementControls?.[0];
          const drPolicy = drResource?.drPolicy;
          const status = drpc?.status?.phase as DRPC_STATUS;
          const targetCluster = [
            DRPC_STATUS.FailedOver,
            DRPC_STATUS.FailingOver,
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
      }
      return [];
    }, [placementName, appNamespace, drResult, loaded, loadError]);

    return <StatusPopover disasterRecoveryStatus={drStatus} />;
  };

type ArogoApplicationSetStatusProps = {
  application: ArgoApplicationSetKind;
};
