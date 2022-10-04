import * as React from 'react';
import * as _ from 'lodash-es';
import {
  Chart,
  ChartAxis,
  ChartGroup,
  ChartLine,
  ChartVoronoiContainer,
} from '@patternfly/react-charts';
import { Title } from '@patternfly/react-core';
import useRefWidth from '../../hooks/ref-width';
import { HumanizeResult } from '../../types';
import { useCustomTranslation } from '../../useCustomTranslationHook';
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
  const { t } = useCustomTranslation();
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

  const dataUnavailable = _.isEmpty(data);

  const unit = !dataUnavailable ? lineData[0].y.unit : '';
  const latestValue = !dataUnavailable
    ? lineData[lineData.length - 1].y.string
    : '';
  return !dataUnavailable ? (
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
            left: 95,
            right: 15, // Adjusted to accommodate legend
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
        <div>{t('Current')}</div>
      </div>
    </div>
  ) : (
    <>-</>
  );
};

export default LineGraph;
