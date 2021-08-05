import * as React from 'react';
import {
  DashboardCard,
  DashboardCardHeader,
  DashboardCardTitle,
  UtilizationDurationDropdown,
  usePrometheusPoll,
  useUtilizationDuration,
} from 'badhikar-dynamic-plugin-sdk/internalAPI';
import * as _ from 'lodash';
import { StorageDashboard, UTILIZATION_QUERY } from '../queries';
import LineGraph, { LineGraphProps } from '../../common/line-graph/line-graph';
import './performance-card.scss';
import { StorageSystemKind } from '../../../types';
import { referenceForModel } from '../../utils';
import { WatchK8sResource } from 'badhikar-dynamic-plugin-sdk';
import { useK8sWatchResource } from 'badhikar-dynamic-plugin-sdk/api';
import { ODFStorageSystem } from '../../../models';
import Table, { Column } from '../../common/table/table';
import { SortByDirection } from '@patternfly/react-table';
import ResourceLink from '../../common/resource-link/resource-link';
import { generateDataFrames } from './utils';
import { DataUnavailableError } from '../../common/generic/Error';

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
  managedSystemName,
  systemName,
  iopsData,
  throughputData,
  latencyData,
}) => {
  return [
    <ResourceLink
      key={systemName}
      link={`/odf/system/${managedSystemKind}/${managedSystemName}`}
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

const PerformanceCard: React.FC<PerformanceCardProps> = (props) => {
  const headerColumns: Column[] = [
    {
      columnName: 'Name',
      className: 'pf-u-w-10 performanceCard--verticalAlign',
      sortFunction: nameSort,
    },
    {
      columnName: 'IOPS',
      className: 'pf-u-w-30',
    },
    {
      columnName: 'Latency',
      className: 'pf-u-w-30',
    },
    {
      columnName: 'Throughput',
      className: 'pf-u-w-30',
    },
  ];

  const [systems, systemLoaded, systemLoadError] = useK8sWatchResource<
    StorageSystemKind[]
  >(storageSystemResource);
  const { duration } = useUtilizationDuration();
  const [latency, latencyError, latencyLoading] = usePrometheusPoll({
    query: UTILIZATION_QUERY[StorageDashboard.LATENCY],
    endpoint: 'api/v1/query_range' as any,
    timespan: duration,
  });
  const [throughput, throughputError, throughputLoading] = usePrometheusPoll({
    query: UTILIZATION_QUERY[StorageDashboard.THROUGHPUT],
    endpoint: 'api/v1/query_range' as any,
    timespan: duration,
  });
  const [iops, iopsError, iopsLoading] = usePrometheusPoll({
    query: UTILIZATION_QUERY[StorageDashboard.IOPS],
    endpoint: 'api/v1/query_range' as any,
    timespan: duration,
  });

  const rawRows = generateDataFrames(systems, latency, throughput, iops);
  const loading =
    !systemLoaded || latencyLoading || throughputLoading || iopsLoading;
  const error =
    !!systemLoadError || !!throughputError || !!latencyError || !!iopsError;

  return (
    <DashboardCard>
      <DashboardCardHeader>
        <DashboardCardTitle>Performance</DashboardCardTitle>
        <UtilizationDurationDropdown />
      </DashboardCardHeader>
      {!error && !loading && (
        <Table
          columns={headerColumns}
          rawData={rawRows as []}
          rowRenderer={getRow as any}
          dataLoading={loading}
          ariaLabel="Performance Card"
        />
      )}
      {loading && <PerformanceCardLoading />}
      {error && !loading && (
        <div className="odf-performanceCardError">
          <DataUnavailableError />{' '}
        </div>
      )}
    </DashboardCard>
  );
};

type PerformanceCardProps = {
  currentLocation: string;
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
