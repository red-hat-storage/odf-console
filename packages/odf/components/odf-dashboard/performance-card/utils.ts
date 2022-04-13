import { LineGraphProps } from "@odf/shared/dashboards/line-graph/line-graph";
import { StorageSystemKind } from '@odf/shared/types';
import { humanizeIOPS, humanizeLatency, humanizeDecimalBytesPerSec } from "@odf/shared/utils/humanize";
import { PrometheusResponse } from "@openshift-console/dynamic-plugin-sdk";
import * as _ from "lodash";


type DataFrame = {
    systemName: string;
    managedSystemKind: string;
    managedSystemName: string;
    currentLocation: string;
    iopsData: LineGraphProps;
    throughputData: LineGraphProps;
    latencyData: LineGraphProps;
    className?: string;
};
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
): DataFrame[] => {
    if (_.isEmpty(systems) || !ld || !td || !id) {
        return [] as DataFrame[];
    }
    return systems.reduce<DataFrame[]>((acc, curr) => {
        const frame: DataFrame = {
            managedSystemKind: curr.spec.kind,
            managedSystemName: curr.spec.name,
            systemName: curr.metadata.name,
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
        };
        acc.push(frame);
        return acc;
    }, []);
};
