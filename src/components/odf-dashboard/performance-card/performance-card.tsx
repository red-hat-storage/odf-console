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

export const generateDataFrames = (
  systems: StorageSystemKind[],
  _ld: any,
  _td: any,
  _id: any
): DataFrame =>
  systems.reduce((acc, curr) => {
    const frame: GridRowRendererProps = {
      managedSystemKind: curr.spec.kind,
      managedSystemName: curr.spec.name,
      systemName: curr.metadata.name,
      currentLocation: '/',
      iopsData: {
        data: [
          {
            timestamp: new Date(),
            y: {
              value: 10,
              unit: '',
              string: '10',
            },
          },
          {
            timestamp: new Date(),
            y: {
              value: 20,
              unit: '',
              string: '20',
            },
          },
          {
            timestamp: new Date(),
            y: {
              value: 30,
              unit: '',
              string: '30',
            },
          },
        ],
      },
      throughputData: {
        data: [
          {
            timestamp: new Date(),
            y: {
              value: 10,
              unit: '',
              string: '10',
            },
          },
          {
            timestamp: new Date(),
            y: {
              value: 20,
              unit: '',
              string: '20',
            },
          },
          {
            timestamp: new Date(),
            y: {
              value: 30,
              unit: '',
              string: '30',
            },
          },
        ],
      },
      latencyData: {
        data: [
          {
            timestamp: new Date(),
            y: {
              value: 10,
              unit: '',
              string: '10',
            },
          },
          {
            timestamp: new Date(),
            y: {
              value: 20,
              unit: '',
              string: '20',
            },
          },
          {
            timestamp: new Date(),
            y: {
              value: 30,
              unit: '',
              string: '30',
            },
          },
        ],
      },
    };
    acc.push(frame);
    return acc;
  }, [] as GridRowRendererProps[]);

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
        dataLoading={!loaded}
        ariaLabel="Performance Card"
      />
    </DashboardCard>
  );
};

type PerformanceCardProps = {
  currentLocation: string;
};

export default PerformanceCard;
