import * as React from 'react';
import { referenceForModel, resourcePathFromModel } from '@odf/shared/utils';
import { K8sKind } from '@openshift-console/dynamic-plugin-sdk/lib/api/common-types';
import {
  Chart,
  ChartAxis,
  ChartBar,
  ChartLabel,
  ChartLegend,
  ChartStack,
  ChartThemeColor,
  ChartTooltip,
} from '@patternfly/react-charts/victory';
import { Link } from 'react-router-dom-v5-compat';
import { Tooltip } from '@patternfly/react-core';
import { BUCKETCLASSKIND, CLUSTERWIDE, OTHER } from './consts';
import { getBarRadius, StackDataPoint } from './utils';
import './breakdown-card.scss';

export const LinkableLegend: React.FC<LinkableLegendProps> = React.memo(
  (props: LinkableLegendProps) => {
    const legendRef = React.useRef();

    const { metricModel, datum, ocsVersion, odfNamespace } = props;
    let href: string = metricModel
      ? resourcePathFromModel(metricModel, datum.link, datum.ns)
      : '';

    /**
     * "legendComponent" prop of "Chart" does not work if passed element is wrapped around a "div",
     * Ref: https://developer.mozilla.org/en-US/docs/Web/SVG/Element/g#usage_notes.
     * "Tooltip" is automatically wrapping its children around a "div" in PF5.
     * Using "triggerRef" instead, as a workaround.
     */
    const customLegend = (
      <>
        <Tooltip content={datum.link} triggerRef={legendRef} />
        <g ref={legendRef}>
          <ChartLabel
            {...props}
            lineHeight={1.2}
            style={[
              { ...datum.labels, fontSize: 9 },
              { fill: `var(--pf-v5-global--Color--200)`, fontSize: 8 },
            ]}
          />
        </g>
      </>
    );
    if (
      datum.labelId === OTHER ||
      datum.labelId === CLUSTERWIDE ||
      !metricModel
    ) {
      return customLegend;
    }
    if (metricModel.kind === BUCKETCLASSKIND) {
      if (ocsVersion && odfNamespace) {
        href = `/k8s/ns/${odfNamespace}/clusterserviceversions/${ocsVersion}/${referenceForModel(
          metricModel
        )}/${datum.link}`;
      } else {
        return customLegend;
      }
    }
    return (
      <Link to={href} className="capacity-breakdown-card__legend-link">
        {customLegend}
      </Link>
    );
  }
);

LinkableLegend.displayName = 'LinkableLegend';

export const BreakdownChart: React.FC<BreakdownChartProps> = ({
  data,
  legends,
  metricModel,
  ocsVersion,
  labelPadding,
  odfNamespace,
}) => (
  <Chart
    legendPosition="bottom-left"
    legendComponent={
      <ChartLegend
        themeColor={ChartThemeColor.multiOrdered}
        data={legends}
        y={40}
        labelComponent={
          <LinkableLegend
            metricModel={metricModel}
            ocsVersion={ocsVersion}
            odfNamespace={odfNamespace}
          />
        }
        orientation="horizontal"
        symbolSpacer={7}
        gutter={10}
        style={{
          labels: Object.assign(
            { fontSize: 10 },
            labelPadding
              ? {
                  paddingRight: labelPadding.right,
                  paddingTop: labelPadding.top,
                  paddingBottom: labelPadding.bottom,
                  paddingLeft: labelPadding.left,
                }
              : {}
          ),
        }}
      />
    }
    height={60}
    padding={{
      bottom: 35,
      top: 0,
      right: 0,
      left: 0,
    }}
  >
    <ChartAxis
      style={{ axis: { stroke: 'none' }, ticks: { stroke: 'none' } }}
      tickFormat={() => ''}
    />
    <ChartStack horizontal>
      {data.map((d: StackDataPoint, index) => (
        <ChartBar
          key={d.id}
          style={{
            data: { stroke: 'white', strokeWidth: 0.7, fill: d.fill },
          }}
          cornerRadius={getBarRadius(index, data.length)}
          barWidth={12}
          padding={0}
          data={[d]}
          labelComponent={
            <ChartTooltip
              style={{ fontSize: 8, padding: 5 }}
              constrainToVisibleArea
            />
          }
        />
      ))}
    </ChartStack>
  </Chart>
);

export type BreakdownChartProps = {
  data: StackDataPoint[];
  legends: any[];
  metricModel: K8sKind;
  ocsVersion?: string;
  labelPadding?: LabelPadding;
  odfNamespace?: string;
};

export type LabelPadding = {
  left: number;
  right: number;
  bottom: number;
  top: number;
};

export type LinkableLegendProps = {
  metricModel: K8sKind;
  datum?: {
    [key: string]: any;
  };
  ocsVersion?: string;
  odfNamespace?: string;
};
