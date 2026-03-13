import * as React from 'react';
import { HEALTH_SCORE_QUERY } from '@odf/core/components/odf-dashboard/queries';
import { ONE_MINUTE, TWENTY_FOUR_HOURS } from '@odf/shared/constants';
import { usePrometheusBasePath } from '@odf/shared/hooks/custom-prometheus-poll';
import { getPrometheusURL } from '@odf/shared/hooks/custom-prometheus-poll/helpers';
import { useSafeFetch } from '@odf/shared/hooks/custom-prometheus-poll/safe-fetch-hook';
import {
  PrometheusEndpoint,
  PrometheusResponse,
} from '@openshift-console/dynamic-plugin-sdk';

// Constants for staleness detection and polling
const FIVE_MINUTES = 5 * ONE_MINUTE;
const RANGE_QUERY_SAMPLES = 288; // 5-minute step for 24-hour range
const STALENESS_THRESHOLD = FIVE_MINUTES; // Consider data stale if older than 5 minutes
const NORMAL_POLL_INTERVAL = 30000; // 30 seconds normal polling
const FAST_POLL_INTERVAL = 10000; // 10 seconds when data is stale (graceful refetch)
const INSTANT_QUERY_INTERVAL = 15000; // 15 seconds for instant query

export type HealthDataPoint = {
  x: number;
  y: number;
  name: string;
};

type HealthScoreDataResult = {
  // Current health score from instant query (always fresh)
  currentHealthScore: number | null;
  // Chart data from range query
  chartData: HealthDataPoint[];
  // Loading states
  isLoading: boolean;
  isCurrentScoreLoading: boolean;
  isChartLoading: boolean;
  // Error states
  error: Error | null;
  currentScoreError: Error | null;
  chartError: Error | null;
  // Staleness info
  isStale: boolean;
  lastDataTimestamp: number | null;
  // Manual refetch functions
  refetchCurrentScore: () => void;
  refetchChartData: () => void;
  forceRefetchAll: () => void;
};

/**
 * Custom hook implementing hybrid approach for health score data:
 * 1. Instant query for current health score (always fresh)
 * 2. Range query for chart data (with increased samples for better resolution)
 * 3. Staleness detection with automatic faster polling when stale
 * 4. Manual refetch capability (graceful + forceful)
 */
