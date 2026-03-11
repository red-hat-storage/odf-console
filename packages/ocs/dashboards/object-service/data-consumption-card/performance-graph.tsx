import * as React from 'react';
import { GraphEmpty, PrometheusGraph } from '@odf/shared/charts';
import { twentyFourHourTime } from '@odf/shared/details-page/datetime';
import useRefWidth from '@odf/shared/hooks/ref-width';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { DataPoint } from '@odf/shared/utils';
import { humanizeDecimalBytesPerSec, humanizeSeconds } from '@odf/shared/utils';
import {
  Chart,
  ChartVoronoiContainer,
  ChartTooltip,
  ChartThemeColor,
  ChartAxis,
  ChartGroup,
  ChartLine,
  ChartLegend,
} from '@patternfly/react-charts/victory';
import classNames from 'classnames';
import * as _ from 'lodash-es';
import { Metrics, CHART_LABELS } from '../../../constants';
import { convertNaNToNull, getLatestValue } from '../../../utils';
import './data-consumption-card.scss';

type PerformanceGraphProps = {
  dataPoints: DataPoint[][];
  loading: boolean;
  loadError: boolean;
  metricType: string;
};

const PerformanceGraph: React.FC<PerformanceGraphProps> = ({
  dataPoints,
  loading,
  loadError,
  metricType,
}) => {
  const { t } = useCustomTranslation();
  const [getDataArray, putDataArray] = dataPoints;
  const [containerRef, width] = useRefWidth();
  const humanize =
    metricType === Metrics.BANDWIDTH
      ? humanizeDecimalBytesPerSec
      : humanizeSeconds;
  const getData = getDataArray?.map(convertNaNToNull);
  const putData = putDataArray?.map(convertNaNToNull);
  const PUTLatestValue = humanize(getLatestValue(putData)).string;
  const GETLatestValue = humanize(getLatestValue(getData)).string;

  const legends = [
    { name: t('GET {{GETLatestValue}}', { GETLatestValue }) },
    { name: t('PUT {{PUTLatestValue}}', { PUTLatestValue }) },
  ];

  const emptyData = dataPoints.some(_.isEmpty);

  if (loadError || emptyData) {
    return <GraphEmpty />;
  }
  if (!loading) {
    return (
      <>
        <div className="nb-data-consumption-card__chart-label text-secondary">
          {CHART_LABELS(metricType, t)}
        </div>
        <PrometheusGraph
          ref={containerRef}
          className={classNames({
            'nb-perf__graph--short': metricType === Metrics.LATENCY,
            'nb-perf__graph--long': metricType === Metrics.BANDWIDTH,
          })}
        >
          <Chart
            ariaTitle="RGW Performance Graph"
            domainPadding={{ y: 20 }}
            containerComponent={
              <ChartVoronoiContainer
                voronoiDimension="x"
                labelComponent={
                  <ChartTooltip style={{ fontSize: 14, padding: 5 }} />
                }
                labels={({ datum }) =>
                  `${humanize(datum.y).string} at ${twentyFourHourTime(
                    datum.x
                  )}`
                }
              />
            }
            themeColor={ChartThemeColor.multi}
            scale={{ x: 'time', y: 'linear' }}
            height={493}
            width={width}
            padding={{ top: 15, bottom: 30, left: 60, right: 30 }}
            legendPosition="bottom-left"
            legendComponent={
              <ChartLegend
                data={legends}
                themeColor={ChartThemeColor.multi}
                orientation="horizontal"
                rowGutter={{ top: 0, bottom: 1 }}
                itemsPerRow={2}
                style={{
                  labels: { fontSize: 15 },
                }}
                padding={{
                  bottom: 50,
                  left: 30,
                  right: 20,
                  top: 30,
                }}
              />
            }
          >
            <ChartAxis offsetX={0} tickFormat={(x) => twentyFourHourTime(x)} />
            <ChartAxis dependentAxis tickFormat={(x) => humanize(x).string} />
            <ChartGroup>
              <ChartLine data={getData} />
              <ChartLine data={putData} />
            </ChartGroup>
          </Chart>
        </PrometheusGraph>
      </>
    );
  }
  return (
    <>
      <div className="skeleton-text nb-data-consumption-card__chart-skeleton" />
      <GraphEmpty height={200} loading />
      <div className="skeleton-text nb-data-consumption-card__chart-legend-skeleton" />
    </>
  );
};

export default PerformanceGraph;
