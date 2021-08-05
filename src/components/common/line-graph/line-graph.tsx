import * as React from 'react';
import * as _ from 'lodash';
import {
  Chart,
  ChartAxis,
  ChartGroup,
  ChartLine,
  ChartVoronoiContainer,
} from '@patternfly/react-charts';
import { Title } from '@patternfly/react-core';
import useRefWidth from '../../../hooks/ref-width';
import { HumanizeResult } from '../../../types';
import './line-graph.scss';

type LineDataType = {
  y: HumanizeResult;
  timestamp: Date;
};

export type LineGraphProps = {
  data: LineDataType[];
  loading?: boolean;
  error?: string;
};

const LineGraph: React.FC<LineGraphProps> = ({ data }) => {
  const [ref, width] = useRefWidth();
  const lineData = data.map((datum, i) => ({
    x: String(i + 1),
    ...datum,
  }));
  const mappedLineData = lineData.map((datum) => ({
    ...datum,
    y: datum.y.value,
    yString: datum.y.string,
  }));

  const unit = lineData[0].y.unit;
  const latestValue = lineData[lineData.length - 1].y.string;
  return (
    <div className="odf-lineGraph">
      <div
        className="pf-u-display-none-on-md pf-u-display-inline-block-on-lg pf-u-w-95-lg"
        ref={ref}
      >
        <Chart
          containerComponent={
            <ChartVoronoiContainer
              labels={({ datum }) =>
                `${datum.yString} at ${datum.timestamp.toLocaleTimeString()}`
              }
              constrainToVisibleArea
            />
          }
          height={150}
          padding={{
            bottom: 20,
            left: 75,
            right: 10, // Adjusted to accommodate legend
            top: 20,
          }}
          width={width}
        >
          <ChartAxis
            dependentAxis
            showGrid
            tickCount={2}
            tickFormat={(tick, _index, _ticks) => {
              return `${tick} ${unit}`;
            }}
          />
          <ChartGroup>
            <ChartLine data={mappedLineData} />
          </ChartGroup>
        </Chart>
      </div>
      <div className="pf-u-w-5-lg pf-u-w-100-md odf-valueBox">
        <div>
          <Title headingLevel="h5" size="md">
            {latestValue}
          </Title>
        </div>
        <div>Current</div>
      </div>
    </div>
  );
};

export default LineGraph;
