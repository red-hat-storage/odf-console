import * as React from 'react';
import {
  Chart,
  ChartAxis,
  ChartGroup,
  ChartLine,
  ChartVoronoiContainer,
} from '@patternfly/react-charts/victory';
import * as _ from 'lodash-es';
import { Title } from '@patternfly/react-core';
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
  // width of the parent div container (of the Chart component) is fluctuating with the graph/chart (even if viewport remains same),
  // causing multiple re-renders if we use useRefWidth on it. So, using useRefWidth on the Card component,
  // as its width will not change unless we change the viewport dimensions.
  width?: number;
  divideBy?: number;
};

const LineGraph: React.FC<LineGraphProps> = React.memo(
  ({ data, width, divideBy }) => {
    const { t } = useCustomTranslation();
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
        <div className="pf-v5-u-display-none-on-md pf-v5-u-display-inline-block-on-lg pf-v5-u-w-95-lg">
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
            width={width / divideBy || width}
          >
            <ChartAxis
              dependentAxis
              showGrid
              tickCount={2}
              tickFormat={(tick, _index, _ticks) => {
                return `${tick} ${unit}`;
              }}
              tickValues={
                mappedLineData.length === 1 ? [mappedLineData[0].y] : undefined
              }
            />
            <ChartGroup>
              <ChartLine data={mappedLineData} />
            </ChartGroup>
          </Chart>
        </div>
        <div className="pf-v5-u-w-5-lg pf-v5-u-w-100-md odf-valueBox">
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
  }
);

export default LineGraph;
