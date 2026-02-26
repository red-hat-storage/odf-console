import * as React from 'react';
import { AreaChart } from '@odf/shared/dashboards/utilization-card/area-chart';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { DataPoint } from '@odf/shared/utils';
import { Humanize } from '@openshift-console/dynamic-plugin-sdk';
import classNames from 'classnames';

export const MultilineUtilizationItem: React.FC<MultilineUtilizationItemProps> =
  React.memo(
    ({
      title,
      data,
      humanizeValue,
      isLoading = false,
      queries,
      error,
      chartType,
      className = '',
    }) => {
      const { t } = useCustomTranslation();
      const currentValue =
        data.length > 1 && data[0].length && data[1].length
          ? humanizeValue(
              data[0][data[0].length - 1].y + data[1][data[1].length - 1].y
            ).string
          : '';
      const chart = (
        <AreaChart
          data={error ? [[]] : data}
          loading={!error && isLoading}
          query={queries.map((q) => q.query)}
          humanize={humanizeValue}
          ariaChartLinkLabel={t('View {{title}} metrics in query browser', {
            title,
          })}
          ariaChartTitle={title}
          chartType={chartType}
        />
      );

      return (
        <div
          className={classNames('co-utilization-card__item-ceph', className)}
          data-test-id="utilization-item"
        >
          <div className="co-utilization-card__item-description-ceph">
            <div className="co-utilization-card__item-section-multiline">
              <h4 className="pf-v6-c-title" data-test="utilization-item-title">
                {title}
              </h4>
              {error ||
              (!isLoading &&
                !(data.length && data.some((datum) => datum.length))) ? (
                <div className="text-secondary co-utilization-card__item-description-ceph-sub">
                  {t('Not available')}
                </div>
              ) : (
                <div className="co-utilization-card__item-description-ceph-sub">
                  {currentValue}
                </div>
              )}
            </div>
          </div>
          <div className="co-utilization-card__item-chart">{chart}</div>
          <hr style={{ border: '1px lightgray solid', margin: '0px' }} />
        </div>
      );
    }
  );

MultilineUtilizationItem.displayName = 'MultilineUtilizationItem';

type QueryWithDescription = {
  query: string;
  desc: string;
};

type MultilineUtilizationItemProps = {
  className?: string;
  title: string;
  data?: DataPoint[][];
  isLoading: boolean;
  humanizeValue: Humanize;
  queries: QueryWithDescription[];
  error: boolean;
  chartType?: 'stacked-area' | 'grouped-line';
};
