import * as React from 'react';
import {
  DashboardCard,
  DashboardCardBody,
  DashboardCardHeader,
  DashboardCardTitle,
  usePrometheusPoll,
} from 'badhikar-dynamic-plugin-sdk/internalAPI';
import {
  PrometheusResponse,
  WatchK8sResource,
} from 'badhikar-dynamic-plugin-sdk';
import { useK8sWatchResource } from 'badhikar-dynamic-plugin-sdk/api';
import CapacityCard, {
  CapacityMetricDatum,
} from '../../common/capacity-card/capacity-card';
import { getGVK, referenceFor, referenceForModel } from '../../utils';
import { ODFStorageSystem } from '../../../models';
import { StorageSystemKind } from '../../../types';
import { CAPACITY_QUERIES, StorageDashboard } from '../queries';
import { humanizeBinaryBytes } from '../../../humanize';
import * as _ from 'lodash';

const storageSystemResource: WatchK8sResource = {
  kind: referenceForModel(ODFStorageSystem),
  namespace: 'openshift-storage',
  isList: true,
};

const getMetricForSystem = (
  metric: PrometheusResponse,
  system: StorageSystemKind
) =>
  metric?.data?.result?.find(
    (value) => value.metric.managedBy === system.spec.name
  );

const SystemCapacityCard: React.FC = () => {
  const [systems, systemsLoaded, systemsLoadError] = useK8sWatchResource<
    StorageSystemKind[]
  >(storageSystemResource);

  const [usedCapacity, errorUsedCapacity, loadingUsedCapacity] =
    usePrometheusPoll({
      query: CAPACITY_QUERIES[StorageDashboard.USED_CAPACITY_FILE_BLOCK],
      endpoint: 'api/v1/query' as any,
    });

  const [totalCapacity, errorTotalCapacity, loadingTotalCapacity] =
    usePrometheusPoll({
      query: CAPACITY_QUERIES[StorageDashboard.TOTAL_CAP_FILE_BLOCK],
      endpoint: 'api/v1/query' as any,
    });

  const data =
    systemsLoaded && !loadingUsedCapacity && !loadingTotalCapacity
      ? systems.map<CapacityMetricDatum>((system) => {
          const { kind, apiGroup, apiVersion } = getGVK(system.spec.kind);
          const usedMetric = getMetricForSystem(usedCapacity, system);
          const totalMetric = getMetricForSystem(totalCapacity, system);
          const datum = {
            name: system.metadata.name,
            managedSystemName: system.spec.name,
            managedSystemKind: referenceFor(apiGroup)(apiVersion)(kind),
            usedValue: humanizeBinaryBytes(usedMetric?.value?.[1]),
            totalValue: humanizeBinaryBytes(totalMetric?.value?.[1]),
          };
          return datum;
        })
      : [];
  const error =
    !_.isEmpty(systemsLoadError) ||
    !_.isEmpty(errorTotalCapacity) ||
    !_.isEmpty(errorUsedCapacity);
  const isLoading =
    loadingUsedCapacity && loadingTotalCapacity && !systemsLoaded;
  return (
    <DashboardCard>
      <DashboardCardHeader>
        <DashboardCardTitle>System Capacity</DashboardCardTitle>
      </DashboardCardHeader>
      <DashboardCardBody>
        {!error ? (
          <CapacityCard data={data} isPercentage loading={isLoading} />
        ) : (
          <>No data available</>
        )}
      </DashboardCardBody>
    </DashboardCard>
  );
};

export default SystemCapacityCard;
