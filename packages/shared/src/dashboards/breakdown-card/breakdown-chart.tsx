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
import { Link } from 'react-router';
import { getResizeObserver, Tooltip } from '@patternfly/react-core';
import {
  chart_bar_Width as chartBarWidth,
  chart_bar_data_Padding as chartBarDataPadding,
  chart_bar_data_stroke as chartBarDataStroke,
  chart_global_label_Margin as chartGlobalLabelMargin,
  chart_global_label_Padding as chartGlobalLabelPadding,
  chart_global_layout_Width as chartGlobalLayoutWidth,
  chart_global_stroke_Width_xs as chartGlobalStrokeWidthXs,
  chart_legend_gutter_Width as chartLegendGutterWidth,
  chart_legend_Margin as chartLegendMargin,
  chart_legend_title_Padding as chartLegendTitlePadding,
  chart_tooltip_Padding as chartTooltipPadding,
} from '@patternfly/react-tokens';
import { BUCKETCLASSKIND, CLUSTERWIDE, OTHER } from './consts';
import { getBarRadius, StackDataPoint } from './utils';
import './breakdown-card.scss';

const legendNameFontSize = Number(chartGlobalLabelPadding.value);
const legendCapacityFontSize = Number(chartGlobalLabelMargin.value);
const legendLabelPadding = legendNameFontSize;
const legendLineHeight = 1.2;
const legendItemGutter = Number(chartLegendGutterWidth.value);
const legendMargin = Number(chartLegendMargin.value);
const legendTitlePadding = Number(chartLegendTitlePadding.value);
const tokenUnit = legendTitlePadding / legendTitlePadding;
const stackBarWidth =
  Number(chartBarWidth.value) +
  Number(chartBarDataPadding.value) -
  legendCapacityFontSize +
  legendTitlePadding;
const symbolSpacer =
  legendLabelPadding - legendTitlePadding - legendTitlePadding + tokenUnit;
const chartBottomPadding =
  legendMargin +
  legendLabelPadding +
  legendCapacityFontSize +
  legendTitlePadding -
  legendTitlePadding +
  tokenUnit;
const plotHeight =
  legendMargin +
  stackBarWidth -
  legendTitlePadding -
  legendTitlePadding +
  tokenUnit;
const baseChartHeight = chartBottomPadding + plotHeight;
const legendY =
  legendMargin + stackBarWidth + legendLabelPadding + legendTitlePadding;
const defaultChartWidth = Number(chartGlobalLayoutWidth.value);
const barStrokeWidth = Number(chartGlobalStrokeWidthXs.value);
const twoLineLegendHeight =
  legendNameFontSize * legendLineHeight +
  legendCapacityFontSize * legendLineHeight;
const legendRowGutter = { top: 0, bottom: legendLabelPadding };
const legendWrapBuffer = twoLineLegendHeight + legendRowGutter.bottom;

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
            lineHeight={legendLineHeight}
            style={[
              { ...datum.labels, fontSize: legendNameFontSize },
              {
                fill: 'var(--pf-t--global--text--color--subtle)',
                fontSize: legendCapacityFontSize,
              },
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
}) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [width, setWidth] = React.useState(defaultChartWidth);
  const [extraHeight, setExtraHeight] = React.useState(legendWrapBuffer);

  React.useEffect(() => {
    const handleResize = () => {
      if (containerRef.current?.clientWidth) {
        setWidth(containerRef.current.clientWidth);
      }
    };
    const observer = getResizeObserver(containerRef.current, handleResize);
    handleResize();

    return () => {
      observer?.();
    };
  }, []);

  const onLegendWrap = React.useCallback((wrapHeight: number) => {
    const adjustedHeight = wrapHeight + legendWrapBuffer;
    setExtraHeight((current) =>
      current === adjustedHeight ? current : adjustedHeight
    );
  }, []);

  const chartHeight = baseChartHeight + extraHeight;

  return (
    <div ref={containerRef} className="capacity-breakdown-card__chart">
      <Chart
        legendAllowWrap={onLegendWrap}
        legendPosition="bottom-left"
        width={width}
        height={chartHeight}
        legendComponent={
          <ChartLegend
            themeColor={ChartThemeColor.multiOrdered}
            data={legends}
            y={legendY}
            labelComponent={
              <LinkableLegend
                metricModel={metricModel}
                ocsVersion={ocsVersion}
                odfNamespace={odfNamespace}
              />
            }
            orientation="horizontal"
            symbolSpacer={symbolSpacer}
            gutter={legendItemGutter}
            rowGutter={legendRowGutter}
            style={{
              labels: Object.assign(
                { fontSize: legendNameFontSize },
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
        padding={{
          bottom: chartBottomPadding + extraHeight,
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
              barWidth={stackBarWidth}
              style={{
                data: {
                  stroke: chartBarDataStroke.var,
                  strokeWidth: barStrokeWidth,
                  fill: d.fill,
                },
              }}
              cornerRadius={getBarRadius(index, data.length)}
              padding={0}
              data={[d]}
              labelComponent={
                <ChartTooltip
                  style={{
                    fontSize: legendCapacityFontSize,
                    padding: chartTooltipPadding.value,
                  }}
                  constrainToVisibleArea
                />
              }
            />
          ))}
        </ChartStack>
      </Chart>
    </div>
  );
};

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
