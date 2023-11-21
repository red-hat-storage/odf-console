import { LineGraphProps } from '@odf/shared/dashboards/line-graph/line-graph';
import { StorageSystemKind } from '@odf/shared/types';
import {
  humanizeIOPS,
  humanizeLatency,
  humanizeDecimalBytesPerSec,
} from '@odf/shared/utils/humanize';
import { PrometheusResponse } from '@openshift-console/dynamic-plugin-sdk';
import * as _ from 'lodash-es';

type DataFrame = {
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
const getDatForSystem = (
  promData: PrometheusResponse,
  system: StorageSystemKind,
  humanizer: Function
) => {
  const systemName = system.spec.name;
  // ToDo (epic 4422): This equality check should work (for now) as "managedBy" will be unique,
  // but moving forward add a label to metric for StorageSystem namespace as well and use that instead (update query as well).
  // Equality check should be updated as well with "&&" condition on StorageSystem namespace.
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
  id: PrometheusResponse,
  width?: number
): DataFrame[] => {
  if (_.isEmpty(systems) || !ld || !td || !id) {
    return [] as DataFrame[];
  }
  return systems.reduce<DataFrame[]>((acc, curr) => {
    const frame: DataFrame = {
      managedSystemKind: curr.spec.kind,
      managedSystemName: curr.spec.name,
      systemName: curr.metadata.name,
      systemNamespace: curr.metadata.namespace,
      currentLocation: '/',
      iopsData: {
        data: getDatForSystem(id, curr, humanizeIOPS),
      },
      throughputData: {
        data: getDatForSystem(td, curr, humanizeDecimalBytesPerSec),
      },
      latencyData: {
        data: getDatForSystem(ld, curr, humanizeLatency),
      },
      ...(width && { width }),
    };
    acc.push(frame);
    return acc;
  }, []);
};
