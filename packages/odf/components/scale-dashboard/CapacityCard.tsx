import * as React from 'react';
import {
  getBreakdownMetricsQuery,
  ScaleDashboardQuery,
} from '@odf/core/queries';
import { getStackChartStats } from '@odf/ocs/utils';
import {
  BreakdownCardBody,
  BreakdownCardFields,
  getSelectOptions,
} from '@odf/shared';
import {
  useCustomPrometheusPoll,
  usePrometheusBasePath,
} from '@odf/shared/hooks/custom-prometheus-poll';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  getInstantVectorStats,
  humanizeBinaryBytes,
  sortInstantVectorStats,
} from '@odf/shared/utils';
import { Select, SelectProps } from '@patternfly/react-core/deprecated';
import { Card, CardBody, CardHeader, CardTitle } from '@patternfly/react-core';
import './CapacityCard.scss';

export const CapacityCard: React.FC<{}> = () => {
  const { t } = useCustomTranslation();
  const [metricType, setMetricType] = React.useState<BreakdownCardFields>(
    BreakdownCardFields.PROJECTS
  );
  const [isOpenBreakdownSelect, setBreakdownSelect] = React.useState(false);

  const { queries, metric, model } = getBreakdownMetricsQuery(metricType);
  const [modelByUsed, modelUsedError, modelUsedLoading] =
    useCustomPrometheusPoll({
      query: queries[ScaleDashboardQuery.BY_USED],
      endpoint: 'api/v1/query' as any,
      basePath: usePrometheusBasePath(),
    });
  const [modelTotalUsed, modelTotalError, modalTotalLoading] =
    useCustomPrometheusPoll({
      query: queries[ScaleDashboardQuery.TOTAL_USED],
      endpoint: 'api/v1/query' as any,
      basePath: usePrometheusBasePath(),
    });

  const dropdownOptions = [
    {
      name: t('Namespaces'),
      id: BreakdownCardFields.PROJECTS,
    },
    {
      name: t('Storage Classes'),
      id: BreakdownCardFields.STORAGE_CLASSES,
    },
  ];
  const breakdownSelectItems = getSelectOptions(dropdownOptions);

  const queriesLoadError = modelUsedError || modelTotalError;
  const dataLoaded = !modelUsedLoading && !modalTotalLoading;

  const humanize = humanizeBinaryBytes;
  const top6MetricsData = getInstantVectorStats(modelByUsed, metric);
  const top5SortedMetricsData = sortInstantVectorStats(top6MetricsData);
  const top5MetricsStats = getStackChartStats(top5SortedMetricsData, humanize);
  const metricTotal: string = modelTotalUsed?.data?.result?.[0]?.value?.[1];

  const handleMetricsChange: SelectProps['onSelect'] = (_e, breakdown) => {
    setMetricType(breakdown as any);
    setBreakdownSelect(!isOpenBreakdownSelect);
  };

  return (
    <Card>
      <CardHeader>
        <div className="scale-capacity-breakdown-card__header">
          <CardTitle id="breakdown-card-title">
            {t('Requested Capacity')}
          </CardTitle>
          <Select
            className="scale-capacity-breakdown-card-header__dropdown"
            autoFocus={false}
            onSelect={handleMetricsChange}
            onToggle={() => setBreakdownSelect(!isOpenBreakdownSelect)}
            isOpen={isOpenBreakdownSelect}
            selections={[metricType]}
            placeholderText={t('{{metricType}}', {
              metricType,
            })}
            aria-label={t('Break By Dropdown')}
            isCheckboxSelectionBadgeHidden
            id="breakdown-card-metrics-dropdown"
          >
            {breakdownSelectItems}
          </Select>
        </div>
      </CardHeader>
      <CardBody>
        <BreakdownCardBody
          capacityUsed={metricTotal}
          isLoading={!dataLoaded}
          hasLoadError={queriesLoadError}
          metricTotal={metricTotal}
          top5MetricsStats={top5MetricsStats}
          metricModel={model}
          humanize={humanize}
          isPersistentInternal={true}
        />
      </CardBody>
    </Card>
  );
};

export default CapacityCard;
