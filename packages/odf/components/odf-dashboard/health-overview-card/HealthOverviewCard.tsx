import * as React from 'react';
import {
  useCustomPrometheusPoll,
  usePrometheusBasePath,
} from '@odf/shared/hooks/custom-prometheus-poll';
import useRefWidth from '@odf/shared/hooks/ref-width';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
// import { humanizeNumber } from '@odf/shared/utils';
import {
  Chart,
  ChartArea,
  ChartAxis,
  ChartGroup,
  ChartThemeColor,
  ChartVoronoiContainer,
} from '@patternfly/react-charts';
import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Grid,
  GridItem,
  Button,
  EmptyState,
  EmptyStateVariant,
  EmptyStateIcon,
  EmptyStateBody,
  EmptyStateHeader,
} from '@patternfly/react-core';
import { ArrowRightIcon, SpaceShuttleIcon } from '@patternfly/react-icons';
import './health-overview-card.scss';

// Define your Prometheus query
const HEALTH_SCORE_QUERY = 'ocs_health_score';
const CRITICAL_ISSUES_QUERY = '<query_to_count_critical_issues>';
const MODERATE_ISSUES_QUERY = '<query_to_count_moderate_issues>';
const MINOR_ISSUES_QUERY = '<query_to_count_minor_issues>';

type HealthDataPoint = {
  x: number;
  y: number;
  name: string;
};

const noop = () => {
  // No operation
};

