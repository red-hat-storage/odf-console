import * as React from 'react';
import LineGraph, {
  LineGraphProps,
} from '@odf/shared/dashboards/line-graph/line-graph';
import { DataUnavailableError } from '@odf/shared/generic/Error';
import {
  useCustomPrometheusPoll,
  usePrometheusBasePath,
} from '@odf/shared/hooks/custom-prometheus-poll';
import { ODFStorageSystem } from '@odf/shared/models';
import ResourceLink from '@odf/shared/resource-link/resource-link';
import Table, { Column } from '@odf/shared/table/table';
import { StorageSystemKind } from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  getDashboardLink,
  getGVK,
  referenceFor,
  referenceForModel,
} from '@odf/shared/utils';
import { WatchK8sResource } from '@openshift-console/dynamic-plugin-sdk';
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';
import {
  UtilizationDurationDropdown,
  useUtilizationDuration,
} from '@openshift-console/dynamic-plugin-sdk-internal';
import * as _ from 'lodash-es';
import {
  Card,
  CardHeader,
  CardTitle,
  Flex,
  FlexItem,
} from '@patternfly/react-core';
import { SortByDirection } from '@patternfly/react-table';
import { StorageDashboard, UTILIZATION_QUERY } from '../queries';
import './performance-card.scss';
import { generateDataFrames } from './utils';

type RowProps = {
  systemName: string;
  managedSystemKind: string;
  managedSystemName: string;
  currentLocation: string;
  iopsData: LineGraphProps;
  throughputData: LineGraphProps;
  latencyData: LineGraphProps;
  className?: string;
};

type GetRow = (
  args: RowProps
) => [React.ReactNode, React.ReactNode, React.ReactNode, React.ReactNode];

const getRow: GetRow = ({
  managedSystemKind,
  systemName,
  iopsData,
  throughputData,
  latencyData,
}) => {
  const { apiGroup, apiVersion, kind } = getGVK(managedSystemKind);
  const refKind = referenceFor(apiGroup)(apiVersion)(kind);
  return [
    <ResourceLink
      key={systemName}
      link={getDashboardLink(refKind, systemName)}
      resourceModel={ODFStorageSystem}
      resourceName={systemName}
    />,
    <LineGraph key={`${systemName}_IOPS`} {...iopsData} />,

    <LineGraph key={`${systemName}_LAT`} {...latencyData} />,

    <LineGraph key={`${systemName}_THR`} {...throughputData} />,
  ];
};

const storageSystemResource: WatchK8sResource = {
  kind: referenceForModel(ODFStorageSystem),
  namespace: 'openshift-storage',
  isList: true,
};

const nameSort = (a: RowProps, b: RowProps, c: SortByDirection) => {
  const negation = c !== SortByDirection.asc;
  const sortVal = a.systemName.localeCompare(b.systemName);
  return negation ? -sortVal : sortVal;
};

const metricsSort =
  (metric: 'iopsData' | 'throughputData' | 'latencyData') =>
  (a: RowProps, b: RowProps, c: SortByDirection) => {
    const negation = c !== SortByDirection.asc;
    const dataA = a[metric]?.data;
    const dataB = b[metric]?.data;
    const sortVal =
      dataA?.[dataA.length - 1]?.y?.value -
        dataB?.[dataB.length - 1]?.y?.value || 0;
    return negation ? -sortVal : sortVal;
  };

const PerformanceCard: React.FC = () => {
  const { t } = useCustomTranslation();
  const headerColumns: Column[] = [
    {
      columnName: t('Name'),
      className: 'pf-u-w-10 performanceCard--verticalAlign',
      sortFunction: nameSort,
    },
    {
      columnName: t('IOPS'),
      className: 'pf-u-w-30',
      sortFunction: metricsSort('iopsData'),
    },
    {
      columnName: t('Latency'),
      className: 'pf-u-w-30',
      sortFunction: metricsSort('latencyData'),
    },
    {
      columnName: t('Throughput'),
      className: 'pf-u-w-30',
      sortFunction: metricsSort('throughputData'),
    },
  ];

  const [systems, systemLoaded, systemLoadError] = useK8sWatchResource<
    StorageSystemKind[]
  >(storageSystemResource);
  const { duration } = useUtilizationDuration();
  const [latency, latencyError, latencyLoading] = useCustomPrometheusPoll({
    query: UTILIZATION_QUERY[StorageDashboard.LATENCY],
    endpoint: 'api/v1/query_range' as any,
    timespan: duration,
    basePath: usePrometheusBasePath(),
  });
  const [throughput, throughputError, throughputLoading] =
    useCustomPrometheusPoll({
      query: UTILIZATION_QUERY[StorageDashboard.THROUGHPUT],
      endpoint: 'api/v1/query_range' as any,
      timespan: duration,
      basePath: usePrometheusBasePath(),
    });
  const [iops, iopsError, iopsLoading] = useCustomPrometheusPoll({
    query: UTILIZATION_QUERY[StorageDashboard.IOPS],
    endpoint: 'api/v1/query_range' as any,
    timespan: duration,
    basePath: usePrometheusBasePath(),
  });

  const rawRows = generateDataFrames(systems, latency, throughput, iops);
  const loading =
    !systemLoaded || latencyLoading || throughputLoading || iopsLoading;
  const error =
    !!systemLoadError || !!throughputError || !!latencyError || !!iopsError;

  return (
    <Card>
      <CardHeader>
        <Flex
          justifyContent={{ default: 'justifyContentSpaceBetween' }}
          className="odf-performanceCard__header--width"
        >
          <FlexItem>
            <CardTitle>{t('Performance')}</CardTitle>
          </FlexItem>
          <FlexItem>
            <UtilizationDurationDropdown />
          </FlexItem>
        </Flex>
      </CardHeader>
      {!error && !loading && (
        <Table
          columns={headerColumns}
          rawData={rawRows as []}
          rowRenderer={getRow as any}
          ariaLabel={t('Performance Card')}
        />
      )}
      {loading && !error && <PerformanceCardLoading />}
      {(error || (!error && !loading && _.isEmpty(rawRows))) && (
        <div className="performanceCard--error">
          <DataUnavailableError />{' '}
        </div>
      )}
    </Card>
  );
};

export default PerformanceCard;

const PerformanceCardLoading: React.FC = () => (
  <div className="odf-performanceCardLoading-body">
    <div className="odf-performanceCardLoading-body__item">
      <div className="odf-performanceCardLoading-body-item__element odf-performanceCardLoading-body-item__element--header" />
      <div className="odf-performanceCardLoading-body-item__element odf-performanceCardLoading-body-item__element--header" />
      <div className="odf-performanceCardLoading-body-item__element odf-performanceCardLoading-body-item__element--header" />
      <div className="odf-performanceCardLoading-body-item__element odf-performanceCardLoading-body-item__element--header" />
    </div>
    <div className="odf-performanceCardLoading-body__item">
      <div className="odf-performanceCardLoading-body-item__element" />
      <div className="odf-performanceCardLoading-body-item__element" />
      <div className="odf-performanceCardLoading-body-item__element" />
      <div className="odf-performanceCardLoading-body-item__element" />
    </div>
    <div className="odf-performanceCardLoading-body__item">
      <div className="odf-performanceCardLoading-body-item__element" />
      <div className="odf-performanceCardLoading-body-item__element" />
      <div className="odf-performanceCardLoading-body-item__element" />
      <div className="odf-performanceCardLoading-body-item__element" />
    </div>
  </div>
);
