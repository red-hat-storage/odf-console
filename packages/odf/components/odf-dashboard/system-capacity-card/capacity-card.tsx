import * as React from 'react';
import CapacityCard, {
  CapacityMetricDatum,
} from '@odf/shared/dashboards/capacity-card/capacity-card';
import { FieldLevelHelp } from '@odf/shared/generic';
import {
  useCustomPrometheusPoll,
  usePrometheusBasePath,
} from '@odf/shared/hooks/custom-prometheus-poll';
import { useWatchStorageSystems } from '@odf/shared/hooks/useWatchStorageSystems';
import { ODFStorageSystem } from '@odf/shared/models';
import { StorageSystemKind } from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { getGVK, humanizeBinaryBytes, referenceFor } from '@odf/shared/utils';
import { PrometheusResponse } from '@openshift-console/dynamic-plugin-sdk';
import * as _ from 'lodash-es';
import { Card, CardBody, CardHeader, CardTitle } from '@patternfly/react-core';
import { storageCapacityTooltip } from '../../../constants';
import { StorageDashboard, CAPACITY_QUERIES } from '../queries';

const getMetricForSystem = (
  metric: PrometheusResponse,
  system: StorageSystemKind
) =>
  // ToDo (epic 4422): This equality check should work (for now) as "managedBy" will be unique,
  // but moving forward add a label to metric for StorageSystem namespace as well and use that,
  // equality check should be updated with "&&" condition on StorageSystem namespace.
  metric?.data?.result?.find(
    (value) => value.metric.managedBy === system.spec.name
  );

const SystemCapacityCard: React.FC = () => {
  const { t } = useCustomTranslation();
  const [systems, systemsLoaded, systemsLoadError] = useWatchStorageSystems();
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
    systemsLoaded &&
    !loadingUsedCapacity &&
    !loadingTotalCapacity &&
    systems.length > 0
      ? systems.map<CapacityMetricDatum>((system) => {
          const { kind, apiGroup, apiVersion } = getGVK(system.spec.kind);
          const usedMetric = getMetricForSystem(usedCapacity, system);
          const totalMetric = getMetricForSystem(totalCapacity, system);
          const datum = {
            name: system.metadata.name,
            namespace: system.metadata.namespace,
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

  // We need to filter storagesystems for which the raw capacity metrics are not applicable (ex: MCG standalone).
  // https://bugzilla.redhat.com/show_bug.cgi?id=2185042
  const filteredData = data.filter((system) => !!system?.totalValue);
  const error =
    !_.isEmpty(systemsLoadError) ||
    !_.isEmpty(errorTotalCapacity) ||
    !_.isEmpty(errorUsedCapacity);
  const isLoading =
    loadingUsedCapacity && loadingTotalCapacity && !systemsLoaded;

  return (
    <Card className="odf-capacityCard--height">
      <CardHeader>
        <CardTitle>
          {t('System raw capacity')}
          <FieldLevelHelp>{storageCapacityTooltip(t)}</FieldLevelHelp>
        </CardTitle>
      </CardHeader>
      <CardBody>
        {!error ? (
          <CapacityCard
            data={filteredData}
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
