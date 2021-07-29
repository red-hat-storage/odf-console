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
import {
  PrometheusResponse,
  WatchK8sResource,
} from 'badhikar-dynamic-plugin-sdk';
import { useK8sWatchResource } from 'badhikar-dynamic-plugin-sdk/api';
import { ODFStorageSystem } from '../../../models';
import Table, { Column } from '../../common/table/table';
import { SortByDirection } from '@patternfly/react-table';
import ResourceLink from '../../common/resource-link/resource-link';
import {
  humanizeBinaryBytes,
  humanizeIOPS,
  humanizeLatency,
} from '../../../humanize';

type GridRowRendererProps = {
  systemName: string;
  managedSystemKind: string;
  managedSystemName: string;
  currentLocation: string;
  iopsData: LineGraphProps;
  throughputData: LineGraphProps;
  latencyData: LineGraphProps;
  className?: string;
};

type DataFrame = GridRowRendererProps[];

const getDatForSystem = (
  promData: PrometheusResponse,
  system: StorageSystemKind,
  humanizer: Function
) => {
  const systemName = system.spec.name;
  const relatedMetrics = promData?.data?.result?.find(
    (value) => value.metric.managedBy === systemName
  );
  return (
    relatedMetrics?.values?.map((value) => ({
      timestamp: new Date(value[0] * 1000),
      y: humanizer(value[1]),
    })) || []
  );
};

export const generateDataFrames = (
  systems: StorageSystemKind[],
  ld: PrometheusResponse,
  td: PrometheusResponse,
  id: PrometheusResponse
): DataFrame => {
  return systems.reduce((acc, curr) => {
    const frame: GridRowRendererProps = {
      managedSystemKind: curr.spec.kind,
      managedSystemName: curr.spec.name,
      systemName: curr.metadata.name,
      currentLocation: '/',
      iopsData: {
        data: getDatForSystem(id, curr, humanizeIOPS),
      },
      throughputData: {
        data: getDatForSystem(td, curr, humanizeBinaryBytes),
      },
      latencyData: {
        data: getDatForSystem(ld, curr, humanizeLatency),
      },
    };
    acc.push(frame);
    return acc;
  }, [] as GridRowRendererProps[]);
};
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

  const [systems, loaded] = useK8sWatchResource<StorageSystemKind[]>(
    storageSystemResource
  );
  const { duration } = useUtilizationDuration();
  const [ld] = usePrometheusPoll({
    query: UTILIZATION_QUERY[StorageDashboard.LATENCY],
    endpoint: 'api/v1/query_range' as any,
    timespan: duration,
  });
  const [td] = usePrometheusPoll({
    query: UTILIZATION_QUERY[StorageDashboard.THROUGHPUT],
    endpoint: 'api/v1/query_range' as any,
    timespan: duration,
  });
  const [id] = usePrometheusPoll({
    query: UTILIZATION_QUERY[StorageDashboard.IOPS],
    endpoint: 'api/v1/query_range' as any,
    timespan: duration,
  });

  const rawRows = generateDataFrames(systems, ld, td, id);
  const loading = !loaded || _.isEmpty(rawRows);
  return (
    <DashboardCard>
      <DashboardCardHeader>
        <DashboardCardTitle>Performance</DashboardCardTitle>
        <UtilizationDurationDropdown />
      </DashboardCardHeader>
      <Table
        columns={headerColumns}
        rawData={rawRows as []}
        rowRenderer={getRow as any}
        dataLoading={loading}
        ariaLabel="Performance Card"
      />
    </DashboardCard>
  );
};

type PerformanceCardProps = {
  currentLocation: string;
};

export default PerformanceCard;