export const useHealthScoreData = (): HealthScoreDataResult => {
  const basePath = usePrometheusBasePath();
  const safeFetch = useSafeFetch();

  // State for instant query (current score)
  const [currentScore, setCurrentScore] = React.useState<number | null>(null);
  const [currentScoreLoading, setCurrentScoreLoading] = React.useState(true);
  const [currentScoreError, setCurrentScoreError] =
    React.useState<Error | null>(null);

  // State for range query (chart data)
  const [rangeData, setRangeData] = React.useState<PrometheusResponse | null>(
    null
  );
  const [rangeLoading, setRangeLoading] = React.useState(true);
  const [rangeError, setRangeError] = React.useState<Error | null>(null);

  // Force refetch counters (changing these triggers immediate refetch)
  const [instantRefetchKey, setInstantRefetchKey] = React.useState(0);
  const [rangeRefetchKey, setRangeRefetchKey] = React.useState(0);

  // Track staleness
  const [isStale, setIsStale] = React.useState(false);
  const [lastDataTimestamp, setLastDataTimestamp] = React.useState<
    number | null
  >(null);
  // Track if we've already triggered auto-refetch for current stale state
  const hasTriggeredAutoRefetch = React.useRef(false);

  // Build URLs for queries
  const instantQueryUrl = React.useMemo(() => {
    if (!basePath) return '';
    return getPrometheusURL(
      {
        endpoint: PrometheusEndpoint.QUERY,
        query: HEALTH_SCORE_QUERY,
      },
      basePath
    );
  }, [basePath]);

  const rangeQueryUrl = React.useMemo(() => {
    if (!basePath) return '';
    return getPrometheusURL(
      {
        endpoint: PrometheusEndpoint.QUERY_RANGE,
        query: HEALTH_SCORE_QUERY,
        timespan: TWENTY_FOUR_HOURS,
        samples: RANGE_QUERY_SAMPLES,
      },
      basePath
    );
  }, [basePath]);

  // Fetch current score (instant query)
  const fetchCurrentScore = React.useCallback(async () => {
    if (!instantQueryUrl) return;

    try {
      const response = await safeFetch({ url: instantQueryUrl });
      const value = response?.data?.result?.[0]?.value;
      if (value && value.length >= 2) {
        const score = parseFloat(value[1]);
        if (!Number.isNaN(score)) {
          setCurrentScore(score);
          setCurrentScoreError(null);
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        setCurrentScoreError(err as Error);
        // eslint-disable-next-line no-console
        console.error('Error fetching current health score:', err);
      }
    } finally {
      setCurrentScoreLoading(false);
    }
  }, [instantQueryUrl, safeFetch]);

  // Fetch chart data (range query)
  const fetchChartData = React.useCallback(async () => {
    if (!rangeQueryUrl) return;

    try {
      const response = await safeFetch({ url: rangeQueryUrl });
      setRangeData(response);
      setRangeError(null);

      // Check staleness based on last data point timestamp
      const values = response?.data?.result?.[0]?.values;
      if (values && values.length > 0) {
        const lastTimestamp = values[values.length - 1][0] * 1000;
        setLastDataTimestamp(lastTimestamp);

        const now = Date.now();
        const dataAge = now - lastTimestamp;
        setIsStale(dataAge > STALENESS_THRESHOLD);
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        setRangeError(err as Error);
        // eslint-disable-next-line no-console
        console.error('Error fetching health score chart data:', err);
      }
    } finally {
      setRangeLoading(false);
    }
  }, [rangeQueryUrl, safeFetch]);

  // Set up polling for instant query
  React.useEffect(() => {
    fetchCurrentScore();
    const intervalId = setInterval(fetchCurrentScore, INSTANT_QUERY_INTERVAL);
    return () => clearInterval(intervalId);
  }, [fetchCurrentScore, instantRefetchKey]);

  // Set up polling for range query with adaptive interval based on staleness
  React.useEffect(() => {
    fetchChartData();

    // Use faster polling when data is stale (graceful refetch)
    const pollInterval = isStale ? FAST_POLL_INTERVAL : NORMAL_POLL_INTERVAL;
    const intervalId = setInterval(fetchChartData, pollInterval);

    return () => clearInterval(intervalId);
  }, [fetchChartData, isStale, rangeRefetchKey]);

  // Auto-refetch when staleness is first detected
  React.useEffect(() => {
    if (isStale && !hasTriggeredAutoRefetch.current) {
      // Mark that we've triggered auto-refetch to avoid repeated triggers
      hasTriggeredAutoRefetch.current = true;

      // Force immediate refetch of both queries
      setRangeLoading(true);
      setRangeRefetchKey((prev) => prev + 1);

      // eslint-disable-next-line no-console
      console.info(
        'Health score chart data is stale, triggering automatic refetch...'
      );
    }

    // Reset the flag when data becomes fresh again
    if (!isStale) {
      hasTriggeredAutoRefetch.current = false;
    }
  }, [isStale]);

  // Process chart data
  const chartData: HealthDataPoint[] = React.useMemo(() => {
    if (!rangeData?.data?.result?.[0]?.values) return [];

    return rangeData.data.result[0].values
      .map((value): HealthDataPoint | null => {
        const [timestamp, scoreValue] = value;
        const score = parseFloat(scoreValue);
        if (Number.isNaN(score)) {
          return null;
        }
        const date = new Date(timestamp * 1000);

        return {
          x: timestamp * 1000,
          y: score,
          name: `${score.toFixed(1)}% at ${date.toLocaleTimeString()}`,
        };
      })
      .filter((item): item is HealthDataPoint => item !== null);
  }, [rangeData]);

  // Manual refetch functions
  const refetchCurrentScore = React.useCallback(() => {
    setCurrentScoreLoading(true);
    setInstantRefetchKey((prev) => prev + 1);
  }, []);

  const refetchChartData = React.useCallback(() => {
    setRangeLoading(true);
    setRangeRefetchKey((prev) => prev + 1);
  }, []);

  const forceRefetchAll = React.useCallback(() => {
    setCurrentScoreLoading(true);
    setRangeLoading(true);
    setInstantRefetchKey((prev) => prev + 1);
    setRangeRefetchKey((prev) => prev + 1);
  }, []);

  return {
    currentHealthScore: currentScore,
    chartData,
    isLoading: currentScoreLoading || rangeLoading,
    isCurrentScoreLoading: currentScoreLoading,
    isChartLoading: rangeLoading,
    error: currentScoreError || rangeError,
    currentScoreError,
    chartError: rangeError,
    isStale,
    lastDataTimestamp,
    refetchCurrentScore,
    refetchChartData,
    forceRefetchAll,
  };
};
