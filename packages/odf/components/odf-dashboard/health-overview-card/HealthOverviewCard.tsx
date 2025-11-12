import * as React from 'react';
import { HEALTH_SCORE_QUERY } from '@odf/core/components/odf-dashboard/queries';
import { ALERT_SIXTY_SAMPLES, TWENTY_FOUR_HOURS } from '@odf/shared/constants';
import {
  useCustomPrometheusPoll,
  usePrometheusBasePath,
} from '@odf/shared/hooks/custom-prometheus-poll';
import useRefWidth from '@odf/shared/hooks/ref-width';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { PrometheusEndpoint } from '@openshift-console/dynamic-plugin-sdk';
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
import {
  useHealthAlerts,
  useSilencedAlerts,
  filterOutSilencedAlerts,
} from '../../HealthOverview/hooks';
import './health-overview-card.scss';

type HealthDataPoint = {
  x: number;
  y: number;
  name: string;
};

export const HealthOverviewCard: React.FC = () => {
  const { t } = useCustomTranslation();
  const [chartRef, chartWidth] = useRefWidth();
  const basePath = usePrometheusBasePath();

  // Fetch health score metric over time (range query)
  const [healthScoreData, healthScoreError, healthScoreLoading] =
    useCustomPrometheusPoll({
      query: HEALTH_SCORE_QUERY,
      endpoint: PrometheusEndpoint.QUERY_RANGE,
      basePath,
      samples: ALERT_SIXTY_SAMPLES,
      timespan: TWENTY_FOUR_HOURS,
    });

  // Fetch alerts for counting active issues by severity
  const [healthAlerts, healthAlertsLoaded, healthAlertsError] =
    useHealthAlerts();
  const { silences, silencedAlertsLoaded, silencedAlertsError } =
    useSilencedAlerts();

  // Filter out silenced alerts and count by severity
  const { criticalCount, moderateCount, minorCount } = React.useMemo(() => {
    // Get active alerts (exclude silenced ones)
    const activeAlerts = filterOutSilencedAlerts(healthAlerts, silences);

    // Count firing alerts by severity in a single pass (O(n) instead of O(4n))
    return activeAlerts.reduce(
      (acc, alert) => {
        // Only count firing alerts
        if (alert.state !== 'firing') {
          return acc;
        }

        // Count by severity
        if (alert.severity === 'critical') {
          acc.criticalCount++;
        } else if (alert.severity === 'warning') {
          acc.moderateCount++;
        } else if (alert.severity === 'info') {
          acc.minorCount++;
        }

        return acc;
      },
      { criticalCount: 0, moderateCount: 0, minorCount: 0 }
    );
  }, [healthAlerts, silences]);

  // Process health score data for chart
  const chartData: HealthDataPoint[] = React.useMemo(() => {
    if (!healthScoreData?.data?.result?.[0]?.values) return [];

    return healthScoreData.data.result[0].values.map((value) => {
      const [timestamp, scoreValue] = value;
      const score = parseFloat(scoreValue);
      const date = new Date(timestamp * 1000);

      return {
        x: timestamp * 1000, // Use milliseconds for x-axis
        y: score,
        name: `${score.toFixed(1)}% at ${date.toLocaleTimeString()}`,
      };
    });
  }, [healthScoreData]);

  // Get current health score (latest value)
  const currentHealthScore = React.useMemo(() => {
    if (chartData.length === 0) return null;
    return chartData[chartData.length - 1].y;
  }, [chartData]);

  // Comprehensive loading and error state management
  const isAlertsLoading = !healthAlertsLoaded || !silencedAlertsLoaded;
  const isLoading = healthScoreLoading || isAlertsLoading;

  const hasError = healthScoreError || healthAlertsError || silencedAlertsError;
  const hasNoData = chartData.length === 0;
  const showEmptyState = isLoading || hasError || hasNoData;

  // Determine specific error message
  const errorMessage = React.useMemo(() => {
    if (healthScoreError) {
      return t('Unable to retrieve health check data.');
    }
    if (healthAlertsError) {
      return t('Unable to retrieve alert data.');
    }
    if (silencedAlertsError) {
      return t('Unable to retrieve silenced alert data.');
    }
    return t(
      'Health check metrics are being collected. This may take a few moments.'
    );
  }, [healthScoreError, healthAlertsError, silencedAlertsError, t]);

  const cardTitle = t('ODF infrastructure health');

  if (showEmptyState) {
    return (
      <Card isFlat>
        <CardHeader>
          <CardTitle>{cardTitle}</CardTitle>
        </CardHeader>
        <CardBody>
          <EmptyState variant={EmptyStateVariant.lg}>
            <EmptyStateHeader
              titleText={t('Waiting for health checks')}
              icon={<EmptyStateIcon icon={SpaceShuttleIcon} />}
              headingLevel="h4"
            />
            <EmptyStateBody>{errorMessage}</EmptyStateBody>
          </EmptyState>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card isFlat className="odf-infrastructure-health-card">
      <CardHeader>
        <CardTitle>{cardTitle}</CardTitle>
      </CardHeader>
      <CardBody>
        <Grid hasGutter>
          {/* Health Score and Chart Row */}
          <GridItem md={3} sm={12}>
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

          <GridItem md={9} sm={12} ref={chartRef}>
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
                  height={200}
                  width={chartWidth > 0 ? chartWidth - 40 : 600}
                  padding={{ top: 20, bottom: 40, left: 10, right: 10 }}
                  domain={{ y: [0, 100] }}
                  scale={{ x: 'time', y: 'linear' }}
                  themeColor={ChartThemeColor.blue}
                >
                  <ChartAxis
                    tickFormat={(timestamp) => {
                      const date = new Date(timestamp);
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
                        fontSize: 12,
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

          {[
            { count: criticalCount, label: 'Critical' },
            { count: moderateCount, label: 'Moderate' },
            { count: minorCount, label: 'Minor' },
          ].map(({ count, label }) => (
            <GridItem key={label} md={4} sm={4}>
              <div className="odf-infrastructure-health-card__issue-count">
                {count}
              </div>
              <div className="odf-infrastructure-health-card__issue-label">
                {t(label)}
              </div>
            </GridItem>
          ))}

          {/* Action Link */}
          <GridItem md={12}>
            <Button
              variant="link"
              icon={<ArrowRightIcon />}
              iconPosition="end"
              isInline
              component="a"
              href="/odf/overview/health"
            >
              {t('View health checks')}
            </Button>
          </GridItem>
        </Grid>
      </CardBody>
    </Card>
  );
};
