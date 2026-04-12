import * as React from 'react';
import { useCustomTranslation } from '@odf/shared';
import { GraphEmpty } from '@odf/shared/charts';
import { TWENTY_FOUR_HOURS } from '@odf/shared/constants/common';
import { DataUnavailableError } from '@odf/shared/generic/Error';
import {
  useCustomPrometheusPoll,
  usePrometheusBasePath,
} from '@odf/shared/hooks/custom-prometheus-poll';
import useRefWidth from '@odf/shared/hooks/ref-width';
import { humanizePercentage } from '@odf/shared/utils/humanize';
import { PrometheusResponse } from '@openshift-console/dynamic-plugin-sdk';
import {
  Chart,
  ChartAxis,
  ChartGroup,
  ChartLegend,
  ChartLine,
  createContainer,
} from '@patternfly/react-charts/victory';
import { Button, Label } from '@patternfly/react-core';
import { t_global_color_nonstatus_blue_default as activeColor } from '@patternfly/react-tokens';
import { HEALTH_SCORE_QUERY } from '../odf-dashboard/queries';
import { AlertRowData } from './hooks';
import { getSeverityColor } from './utils';
import './infra-health-graph.scss';

// Create a container that supports both zoom and voronoi (tooltips)
// PF6/Victory compatible - combines zoom and voronoi behaviors
const ZoomVoronoiContainer = createContainer('zoom', 'voronoi');

// Victory's DomainTuple type - can be [number, number] or [Date, Date]
type DomainTuple = [number, number] | [Date, Date];

// Victory's internal ZoomDomain type (x and y are both DomainTuple)
type VictoryZoomDomain = {
  x: DomainTuple;
  y: DomainTuple;
};

// Our simplified zoom domain type for external consumers
export type ZoomDomain = { start: Date; end: Date } | null;

type InfraHealthGraphProps = {
  alerts?: AlertRowData[];
  alertsLoaded?: boolean;
  alertsError?: unknown;
  onZoomDomainChange?: (domain: ZoomDomain) => void;
};

const getScoreSeries = (
  response: PrometheusResponse | null
): { x: Date; y: number }[] => {
  const values = response?.data?.result?.[0]?.values ?? [];

  return values.map(([timestamp, value]: [number, string]) => ({
    x: new Date(timestamp * 1000),
    y: Number(value),
  }));
};

const getAlertSeries = (alerts: AlertRowData[]) => {
  if (!alerts.length) {
    return [];
  }

  const MIN_Y = 10;
  const MAX_Y = 100;
  const bandHeight = MAX_Y - MIN_Y;
  const laneCount = alerts.length;
  const gap = bandHeight / (laneCount + 1);

  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - TWENTY_FOUR_HOURS);

  return alerts.map((alert, index) => {
    const laneY = MIN_Y + gap * (index + 1);

    // Clamp start time to the 24-hour window
    const start = new Date(
      Math.max(alert.startTime.getTime(), twentyFourHoursAgo.getTime())
    );
    // Clamp end time to now
    const end = alert.endTime
      ? new Date(Math.min(alert.endTime.getTime(), now.getTime()))
      : now;

    return {
      alert,
      data: [
        { x: start, y: laneY },
        { x: end, y: laneY },
      ],
    };
  });
};

