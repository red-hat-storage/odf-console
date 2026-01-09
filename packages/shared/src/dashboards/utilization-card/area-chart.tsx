import * as React from 'react';
import {
  ChartLegendTooltip,
  CursorVoronoiContainer,
  GraphEmpty,
  processFrame,
  PrometheusGraph,
  PrometheusGraphLink,
} from '@odf/shared/charts';
import { timeFormatter } from '@odf/shared/details-page/datetime';
import useRefWidth from '@odf/shared/hooks/ref-width';
import { DataPoint, humanizeNumber } from '@odf/shared/utils';
import { Humanize } from '@openshift-console/dynamic-plugin-sdk';
import { ByteDataTypes } from '@openshift-console/dynamic-plugin-sdk/lib/api/internal-types';
import i18n from 'i18next';
import { InterpolationPropType } from 'victory-core';
import {
  ChartVoronoiContainer,
  ChartGroup,
  ChartArea,
  ChartStack,
  ChartLine,
  ChartThemeColor,
  Chart,
  ChartAxis,
} from '@patternfly/react-charts';

export type ChartPaddingType = {
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
};

export type ChartDomainType = {
  x?: [number, number];
  y?: [number, number];
};

export type AxisStyleType = {
  axis?: object;
  tickLabels?: object;
  grid?: object;
};

const DEFAULT_PADDING: ChartPaddingType = {
  top: 20,
  left: 70,
  bottom: 60,
  right: 0,
};

