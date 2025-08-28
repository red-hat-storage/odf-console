import * as React from 'react';
import { Humanize } from '@openshift-console/dynamic-plugin-sdk';
import { K8sKind } from '@openshift-console/dynamic-plugin-sdk/lib/api/common-types';
import { Grid, GridItem } from '@patternfly/react-core';
import { useCustomTranslation } from '../../useCustomTranslationHook';
import { TotalCapacityBody } from './breakdown-capacity';
import { BreakdownChart, LabelPadding } from './breakdown-chart';
import { BreakdownChartLoading } from './breakdown-loading';
import { addAvailable, StackDataPoint, getLegends } from './utils';

export const BreakdownCardBody: React.FC<BreakdownBodyProps> = ({
  top5MetricsStats,
  metricTotal,
  capacityUsed,
  capacityAvailable,
  metricModel,
  humanize,
  isLoading,
  hasLoadError,
  ocsVersion = '',
  labelPadding,
  isPersistentInternal,
  odfNamespace,
}) => {
  const { t } = useCustomTranslation();

  if (isLoading && !hasLoadError) {
    return <BreakdownChartLoading />;
  }
  if (!capacityUsed || !top5MetricsStats.length || hasLoadError) {
    return (
      <div className="text-secondary capacity-breakdown-card--error">
        {t('Not available')}
      </div>
    );
  }
  if (capacityUsed === '0') {
    return (
      <div className="text-secondary capacity-breakdown-card--error">
        {t('Not enough usage data')}
      </div>
    );
  }

  const chartData = addAvailable(
    top5MetricsStats,
    capacityAvailable,
    metricTotal,
    humanize,
    t
  );

  const legends = getLegends(chartData);

  // Removes Legend for available
  if (capacityAvailable) {
    legends.pop();
  }

  return (
    <Grid>
      <GridItem span={4}>
        <TotalCapacityBody
          {...(isPersistentInternal ? { prefix: t('Total requests: ') } : {})}
          capacity={humanize(metricTotal).string}
          {...(!isPersistentInternal ? { suffix: t('used') } : {})}
          styleCapacityAsBold={isPersistentInternal}
        />
      </GridItem>
      <GridItem span={4} />
      <GridItem span={4}>
        {capacityAvailable && (
          <TotalCapacityBody
            capacity={humanize(capacityAvailable).string}
            {...(!isPersistentInternal ? { suffix: t('available') } : {})}
            className="capacity-breakdown-card__available-body text-secondary"
          />
        )}
      </GridItem>
      <GridItem span={12}>
        <BreakdownChart
          data={chartData}
          legends={legends}
          metricModel={metricModel}
          ocsVersion={ocsVersion}
          labelPadding={labelPadding}
          odfNamespace={odfNamespace}
        />
      </GridItem>
    </Grid>
  );
};

export type BreakdownBodyProps = {
  isLoading: boolean;
  hasLoadError: boolean;
  metricTotal: string;
  top5MetricsStats: StackDataPoint[];
  capacityUsed?: string;
  capacityAvailable?: string;
  metricModel: K8sKind;
  humanize: Humanize;
  ocsVersion?: string;
  labelPadding?: LabelPadding;
  isPersistentInternal?: boolean;
  odfNamespace?: string;
};
