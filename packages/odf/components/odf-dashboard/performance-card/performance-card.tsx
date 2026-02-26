import * as React from 'react';
import LineGraph, {
  LineGraphProps,
} from '@odf/shared/dashboards/line-graph/line-graph';
import { DataUnavailableError } from '@odf/shared/generic/Error';
import {
  useCustomPrometheusPoll,
  usePrometheusBasePath,
} from '@odf/shared/hooks/custom-prometheus-poll';
import useRefWidth from '@odf/shared/hooks/ref-width';
import { useWatchStorageSystems } from '@odf/shared/hooks/useWatchStorageSystems';
import { ODFStorageSystem } from '@odf/shared/models';
import ResourceLink from '@odf/shared/resource-link/resource-link';
import Table, { Column } from '@odf/shared/table/table';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { getDashboardLink, getGVK, referenceFor } from '@odf/shared/utils';
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
  systemNamespace: string;
  managedSystemKind: string;
  managedSystemName: string;
  currentLocation: string;
  iopsData: LineGraphProps;
  throughputData: LineGraphProps;
  latencyData: LineGraphProps;
  className?: string;
  width?: number;
};

type GetRow = (
  args: RowProps
) => [React.ReactNode, React.ReactNode, React.ReactNode, React.ReactNode];

const getRow: GetRow = ({
  managedSystemKind,
  systemName,
  systemNamespace,
  iopsData,
  throughputData,
  latencyData,
  width,
}) => {
  const { apiGroup, apiVersion, kind } = getGVK(managedSystemKind);
  const refKind = referenceFor(apiGroup)(apiVersion)(kind);
  return [
    <ResourceLink
      key={systemName}
      link={getDashboardLink(refKind, systemName, systemNamespace)}
      resourceModel={ODFStorageSystem}
      resourceName={systemName}
    />,

    <LineGraph
      key={`${systemName}_IOPS`}
      {...iopsData}
      width={width}
      divideBy={3}
    />,

    <LineGraph
      key={`${systemName}_LAT`}
      {...latencyData}
      width={width}
      divideBy={3}
    />,

    <LineGraph
      key={`${systemName}_THR`}
      {...throughputData}
      width={width}
      divideBy={3}
    />,
  ];
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

  const [ref, width] = useRefWidth();

  const headerColumns: Column[] = React.useMemo(
    () => [
      {
        columnName: t('Name'),
        className: 'pf-v6-u-w-10 performanceCard--verticalAlign',
        sortFunction: nameSort,
      },
      {
        columnName: t('IOPS'),
        className: 'pf-v6-u-w-30',
        sortFunction: metricsSort('iopsData'),
      },
      {
        columnName: t('Latency'),
        className: 'pf-v6-u-w-30',
        sortFunction: metricsSort('latencyData'),
      },
      {
        columnName: t('Throughput'),
        className: 'pf-v6-u-w-30',
        sortFunction: metricsSort('throughputData'),
      },
    ],
    [t]
  );

  const [systems, systemLoaded, systemLoadError] = useWatchStorageSystems();
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

  const rawRows = generateDataFrames(systems, latency, throughput, iops, width);

  const loading =
    !systemLoaded || latencyLoading || throughputLoading || iopsLoading;
  const error =
    !!systemLoadError || !!throughputError || !!latencyError || !!iopsError;

  return (
    <Card>
      <div ref={ref}>
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
      </div>
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