export const AreaChart: React.FC<AreaChartProps> = ({
  data = [],
  formatDate = timeFormatter.format,
  humanize = humanizeNumber,
  loading = true,
  query,
  ariaChartLinkLabel,
  ariaChartTitle,
  xAxis = true,
  yAxis = true,
  chartStyle,
  byteDataType = '',
  mainDataName,
  chartType,
  tickCount = 4,
  height = 200,
  showLegend,
  legendComponent,
  domain,
  themeColor = ChartThemeColor.multiUnordered,
  padding = DEFAULT_PADDING,
  interpolation,
  xAxisStyle,
  yAxisStyle,
  disableGraphLink = false,
}) => {
  const [containerRef, width] = useRefWidth();

  const { processedData, unit } = React.useMemo(() => {
    const nonEmptyDataSets = data.filter((dataSet) => dataSet?.length);
    if (byteDataType) {
      return processFrame(nonEmptyDataSets, byteDataType);
    }
    return { processedData: nonEmptyDataSets, unit: '' };
  }, [byteDataType, data]);

  const xTickFormat = React.useCallback(
    (tick) => formatDate(tick),
    [formatDate]
  );
  const yTickFormat = React.useCallback(
    (tick) => `${humanize(tick, unit, unit).string}`,
    [humanize, unit]
  );

  const getLabel = React.useCallback(
    (prop: { datum: DataPoint<Date> }, includeDate = true) => {
      const { x, y } = prop.datum;
      const value = humanize(y, unit, unit).string;
      const date = formatDate(x);
      return includeDate
        ? i18n.t('{{value}} at {{date}}', { value, date })
        : value;
    },
    [humanize, unit, formatDate]
  );

  const legendData = processedData.map((d) => ({
    childName: d[0].description,
    name: d[0].description,
    symbol: d[0].symbol,
  }));

  const container = React.useMemo(() => {
    if (processedData?.length > 1 || showLegend) {
      return (
        <CursorVoronoiContainer
          activateData={false}
          cursorDimension="x"
          labels={(props) => getLabel(props, false)}
          mouseFollowTooltips
          labelComponent={
            <ChartLegendTooltip
              stack
              legendData={legendData}
              getLabel={getLabel}
              formatDate={(d) => formatDate(d[0].x)}
              mainDataName={mainDataName}
            />
          }
          voronoiDimension="x"
        />
      );
    }
    return (
      <ChartVoronoiContainer
        voronoiDimension="x"
        labels={getLabel}
        activateData={false}
      />
    );
  }, [
    formatDate,
    getLabel,
    legendData,
    showLegend,
    mainDataName,
    processedData,
  ]);

  let CustomChartGroup = ChartGroup;
  let CustomChartArea = ChartArea;

  if (chartType === 'stacked-area') {
    CustomChartGroup = ChartStack;
  }

  if (chartType === 'grouped-line') {
    CustomChartArea = ChartLine;
    CustomChartGroup = ChartGroup;
  }

  // Build domain props for Chart
  const domainProps = React.useMemo(() => {
    const props: { minDomain?: object; maxDomain?: object } = {};
    if (domain?.x || domain?.y) {
      if (domain.x) {
        props.minDomain = { ...props.minDomain, x: domain.x[0] };
        props.maxDomain = { ...props.maxDomain, x: domain.x[1] };
      }
      if (domain.y) {
        props.minDomain = { ...props.minDomain, y: domain.y[0] };
        props.maxDomain = { ...props.maxDomain, y: domain.y[1] };
      }
    }
    return props;
  }, [domain]);

  return (
    <PrometheusGraph ref={containerRef}>
      <PrometheusGraphLink
        query={disableGraphLink ? undefined : query}
        ariaChartLinkLabel={ariaChartLinkLabel}
      >
        {processedData?.length ? (
          <Chart
            ariaTitle={ariaChartTitle}
            containerComponent={container}
            domainPadding={{ y: 20 }}
            height={height}
            width={width}
            themeColor={themeColor}
            scale={{ x: 'time', y: 'linear' }}
            padding={padding}
            legendData={chartType && showLegend ? legendData : null}
            legendPosition="bottom-left"
            legendComponent={legendComponent}
            {...domainProps}
          >
            {xAxis && (
              <ChartAxis
                tickCount={tickCount}
                tickFormat={xTickFormat}
                style={xAxisStyle}
              />
            )}
            {yAxis && (
              <ChartAxis
                dependentAxis
                tickCount={tickCount}
                tickFormat={yTickFormat}
                style={yAxisStyle}
              />
            )}
            <CustomChartGroup height={height} width={width}>
              {processedData.map((datum, index) => (
                <CustomChartArea
                  // eslint-disable-next-line react/no-array-index-key
                  key={index}
                  data={datum}
                  style={chartStyle && chartStyle[index]}
                  name={datum[0]?.description}
                  interpolation={interpolation}
                />
              ))}
            </CustomChartGroup>
          </Chart>
        ) : (
          <GraphEmpty height={height} loading={loading} />
        )}
      </PrometheusGraphLink>
    </PrometheusGraph>
  );
};

export type AreaChartProps = {
  formatDate?: (date: Date, showSeconds?: boolean) => string;
  humanize?: Humanize;
  loading?: boolean;
  query?: string | string[];
  ariaChartLinkLabel?: string;
  ariaChartTitle?: string;
  data?: DataPoint[][];
  xAxis?: boolean;
  yAxis?: boolean;
  chartStyle?: object[];
  byteDataType?: ByteDataTypes; // Use this to process the whole data frame at once
  mainDataName?: string;
  chartType?: 'stacked-area' | 'grouped-line';
  tickCount?: number;
  height?: number;
  showLegend?: boolean;
  legendComponent?: React.ReactElement<any>;
  /** Fixed min/max domain for x and/or y axes */
  domain?: ChartDomainType;
  /** Chart color theme (default: multiUnordered) */
  themeColor?: (typeof ChartThemeColor)[keyof typeof ChartThemeColor];
  /** Chart padding (default: { top: 20, left: 70, bottom: 60, right: 0 }) */
  padding?: ChartPaddingType;
  /** Interpolation style for area/line (e.g., 'monotoneX', 'linear', 'step') */
  interpolation?: InterpolationPropType;
  /** Custom styling for x-axis */
  xAxisStyle?: AxisStyleType;
  /** Custom styling for y-axis */
  yAxisStyle?: AxisStyleType;
  /** Disable the Prometheus query browser link */
  disableGraphLink?: boolean;
};