export const HealthOverviewCard: React.FC = () => {
  const { t } = useCustomTranslation();
  const [containerRef] = useRefWidth();
  const [chartRef, chartWidth] = useRefWidth();
  const basePath = usePrometheusBasePath();

  // MOCK DATA FOR TESTING - Remove this section when ready for production
  // TODO: need to remove the mock data part before the merge
  const USE_MOCK_DATA = true;

  // Fetch health score metric over time (range query)
  const [healthScoreData, healthScoreError] = useCustomPrometheusPoll({
    query: HEALTH_SCORE_QUERY,
    endpoint: 'api/v1/query_range' as any,
    basePath,
    samples: 20,
    timespan: 3600000, // 1 hour
  });

  // Fetch current issue counts (instant query)
  const [criticalIssuesData] = useCustomPrometheusPoll({
    query: CRITICAL_ISSUES_QUERY,
    endpoint: 'api/v1/query' as any,
    basePath,
  });

  const [moderateIssuesData] = useCustomPrometheusPoll({
    query: MODERATE_ISSUES_QUERY,
    endpoint: 'api/v1/query' as any,
    basePath,
  });

  const [minorIssuesData] = useCustomPrometheusPoll({
    query: MINOR_ISSUES_QUERY,
    endpoint: 'api/v1/query' as any,
    basePath,
  });

  // TODO: to be removed
  /******** MOCK DATA [START] ********/
  // Mock data for health score over time (24 hours)
  const mockHealthScoreData = React.useMemo(() => {
    const now = Date.now() / 1000;
    const values = [];
    const hoursToShow = 24;
    const dataPoints = 48; // One data point every 30 minutes
    const intervalSeconds = (hoursToShow * 3600) / dataPoints;

    // Generate a realistic pattern with some variation
    for (let i = 0; i < dataPoints; i++) {
      const timestamp = now - hoursToShow * 3600 + i * intervalSeconds;

      // Create a pattern that shows:
      // - Generally high scores (80-95%)
      // - Small dips during "busy hours" (middle of the day)
      // - Slight recovery towards end
      const hourOffset = (i / dataPoints) * 24;
      let baseScore = 90;

      // Add some realistic patterns
      if (hourOffset >= 8 && hourOffset <= 12) {
        // Morning dip (8am-12pm)
        baseScore = 82 + (12 - hourOffset) * 1.5;
      } else if (hourOffset >= 12 && hourOffset <= 18) {
        // Afternoon recovery (12pm-6pm)
        baseScore = 82 + (hourOffset - 12) * 1.3;
      } else {
        // Night/early morning - stable high
        baseScore = 88 + Math.random() * 5;
      }

      // Add small random variation
      const score = baseScore + (Math.random() - 0.5) * 4;
      const clampedScore = Math.max(70, Math.min(98, score)); // Keep between 70-98%

      values.push([timestamp, clampedScore.toFixed(2)]);
    }
    return {
      data: {
        result: [{ values }],
      },
    };
  }, []);

  // Mock data for issue counts
  const mockCriticalIssuesData = React.useMemo(
    () => ({
      data: { result: [{ value: [Date.now() / 1000, '2'] }] },
    }),
    []
  );
  const mockModerateIssuesData = React.useMemo(
    () => ({
      data: { result: [{ value: [Date.now() / 1000, '5'] }] },
    }),
    []
  );
  const mockMinorIssuesData = React.useMemo(
    () => ({
      data: { result: [{ value: [Date.now() / 1000, '8'] }] },
    }),
    []
  );
  /******** MOCK DATA [END] ********/

  // Process health score data for chart
  const chartData: HealthDataPoint[] = React.useMemo(() => {
    const dataSource = USE_MOCK_DATA ? mockHealthScoreData : healthScoreData;
    if (!dataSource?.data?.result?.[0]?.values) return [];

    return dataSource.data.result[0].values.map((value) => {
      const [timestamp, scoreValue] = value;
      const score = parseFloat(scoreValue);
      const date = new Date(timestamp * 1000);

      return {
        x: timestamp * 1000, // Use milliseconds for x-axis
        y: score,
        name: `${score.toFixed(1)}% at ${date.toLocaleTimeString()}`,
      };
    });
  }, [USE_MOCK_DATA, mockHealthScoreData, healthScoreData]);

  // Get current health score (latest value)
  const currentHealthScore = React.useMemo(() => {
    if (chartData.length === 0) return null;
    return chartData[chartData.length - 1].y;
  }, [chartData]);

  // Parse issue counts
  const criticalIssues = React.useMemo(() => {
    const dataSource = USE_MOCK_DATA
      ? mockCriticalIssuesData
      : criticalIssuesData;
    const result = dataSource?.data?.result?.[0]?.value?.[1];
    return result ? parseInt(String(result), 10) : 0;
  }, [USE_MOCK_DATA, mockCriticalIssuesData, criticalIssuesData]);

  const moderateIssues = React.useMemo(() => {
    const dataSource = USE_MOCK_DATA
      ? mockModerateIssuesData
      : moderateIssuesData;
    const result = dataSource?.data?.result?.[0]?.value?.[1];
    return result ? parseInt(String(result), 10) : 0;
  }, [USE_MOCK_DATA, mockModerateIssuesData, moderateIssuesData]);

  const minorIssues = React.useMemo(() => {
    const dataSource = USE_MOCK_DATA ? mockMinorIssuesData : minorIssuesData;
    const result = dataSource?.data?.result?.[0]?.value?.[1];
    return result ? parseInt(String(result), 10) : 0;
  }, [USE_MOCK_DATA, mockMinorIssuesData, minorIssuesData]);

  const isLoading = USE_MOCK_DATA
    ? false
    : !healthScoreData && !healthScoreError;
  const hasNoData = chartData.length === 0;
  const showEmptyState = USE_MOCK_DATA
    ? false
    : isLoading || healthScoreError || hasNoData;

  if (showEmptyState) {
    return (
      <Card isFlat>
        <CardHeader>
          <CardTitle>{t('ODF infrastructure health')}</CardTitle>
        </CardHeader>
        <CardBody>
          <EmptyState variant={EmptyStateVariant.lg}>
            <EmptyStateHeader
              titleText={<>{t('Waiting for health checks')}</>}
              icon={<EmptyStateIcon icon={SpaceShuttleIcon} />}
              headingLevel="h4"
            />
            <EmptyStateBody>
              {healthScoreError
                ? t('Unable to retrieve health check data.')
                : t(
                    'Health check metrics are being collected. This may take a few moments.'
                  )}
            </EmptyStateBody>
          </EmptyState>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card isFlat className="odf-infrastructure-health-card" ref={containerRef}>
      <CardHeader>
        <CardTitle>{t('ODF infrastructure health')}</CardTitle>
      </CardHeader>
      <CardBody>
        <Grid hasGutter>
          {/* Health Score and Chart Row */}
          <GridItem md={4} sm={12}>
            <div className="odf-infrastructure-health-card__score">
              {currentHealthScore !== null ? (
                <>
                  <div className="odf-infrastructure-health-card__score-value">
                    {Math.round(currentHealthScore)}%
                  </div>
                  <div className="odf-infrastructure-health-card__score-label">
                    {t('Health Score')}
                  </div>
                </>
              ) : (
                <div className="pf-v5-u-color-200">{t('No data')}</div>
              )}
            </div>
          </GridItem>

          <GridItem md={8} sm={12} ref={chartRef}>
            {chartData.length > 0 ? (
              <div className="odf-infrastructure-health-card__chart">
                <div className="odf-infrastructure-health-card__chart-label">
                  {t('Last 24 hours')}
                </div>
                <Chart
                  ariaTitle={t('Health Score Over Time')}
                  containerComponent={
                    <ChartVoronoiContainer
                      labels={({ datum }) => datum.name}
                      constrainToVisibleArea
                    />
                  }
                  height={180}
                  width={chartWidth > 0 ? chartWidth - 40 : 600}
                  padding={{ top: 20, bottom: 40, left: 10, right: 10 }}
                  domain={{ y: [0, 100] }}
                  scale={{ x: 'time', y: 'linear' }}
                  themeColor={ChartThemeColor.blue}
                >
                  <ChartAxis
                    tickFormat={(t) => {
                      const date = new Date(t);
                      return date.toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true,
                      });
                    }}
                    fixLabelOverlap
                    style={{
                      axis: { stroke: 'transparent' },
                      tickLabels: {
                        fontSize: 10,
                        fill: 'var(--pf-v5-global--Color--200)',
                      },
                    }}
                  />
                  <ChartGroup>
                    <ChartArea
                      data={chartData}
                      interpolation="monotoneX"
                      style={{
                        data: {
                          fill: 'var(--pf-v5-chart-color-blue-300)',
                          fillOpacity: 0.3,
                          stroke: 'var(--pf-v5-chart-color-blue-400)',
                          strokeWidth: 2,
                        },
                      }}
                    />
                  </ChartGroup>
                </Chart>
              </div>
            ) : (
              <div className="pf-v5-u-color-200 pf-v5-u-text-align-center">
                {t('No chart data available')}
              </div>
            )}
          </GridItem>

          {/* Active Issues Section */}
          <GridItem md={12}>
            <div className="odf-infrastructure-health-card__section-title">
              {t('Active issues')}
            </div>
          </GridItem>

          <GridItem md={4} sm={4}>
            <div className="odf-infrastructure-health-card__issue-count">
              {criticalIssues}
            </div>
            <div className="odf-infrastructure-health-card__issue-label">
              {t('Critical')}
            </div>
          </GridItem>

          <GridItem md={4} sm={4}>
            <div className="odf-infrastructure-health-card__issue-count">
              {moderateIssues}
            </div>
            <div className="odf-infrastructure-health-card__issue-label">
              {t('Moderate')}
            </div>
          </GridItem>

          <GridItem md={4} sm={4}>
            <div className="odf-infrastructure-health-card__issue-count">
              {minorIssues}
            </div>
            <div className="odf-infrastructure-health-card__issue-label">
              {t('Minor')}
            </div>
          </GridItem>

          {/* Action Link */}
          <GridItem md={12}>
            <Button
              variant="link"
              icon={<ArrowRightIcon />}
              iconPosition="end"
              isInline
              component="a"
              onClick={noop}
            >
              {t('View health checks')}
            </Button>
          </GridItem>
        </Grid>
      </CardBody>
    </Card>
  );
};

/*
import * as React from 'react';
import { Card, CardBody, CardHeader, CardTitle } from '@patternfly/react-core';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';

export const HealthOverviewCard: React.FC = () => {
  const { t } = useCustomTranslation();

  return (
    <Card className="odfDashboard-card--height">
      <CardHeader>
        <CardTitle>{t('ODF infrastructure health')}</CardTitle>
      </CardHeader>
      <CardBody> </CardBody>
    </Card>
  );
};
*/
