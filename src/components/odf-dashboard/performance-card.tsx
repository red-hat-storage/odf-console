import * as React from 'react';
import { Grid, GridItem, Title } from '@patternfly/react-core';
import {
  useK8sWatchResource,
  WatchK8sResource,
} from 'badhikar-dynamic-plugin-sdk/api';
import {
  DashboardCard,
  DashboardCardBody,
  DashboardCardHeader,
  DashboardCardTitle,
  usePrometheusPoll,
  useUtilizationDuration,
  UtilizationDurationDropdown,
} from 'badhikar-dynamic-plugin-sdk/internalAPI';
import { Link } from 'react-router-dom';
import * as _ from 'lodash';
import { StorageDashboard, UTILIZATION_QUERY } from './queries';
import LineGraph, { LineGraphProps } from '../common/line-graph/line-graph';
import './performance-card.scss';
import { ODFStorageSystem } from '../../models';
import { StorageSystemKind } from '../../types';
import { referenceForModel } from '../utils';
import { DataUnavailableError } from '../common/generic/Error';

const storageSystemResource: WatchK8sResource = {
  kind: referenceForModel(ODFStorageSystem),
  namespace: 'openshift-storage',
  isList: true,
};

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

const GridRowRenderer: React.FC<GridRowRendererProps> = ({
  managedSystemKind,
  managedSystemName,
  systemName,
  currentLocation,
  iopsData,
  throughputData,
  latencyData,
  className,
}) => (
  <>
    <GridItem span={3} className={className}>
      <Link
        to={{
          pathname: `/odf/system/${managedSystemKind}/${managedSystemName}`,
          state: { prevLocation: currentLocation },
        }}
      >
        {systemName}
      </Link>
    </GridItem>
    <GridItem className={className} span={3}>
      <LineGraph {...iopsData} />
    </GridItem>
    <GridItem className={className} span={3}>
      <LineGraph {...latencyData} />
    </GridItem>
    <GridItem className={className} span={3}>
      <LineGraph {...throughputData} />
    </GridItem>
  </>
);

const PerformanceHeader: React.FC<{ className?: string }> = ({ className }) => (
  <>
    <GridItem className={className} span={3}>
      <Title headingLevel="h5" size="md">
        System
      </Title>
    </GridItem>
    <GridItem className={className} span={3}>
      <Title headingLevel="h5" size="md">
        IOPS
      </Title>
    </GridItem>
    <GridItem className={className} span={3}>
      <Title headingLevel="h5" size="md">
        Latency
      </Title>
    </GridItem>
    <GridItem className={className} span={3}>
      <Title headingLevel="h5" size="md">
        Throughput
      </Title>
    </GridItem>
  </>
);

type DataFrame = GridRowRendererProps[];

const generateDataFrames = (
  systems: StorageSystemKind[],
  _ld: any[],
  _td: any[],
  _id: any[]
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
  }, []);

type PerformanceCardInternalProps = {
  systems: StorageSystemKind[];
};

const PerformanceCardInternal: React.FC<PerformanceCardInternalProps> = ({
  systems,
}) => {
  if (_.isEmpty(systems) || systems === undefined) {
    return (
      <div className="performanceCard--error">
        <DataUnavailableError />;
      </div>
    );
  }

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

  const data = generateDataFrames(systems, ld as any, td as any, id as any);

  return (
    <Grid>
      <PerformanceHeader className="performanceCard__header" />
      <GridItem span={12} className="performanceCard__border" />
      {data.map((datum) => (
        <>
          <GridRowRenderer {...datum} className="performanceCard__row" />
          <GridItem span={12} className="performanceCard__border" />
        </>
      ))}
    </Grid>
  );
};

const PerformanceCard: React.FC<PerformanceCardProps> = (props) => {
  const [systems, loaded] = useK8sWatchResource<StorageSystemKind[]>(
    storageSystemResource
  );
  return (
    <DashboardCard>
      <DashboardCardHeader>
        <DashboardCardTitle>Performance</DashboardCardTitle>
        <UtilizationDurationDropdown />
      </DashboardCardHeader>
      <DashboardCardBody isLoading={!loaded}>
        <PerformanceCardInternal systems={systems} />
      </DashboardCardBody>
    </DashboardCard>
  );
};

type PerformanceCardProps = {
  currentLocation: string;
};

export default PerformanceCard;
