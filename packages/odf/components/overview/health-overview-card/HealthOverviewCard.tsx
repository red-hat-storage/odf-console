import * as React from 'react';
import { HEALTH_SCORE_QUERY } from '@odf/core/components/odf-dashboard/queries';
import { useODFSystemFlagsSelector } from '@odf/core/redux';
import { TWENTY_FOUR_HOURS } from '@odf/shared/constants';
import {
  useCustomPrometheusPoll,
  usePrometheusBasePath,
} from '@odf/shared/hooks/custom-prometheus-poll';
import useRefWidth from '@odf/shared/hooks/ref-width';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  AlertSeverity,
  PrometheusEndpoint,
} from '@openshift-console/dynamic-plugin-sdk';
import { useNavigate } from 'react-router-dom-v5-compat';
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
  ButtonVariant,
  EmptyState,
  EmptyStateVariant,
  EmptyStateIcon,
  EmptyStateBody,
  EmptyStateHeader,
  Title,
  Text,
  TextVariants,
} from '@patternfly/react-core';
import {
  ArrowRightIcon,
  CubesIcon,
  SpaceShuttleIcon,
} from '@patternfly/react-icons';
import { hasAnyCeph } from '../../../utils';
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
  const navigate = useNavigate();
  const [chartRef, chartWidth] = useRefWidth();
  const basePath = usePrometheusBasePath();

  // Check if Ceph/OSDs are available in any storage cluster
  const { systemFlags, areFlagsSafe } = useODFSystemFlagsSelector();
  const isCephAvailable = hasAnyCeph(systemFlags);

  // Fetch health score metric over time (range query)
  const [healthScoreData, healthScoreError, healthScoreLoading] =
    useCustomPrometheusPoll({
      query: HEALTH_SCORE_QUERY,
      endpoint: PrometheusEndpoint.QUERY_RANGE,
      basePath,
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
        if (alert.severity === AlertSeverity.Critical) {
          acc.criticalCount++;
        } else if (alert.severity === AlertSeverity.Warning) {
          acc.moderateCount++;
        } else if (alert.severity === AlertSeverity.Info) {
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

    return healthScoreData.data.result[0].values
      .map((value): HealthDataPoint | null => {
        const [timestamp, scoreValue] = value;
        const score = parseFloat(scoreValue);
        if (Number.isNaN(score)) {
          return null;
        }
        const date = new Date(timestamp * 1000);

        return {
          x: timestamp * 1000, // Use milliseconds for x-axis
          y: score,
          name: `${score.toFixed(1)}% at ${date.toLocaleTimeString()}`,
        };
      })
      .filter((item): item is HealthDataPoint => item !== null);
  }, [healthScoreData]);

  // Get current health score (latest value)
  const currentHealthScore =
    chartData.length > 0 ? chartData[chartData.length - 1].y : null;

  // Calculate fixed 24-hour x-axis domain (now - 24h to now)
  const xDomain = React.useMemo((): [number, number] => {
    const now = Date.now();
    return [now - TWENTY_FOUR_HOURS, now];
  }, []);

  // Comprehensive loading and error state management
  const isAlertsLoading = !healthAlertsLoaded || !silencedAlertsLoaded;
  const isLoading = healthScoreLoading || isAlertsLoading;

  const hasError = healthScoreError || healthAlertsError || silencedAlertsError;
  const hasNoData = chartData.length === 0;

  // Determine if Ceph is unavailable (flags loaded and no Ceph found)
  const isCephUnavailable = areFlagsSafe && !isCephAvailable;

  const showEmptyState = isLoading || hasError || hasNoData;

  // Determine specific error message
  const getErrorMessage = () => {
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
  };

  const cardTitle = t('Infrastructure health');

  // Show unavailable state when no Ceph/OSDs are present
  if (isCephUnavailable) {
    return (
      <Card isFlat>
        <CardHeader>
          <CardTitle>{cardTitle}</CardTitle>
        </CardHeader>
        <CardBody>
          <EmptyState variant={EmptyStateVariant.lg}>
            <EmptyStateHeader
              titleText={t('Health checks unavailable')}
              icon={<EmptyStateIcon icon={CubesIcon} />}
              headingLevel="h4"
            />
            <EmptyStateBody>
              {t(
                'Infrastructure health monitoring is unavailable because no OSDs are present in the cluster.'
              )}
            </EmptyStateBody>
          </EmptyState>
        </CardBody>
      </Card>
    );
  }

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
            <EmptyStateBody>{getErrorMessage()}</EmptyStateBody>
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
                  <Title headingLevel="h2" size="3xl">
                    {Math.round(currentHealthScore)}%
                  </Title>
                  <Text component={TextVariants.small}>
                    {t('Health Score')}
                  </Text>
                </>
              ) : (
                <Text component={TextVariants.small}>{t('No data')}</Text>
              )}
            </div>
          </GridItem>

          <GridItem md={9} sm={12} ref={chartRef}>
            {chartData.length > 0 ? (
              <div className="odf-infrastructure-health-card__chart">
                <Text component={TextVariants.small}>{t('Last 24 hours')}</Text>
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
                  minDomain={{ x: xDomain[0], y: 0 }}
                  maxDomain={{ x: xDomain[1], y: 100 }}
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
              <Text
                component={TextVariants.small}
                className="pf-v5-u-text-align-center"
              >
                {t('No chart data available')}
              </Text>
            )}
          </GridItem>

          {/* Active Issues Section */}
          <GridItem md={12}>
            <Title headingLevel="h3" size="md">
              {t('Active issues')}
            </Title>
          </GridItem>

          {[
            { count: criticalCount, label: 'Critical' },
            { count: moderateCount, label: 'Moderate' },
            { count: minorCount, label: 'Minor' },
          ].map(({ count, label }) => (
            <GridItem key={label} md={4} sm={4}>
              <Title headingLevel="h4" size="2xl">
                {count}
              </Title>
              <Text component={TextVariants.small}>{t(label)}</Text>
            </GridItem>
          ))}

          {/* Action Link */}
          <GridItem md={12}>
            <Button
              variant={ButtonVariant.link}
              icon={<ArrowRightIcon />}
              iconPosition="end"
              className="pf-v5-u-font-size-lg"
              component="a"
              onClick={() => navigate('/odf/overview/health')}
            >
              {t('View health checks')}
            </Button>
          </GridItem>
        </Grid>
      </CardBody>
    </Card>
  );
};
