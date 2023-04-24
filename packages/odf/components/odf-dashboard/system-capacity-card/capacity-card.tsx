import * as React from 'react';
import CapacityCard, {
  CapacityMetricDatum,
} from '@odf/shared/dashboards/capacity-card/capacity-card';
import { FieldLevelHelp } from '@odf/shared/generic/FieldLevelHelp';
import {
  useCustomPrometheusPoll,
  usePrometheusBasePath,
} from '@odf/shared/hooks/custom-prometheus-poll';
import { ODFStorageSystem } from '@odf/shared/models';
import { StorageSystemKind } from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
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
import * as _ from 'lodash-es';
import { Card, CardBody, CardHeader, CardTitle } from '@patternfly/react-core';
import { storageCapacityTooltip } from '../../../constants';
import { StorageDashboard, CAPACITY_QUERIES } from '../queries';

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
  const { t } = useCustomTranslation();
  const [systems, systemsLoaded, systemsLoadError] = useK8sWatchResource<
    StorageSystemKind[]
  >(storageSystemResource);

  const [usedCapacity, errorUsedCapacity, loadingUsedCapacity] =
    useCustomPrometheusPoll({
      query: CAPACITY_QUERIES[StorageDashboard.USED_CAPACITY_FILE_BLOCK],
      endpoint: 'api/v1/query' as any,
      basePath: usePrometheusBasePath(),
    });

  const [totalCapacity, errorTotalCapacity, loadingTotalCapacity] =
    useCustomPrometheusPoll({
      query: CAPACITY_QUERIES[StorageDashboard.TOTAL_CAPACITY_FILE_BLOCK],
      endpoint: 'api/v1/query' as any,
      basePath: usePrometheusBasePath(),
    });

  const data =
    systemsLoaded && !loadingUsedCapacity && !loadingTotalCapacity
      ? systems
          .map<CapacityMetricDatum>((system) => {
            const { kind, apiGroup, apiVersion } = getGVK(system.spec.kind);
            const usedMetric = getMetricForSystem(usedCapacity, system);
            const totalMetric = getMetricForSystem(totalCapacity, system);

            // Check if totalValue is empty, undefined, or not found
            if (!totalMetric?.value?.[1]) {
              return null;
            }
            const datum = {
              name: system.metadata.name,
              managedSystemName: system.spec.name,
              managedSystemKind: referenceFor(apiGroup)(apiVersion)(kind),
              usedValue: usedMetric
                ? humanizeBinaryBytes(usedMetric?.value?.[1])
                : undefined,
              totalValue: humanizeBinaryBytes(totalMetric?.value?.[1]),
            };
            return datum;
          })
          .filter((item) => item !== null) // Remove null values from the array
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
        <CardTitle>{t('System raw capacity')}</CardTitle>
        <FieldLevelHelp>{storageCapacityTooltip(t)}</FieldLevelHelp>
      </CardHeader>
      <CardBody>
        {!error ? (
          <CapacityCard
            data={data}
            loading={isLoading}
            resourceModel={ODFStorageSystem}
            showPercentage={true}
            hideVarient={true}
          />
        ) : (
          <>{t('No data available')}</>
        )}
      </CardBody>
    </Card>
  );
};

export default SystemCapacityCard;