export const InfraHealthGraph: React.FC<InfraHealthGraphProps> = ({
  alerts = [],
  alertsLoaded = true,
  alertsError = null,
  onZoomDomainChange,
}) => {
  const { t } = useCustomTranslation();

  const [ref, width] = useRefWidth();

  // Zoom state for controlled zoom - normalized to Date objects
  const [zoomDomain, setZoomDomain] = React.useState<
    { x: [Date, Date] } | undefined
  >();

  // Handle zoom domain changes from Victory's ZoomContainer
  // Victory passes the full domain object with x and y tuples
  // Normalize to Date objects here so we don't need runtime checks elsewhere
  const handleZoomDomainChange = React.useCallback(
    (domain: VictoryZoomDomain) => {
      if (domain?.x) {
        // Normalize Victory's DomainTuple (number | Date) to Date objects
        const [start, end] = domain.x;
        const startDate = start instanceof Date ? start : new Date(start);
        const endDate = end instanceof Date ? end : new Date(end);
        setZoomDomain({ x: [startDate, endDate] });
        onZoomDomainChange?.({ start: startDate, end: endDate });
      } else {
        setZoomDomain(undefined);
        onZoomDomainChange?.(null);
      }
    },
    [onZoomDomainChange]
  );

  const handleResetZoom = React.useCallback(() => {
    setZoomDomain(undefined);
    onZoomDomainChange?.(null);
  }, [onZoomDomainChange]);
  const [scoreResponse, scoreError, scoreLoading] = useCustomPrometheusPoll({
    query: HEALTH_SCORE_QUERY,
    endpoint: 'api/v1/query_range' as any,
    timespan: TWENTY_FOUR_HOURS,
    basePath: usePrometheusBasePath(),
  });

  const scoreSeries = React.useMemo(
    () => getScoreSeries(scoreResponse),
    [scoreResponse]
  );

  const alertSeries = React.useMemo(() => getAlertSeries(alerts), [alerts]);

  const scoreHasData = scoreSeries?.length > 0;
  const alertsHaveData = alertSeries?.length > 0;

  const scoreLoadingOnly = scoreLoading && !scoreResponse && !scoreHasData;
  const alertsLoadingOnly = !alertsLoaded && !alertsError && !alertsHaveData;

  const scoreFailed = !!scoreError && !scoreHasData;
  const alertsFailed = !!alertsError && !alertsHaveData;

  const isLoading = scoreLoadingOnly && alertsLoadingOnly;
  const hasError = scoreFailed && alertsFailed;

  let content: React.ReactNode;

  if (isLoading) {
    content = <GraphEmpty height={250} loading />;
  } else if (hasError) {
    content = <DataUnavailableError />;
  } else if (!scoreHasData && !alertsHaveData) {
    content = <GraphEmpty height={250} loading={false} />;
  } else {
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - TWENTY_FOUR_HOURS);

    content = (
      <Chart
        height={250}
        width={width}
        scale={{ x: 'time', y: 'linear' }}
        padding={{ top: 20, bottom: 60, left: 70, right: 80 }}
        domain={{
          x: [twentyFourHoursAgo, now],
          y: [0, 100],
        }}
        legendData={[
          {
            name: t('Health score'),
            symbol: { type: 'line', fill: activeColor.value },
          },
          {
            name: t('Critical'),
            symbol: { type: 'minus', fill: getSeverityColor('critical') },
          },
          {
            name: t('Moderate'),
            symbol: { type: 'minus', fill: getSeverityColor('warning') },
          },
          {
            name: t('Minor'),
            symbol: { type: 'minus', fill: getSeverityColor('info') },
          },
        ]}
        legendPosition="bottom"
        legendAllowWrap={true}
        legendComponent={
          <ChartLegend
            style={{
              labels: { fill: 'var(--pf-t--global--text--color--regular)' },
            }}
          />
        }
        containerComponent={
          <ZoomVoronoiContainer
            zoomDimension="x"
            zoomDomain={zoomDomain}
            onZoomDomainChange={handleZoomDomainChange}
            voronoiDimension="x"
            constrainToVisibleArea
            labels={({ datum }) => {
              if (datum.type === 'score') {
                return `${humanizePercentage(datum.y).string} ${t('at')} ${datum.x.toLocaleTimeString()}`;
              }

              const start = new Date(datum.startTime).toLocaleString();
              const end = new Date(datum.endTime).toLocaleString();
              return t(
                'Alert: {{name}} ({{severity}})\nStart: {{start}}\nEnd: {{end}}',
                {
                  name: datum.alertname,
                  severity: datum.severity,
                  start,
                  end,
                }
              );
            }}
          />
        }
      >
        <ChartAxis
          style={{
            tickLabels: { fill: 'var(--pf-t--global--text--color--regular)' },
          }}
        />
        <ChartAxis
          dependentAxis
          tickFormat={(v) => `${v}%`}
          style={{
            tickLabels: { fill: 'var(--pf-t--global--text--color--regular)' },
          }}
        />
        <ChartGroup>
          {scoreHasData && (
            <ChartLine
              data={scoreSeries.map((point) => ({
                ...point,
                type: 'score',
              }))}
              style={{
                data: {
                  strokeDasharray: '3,3',
                  stroke: activeColor.value,
                },
              }}
            />
          )}
          {alertSeries.map(({ alert, data }) => (
            <ChartLine
              key={alert.metadata.uid}
              data={data.map((point) => ({
                ...point,
                type: 'alert',
                alertname: alert.alertname,
                severity: alert.severity,
                startTime: alert.startTime,
                endTime: alert.endTime ?? new Date(),
              }))}
              style={{
                data: {
                  strokeWidth: 6,
                  stroke: getSeverityColor(alert.severity),
                },
              }}
            />
          ))}
        </ChartGroup>
      </Chart>
    );
  }

  return (
    <div ref={ref} className="pf-v6-u-mt-sm odf-infra-health-graph">
      {zoomDomain && (
        <div className="odf-infra-health-graph__header">
          <Label
            className="odf-infra-health-graph__zoom-indicator"
            onClose={handleResetZoom}
          >
            {t('Viewing: {{start}} - {{end}}', {
              start: zoomDomain.x[0].toLocaleTimeString(),
              end: zoomDomain.x[1].toLocaleTimeString(),
            })}
          </Label>
          <Button
            variant="link"
            onClick={handleResetZoom}
            className="odf-infra-health-graph__reset-button"
          >
            {t('Reset zoom')}
          </Button>
        </div>
      )}
      {content}
    </div>
  );
};

export default InfraHealthGraph;
