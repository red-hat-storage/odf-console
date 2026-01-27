import * as React from 'react';
import { HEALTH_SCORE_QUERY } from '@odf/core/components/odf-dashboard/queries';
import { TWENTY_FOUR_HOURS } from '@odf/shared/constants';
import { AreaChart } from '@odf/shared/dashboards/utilization-card/area-chart';
import {
  useCustomPrometheusPoll,
  usePrometheusBasePath,
} from '@odf/shared/hooks/custom-prometheus-poll';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { DataPoint } from '@odf/shared/utils';
import {
  AlertSeverity,
  Humanize,
  PrometheusEndpoint,
} from '@openshift-console/dynamic-plugin-sdk';
import { useNavigate } from 'react-router-dom-v5-compat';
import { ChartThemeColor } from '@patternfly/react-charts';
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
import { ArrowRightIcon, SpaceShuttleIcon } from '@patternfly/react-icons';
import {
  useHealthAlerts,
  useSilencedAlerts,
  filterOutSilencedAlerts,
} from '../../HealthOverview/hooks';
import './health-overview-card.scss';

// Humanize function for displaying percentage values
const humanizePercent: Humanize = (value: number) => ({
  string: `${Math.round(value)}%`,
  value,
  unit: '%',
});

// Custom date formatter for x-axis tick labels
const formatTimeLabel = (date: Date): string =>
  date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

// Chart styling for health score area
const HEALTH_CHART_STYLE = [
  {
    data: {
      fill: 'var(--pf-v5-chart-color-blue-300)',
      fillOpacity: 0.3,
      stroke: 'var(--pf-v5-chart-color-blue-400)',
      strokeWidth: 2,
    },
  },
];

// Chart axis styling
const X_AXIS_STYLE = {
  axis: { stroke: 'transparent' },
  tickLabels: {
    fontSize: 12,
    fill: 'var(--pf-v5-global--Color--200)',
  },
};

// Chart padding configuration
const CHART_PADDING = { top: 20, bottom: 40, left: 10, right: 10 };

export const HealthOverviewCard: React.FC = () => {
  const { t } = useCustomTranslation();
  const navigate = useNavigate();
  const basePath = usePrometheusBasePath();

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

  // Process health score data for chart (format: DataPoint<Date>[][])
  const chartData: DataPoint<Date>[][] = React.useMemo(() => {
    if (!healthScoreData?.data?.result?.[0]?.values) return [];

    const dataPoints = healthScoreData.data.result[0].values
      .map((value): DataPoint<Date> | null => {
        const [timestamp, scoreValue] = value;
        const score = parseFloat(scoreValue);
        if (Number.isNaN(score)) {
          return null;
        }

        return {
          x: new Date(timestamp * 1000),
          y: score,
          description: t('Health Score'),
        };
      })
      .filter((item): item is DataPoint<Date> => item !== null);

    return dataPoints.length > 0 ? [dataPoints] : [];
  }, [healthScoreData, t]);

  // Get current health score (latest value)
  const currentHealthScore =
    chartData.length > 0 && chartData[0].length > 0
      ? chartData[0][chartData[0].length - 1].y
      : null;

  // Calculate fixed 24-hour x-axis domain (now - 24h to now)
  const chartDomain = React.useMemo(() => {
    const now = Date.now();
    return {
      x: [now - TWENTY_FOUR_HOURS, now] as [number, number],
      y: [0, 100] as [number, number],
    };
  }, []);

  const isAlertsLoading = !healthAlertsLoaded || !silencedAlertsLoaded;
  const isLoading = healthScoreLoading || isAlertsLoading;

  const hasError = healthScoreError || healthAlertsError || silencedAlertsError;
  const hasNoData = chartData.length === 0 || chartData[0]?.length === 0;
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

          <GridItem md={9} sm={12}>
            <div className="odf-infrastructure-health-card__chart">
              <Text component={TextVariants.small}>{t('Last 24 hours')}</Text>
              <AreaChart
                data={chartData}
                loading={healthScoreLoading}
                ariaChartTitle={t('Health Score Over Time')}
                humanize={humanizePercent}
                formatDate={formatTimeLabel}
                height={200}
                yAxis={false}
                xAxis={true}
                domain={chartDomain}
                themeColor={ChartThemeColor.blue}
                padding={CHART_PADDING}
                interpolation="monotoneX"
                chartStyle={HEALTH_CHART_STYLE}
                xAxisStyle={X_AXIS_STYLE}
                disableGraphLink
              />
            </div>
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
