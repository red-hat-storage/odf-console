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
  ChartAxis,
  ChartGroup,
  ChartLine,
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
  Skeleton,
} from '@patternfly/react-core';
import { ArrowRightIcon } from '@patternfly/react-icons';
import './health-overview-card.scss';

// Define your Prometheus query
const HEALTH_SCORE_QUERY = 'odf_health_score';
const MODERATE_ISSUES_QUERY = '<query_to_count_moderate_issues>';
const MINOR_ISSUES_QUERY = '<query_to_count_minor_issues>';

type HealthDataPoint = {
  x: string;
  y: number;
  yString: string;
  timestamp: Date;
};

export const HealthOverviewCard: React.FC = () => {
  const { t } = useCustomTranslation();
  const [containerRef, width] = useRefWidth();
  const basePath = usePrometheusBasePath();

  // Fetch health score metric over time (range query)
  const [healthScoreData, healthScoreError] = useCustomPrometheusPoll({
    query: HEALTH_SCORE_QUERY,
    endpoint: 'api/v1/query_range' as any,
    basePath,
    samples: 20,
    timespan: 3600000, // 1 hour
  });

  // Fetch current issue counts (instant query)
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

  // Process health score data for chart
  const chartData: HealthDataPoint[] = React.useMemo(() => {
    if (!healthScoreData?.data?.result?.[0]?.values) return [];

    return healthScoreData.data.result[0].values.map((value, index) => {
      const [timestamp, scoreValue] = value;
      const score = parseFloat(scoreValue);

      return {
        x: String(index + 1),
        y: score,
        yString: `${score.toFixed(1)}%`,
        timestamp: new Date(timestamp * 1000),
      };
    });
  }, [healthScoreData]);

  // Get current health score (latest value)
  const currentHealthScore = React.useMemo(() => {
    if (chartData.length === 0) return null;
    return chartData[chartData.length - 1].y;
  }, [chartData]);

  // Parse issue counts
  const moderateIssues = React.useMemo(() => {
    const result = moderateIssuesData?.data?.result?.[0]?.value?.[1];
    return result ? parseInt(result, 10) : 0;
  }, [moderateIssuesData]);

  const minorIssues = React.useMemo(() => {
    const result = minorIssuesData?.data?.result?.[0]?.value?.[1];
    return result ? parseInt(result, 10) : 0;
  }, [minorIssuesData]);

  const isLoading = !healthScoreData && !healthScoreError;

  if (isLoading) {
    return (
      <Card isFlat>
        <CardHeader>
          <CardTitle>{t('ODF infrastructure health')}</CardTitle>
        </CardHeader>
        <CardBody>
          <Skeleton
            height="300px"
            screenreaderText={t('Loading health data')}
          />
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

          <GridItem md={8} sm={12}>
            {chartData.length > 0 ? (
              <div className="odf-infrastructure-health-card__chart">
                <Chart
                  containerComponent={
                    <ChartVoronoiContainer
                      labels={({ datum }) =>
                        `${datum.yString} at ${datum.timestamp.toLocaleTimeString()}`
                      }
                      constrainToVisibleArea
                    />
                  }
                  height={120}
                  width={width * 0.6}
                  padding={{ top: 10, bottom: 20, left: 50, right: 20 }}
                >
                  <ChartAxis
                    dependentAxis
                    showGrid
                    tickCount={3}
                    tickFormat={(tick) => `${tick}%`}
                  />
                  <ChartGroup>
                    <ChartLine data={chartData} />
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

          <GridItem md={6} sm={6}>
            <div className="odf-infrastructure-health-card__issue-count">
              {moderateIssues}
            </div>
            <div className="odf-infrastructure-health-card__issue-label">
              {t('Moderate')}
            </div>
          </GridItem>

          <GridItem md={6} sm={6}>
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
              onClick={() => {
                // Navigate to health checks page
                console.log('Navigate to health checks');
              }}
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
