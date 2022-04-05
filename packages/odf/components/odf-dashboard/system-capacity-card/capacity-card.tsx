import * as React from 'react';
import CapacityCard, {
  CapacityMetricDatum,
} from '@odf/shared/dashboards/capacity-card/capacity-card';
import {
  getGVK,
  humanizeBinaryBytes,
  referenceFor,
  referenceForModel,
} from '@odf/shared/utils';
import {
  PrometheusResponse,
  WatchK8sResource,
} from '@openshift-console/dynamic-plugin-sdk';
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';
import { usePrometheusPoll } from '@openshift-console/dynamic-plugin-sdk-internal';
import * as _ from 'lodash';
import { useTranslation } from 'react-i18next';
import { Card, CardBody, CardHeader, CardTitle } from '@patternfly/react-core';
import { ODFStorageSystem } from '../../../models';
import { StorageSystemKind } from '../../../types';
import { CAPACITY_QUERIES, StorageDashboard } from '../queries';

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
  const { t } = useTranslation('plugin__odf-console');
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
            usedValue: usedMetric
              ? humanizeBinaryBytes(usedMetric?.value?.[1])
              : undefined,
            totalValue: !!totalMetric?.value?.[1]
              ? humanizeBinaryBytes(totalMetric?.value?.[1])
              : undefined,
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
    <Card className="odf-capacityCard--height">
      <CardHeader>
        <CardTitle>{t('System Capacity')}</CardTitle>
      </CardHeader>
      <CardBody>
        {!error ? (
          <CapacityCard
            data={data}
            loading={isLoading}
            resourceModel={ODFStorageSystem}
          />
        ) : (
          <>{t('No data available')}</>
        )}
      </CardBody>
    </Card>
  );
};

export default SystemCapacityCard;
