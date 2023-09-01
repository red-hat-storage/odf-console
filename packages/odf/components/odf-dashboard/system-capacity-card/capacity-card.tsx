import * as React from 'react';
import CapacityCard, {
  CapacityMetricDatum,
} from '@odf/shared/dashboards/capacity-card/capacity-card';
import { FieldLevelHelp } from '@odf/shared/generic';
import {
  useCustomPrometheusPoll,
  usePrometheusBasePath,
} from '@odf/shared/hooks/custom-prometheus-poll';
import { OCSStorageClusterModel, ODFStorageSystem } from '@odf/shared/models';
import { StorageClusterKind, StorageSystemKind } from '@odf/shared/types';
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

const storageClusterResource: WatchK8sResource = {
  kind: referenceForModel(OCSStorageClusterModel),
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

  const [storageClusters, storageClustersLoaded, storageClustersLoadError] =
    useK8sWatchResource<StorageClusterKind[]>(storageClusterResource);

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

  const isMCGCluster = (storageCluster: StorageClusterKind) => {
    return (
      storageCluster.spec?.multiCloudGateway?.reconcileStrategy === 'standalone'
    );
  };

  const isExternalCluster = (storageCluster: StorageClusterKind) => {
    return !_.isEmpty(storageCluster.spec?.externalStorage);
  };

  // We are filtering internal only storagesystems as the metrics are not applicable for MCG standalone and external only StorageSystems.
  // https://bugzilla.redhat.com/show_bug.cgi?id=2185042
  const internalOnlySystems: StorageSystemKind[] = systems.filter((sys) => {
    const storageCluster =
      storageClustersLoaded &&
      !storageClustersLoadError &&
      storageClusters.find((sc) => sc.metadata.name === sys.spec.name);
    if (
      !!storageCluster &&
      (isMCGCluster(storageCluster) || isExternalCluster(storageCluster))
    ) {
      return false;
    }
    return true;
  });

  const data =
    systemsLoaded &&
    !loadingUsedCapacity &&
    !loadingTotalCapacity &&
    internalOnlySystems.length > 0
      ? internalOnlySystems.map<CapacityMetricDatum>((system) => {
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
        <CardTitle>{t('System raw capacity')}</CardTitle>
        <FieldLevelHelp>{storageCapacityTooltip(t)}</FieldLevelHelp>
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
