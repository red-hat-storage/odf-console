import * as React from 'react';
import { mapLimitsRequests } from '@odf/shared/charts';
import { AreaChart } from '@odf/shared/dashboards/utilization-card/area-chart';
import {
  ColoredIconProps,
  Humanize,
  LIMIT_STATE,
  PrometheusResponse,
  PrometheusResult,
  RedExclamationCircleIcon,
  TopConsumerPopoverProps,
  YellowExclamationTriangleIcon,
} from '@openshift-console/dynamic-plugin-sdk';
import { ByteDataTypes } from '@openshift-console/dynamic-plugin-sdk/lib/api/internal-types';
import { ChartThemeColor, ChartLegend } from '@patternfly/react-charts/victory';
import {
  t_global_color_status_danger_100 as dangerColor,
  t_global_color_status_warning_100 as warningColor,
} from '@patternfly/react-tokens';
import { useCustomTranslation } from '../../useCustomTranslationHook';

enum AreaChartStatus {
  ERROR = 'ERROR',
  WARNING = 'WARNING',
}

const chartStatusColors = {
  [AreaChartStatus.ERROR]: dangerColor.value,
  [AreaChartStatus.WARNING]: warningColor.value,
};

export const trimSecondsXMutator = (x: number) => {
  const d = new Date(x * 1000);
  d.setSeconds(0, 0);
  return d;
};

export const UtilizationItem: React.FC<UtilizationItemProps> = React.memo(
  ({
    TopConsumerPopover,
    byteDataType,
    error,
    humanizeValue,
    isLoading = false,
    limit,
    max = null,
    query,
    requested,
    setLimitReqState,
    title,
    utilization,
    chartType,
    description,
    hideCurrentHumanized,
    hideHorizontalBorder,
    disableGraphLink,
    showLegend,
    CustomUtilizationSummary,
    formatDate,
    showHumanizedInLegend,
  }) => {
    const { t } = useCustomTranslation();
    const { data, chartStyle } = mapLimitsRequests({
      utilization,
      limit,
      requested,
      xMutator: trimSecondsXMutator,
      t,
      description: description,
    });
    const [utilizationData, limitData, requestedData] = data;
    const current = utilizationData?.length
      ? utilizationData[utilizationData.length - 1].y
      : null;

    let humanMax: string;
    let humanAvailable: string;
    if (current && max) {
      humanMax = humanizeValue(max).string;
      const percentage = (100 * current) / max;

      if (percentage >= 90) {
        chartStyle[0] = {
          data: { fill: chartStatusColors[AreaChartStatus.ERROR] },
        };
      } else if (percentage >= 80) {
        chartStyle[0] = {
          data: { fill: chartStatusColors[AreaChartStatus.WARNING] },
        };
      }

      humanAvailable = humanizeValue(max - current).string;
    }
    let humanizedLegend: JSX.Element;
    if (!!showHumanizedInLegend && current)
      humanizedLegend = (
        <ChartLegend
          themeColor={ChartThemeColor.purple}
          data={[{ name: description + ' : ' + humanizeValue(current).string }]}
        />
      );

    const chart = (
      <AreaChart
        ariaChartLinkLabel={t('View {{title}} metrics in query browser', {
          title,
        })}
        ariaChartTitle={title}
        data={data}
        loading={!error && isLoading}
        query={!disableGraphLink && query}
        // Todo(bipuladh): Make humanize type Humanize once unit.js is converted
        humanize={humanizeValue as Humanize}
        byteDataType={byteDataType}
        chartStyle={chartStyle}
        chartType={chartType}
        mainDataName="usage"
        showLegend={showLegend}
        formatDate={formatDate}
        legendComponent={humanizedLegend}
      />
    );

    // Code below is used to render Consumer Popovers.
    let LimitIcon: React.ComponentType<ColoredIconProps>;
    let humanLimit: string;
    let limitState = LIMIT_STATE.OK;
    let requestedState = LIMIT_STATE.OK;

    const latestLimit = limitData?.length
      ? limitData[limitData.length - 1].y
      : null;
    const latestRequested = requestedData?.length
      ? requestedData[requestedData.length - 1].y
      : null;

    if (max) {
      if (latestLimit && latestRequested) {
        humanLimit = humanizeValue(latestLimit).string;
        const limitPercentage = (100 * latestLimit) / max;
        const reqPercentage = (100 * latestRequested) / max;
        if (limitPercentage > 100) {
          limitState = LIMIT_STATE.ERROR;
        } else if (limitPercentage >= 75) {
          limitState = LIMIT_STATE.WARN;
        }
        if (reqPercentage > 100) {
          requestedState = LIMIT_STATE.ERROR;
        } else if (reqPercentage >= 75) {
          requestedState = LIMIT_STATE.WARN;
        }
        if ([limitState, requestedState].includes(LIMIT_STATE.ERROR)) {
          LimitIcon = RedExclamationCircleIcon;
        } else if ([limitState, requestedState].includes(LIMIT_STATE.WARN)) {
          LimitIcon = YellowExclamationTriangleIcon;
        }
        setLimitReqState &&
          setLimitReqState({ limit: limitState, requested: requestedState });
      }
    }

    const currentHumanized =
      !hideCurrentHumanized && current ? humanizeValue(current).string : null;

    return (
      <div
        className="co-utilization-card__item-ceph"
        data-test-id="utilization-item"
      >
        <div className="co-utilization-card__item-description-ceph">
          <div className="co-utilization-card__item-section">
            <h4 className="pf-v5-c-title" style={{ marginRight: '20px' }}>
              {title}
            </h4>
            {error || (!isLoading && !utilizationData?.length) ? (
              <div className="text-secondary">{t('Not available')}</div>
            ) : (
              <div className="co-utilization-card__item-section-ceph">
                {LimitIcon && (
                  <LimitIcon className="co-utilization-card__item-icon" />
                )}
                {TopConsumerPopover ? (
                  <TopConsumerPopover
                    current={currentHumanized}
                    limit={
                      latestLimit ? humanizeValue(latestLimit).string : null
                    }
                    requested={
                      latestRequested
                        ? humanizeValue(latestRequested).string
                        : null
                    }
                    available={humanAvailable}
                    total={humanMax}
                    limitState={limitState}
                    requestedState={requestedState}
                  />
                ) : (
                  currentHumanized
                )}
              </div>
            )}
          </div>
          {!error && (humanAvailable || humanMax) && (
            <div className="co-utilization-card__item-section">
              <span
                className="co-utilization-card__item-text"
                data-test="utilization-card-item-text"
              >
                {humanLimit && (
                  <span>
                    {t(
                      '{{humanAvailable}} available of {{humanLimit}} total limit',
                      {
                        humanAvailable,
                        humanLimit,
                      }
                    )}
                  </span>
                )}
                {!humanLimit && humanMax && (
                  <span>
                    {t('{{humanAvailable}} available of {{humanMax}}', {
                      humanAvailable,
                      humanMax,
                    })}
                  </span>
                )}
                {!humanLimit && !humanMax && (
                  <span>
                    {t('{{humanAvailable}} available', {
                      humanAvailable,
                    })}
                  </span>
                )}
              </span>
            </div>
          )}
        </div>
        <div className="co-utilization-card__item-chart">{chart}</div>

        {!!CustomUtilizationSummary && (
          <CustomUtilizationSummary
            currentHumanized={humanizeValue(current).string}
            utilizationData={utilization?.data?.result}
          />
        )}
        {!hideHorizontalBorder && (
          <hr style={{ border: '1px lightgray solid', margin: '0px' }} />
        )}
      </div>
    );
  }
);

UtilizationItem.displayName = 'UtilizationItem';

export type CustomUtilizationSummaryProps = {
  currentHumanized: string;
  utilizationData: PrometheusResult[];
};

type UtilizationItemProps = {
  title: string;
  utilization?: PrometheusResponse;
  limit?: PrometheusResponse;
  requested?: PrometheusResponse;
  isLoading: boolean;
  // Todo(bipuladh): Make humanize type Humanize once unit.js is converted
  humanizeValue: Function;
  query: string | string[];
  error: boolean;
  max?: number;
  byteDataType?: ByteDataTypes;
  TopConsumerPopover?: React.ComponentType<TopConsumerPopoverProps>;
  setLimitReqState?: (state: {
    limit: LIMIT_STATE;
    requested: LIMIT_STATE;
  }) => void;
  chartType?: 'stacked-area' | 'grouped-line';
  description?: string | ((result: PrometheusResult, index: number) => string);
  hideCurrentHumanized?: boolean;
  disableGraphLink?: boolean;
  showLegend?: boolean;
  hideHorizontalBorder?: boolean;
  CustomUtilizationSummary?: React.FC<CustomUtilizationSummaryProps>;
  formatDate?: (date: Date, showSeconds?: boolean) => string;
  showHumanizedInLegend?: boolean;
};
