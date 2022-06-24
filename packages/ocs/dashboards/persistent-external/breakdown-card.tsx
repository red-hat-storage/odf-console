import * as React from 'react';
import { BreakdownCardBody } from '@odf/shared/dashboards/breakdown-card/breakdown-body';
import { getSelectOptions } from '@odf/shared/dashboards/breakdown-card/breakdown-dropdown';
import {
  useCustomPrometheusPoll,
  usePrometheusBasePath,
} from '@odf/shared/hooks/custom-prometheus-poll';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  humanizeBinaryBytes,
  getInstantVectorStats,
  sortInstantVectorStats,
} from '@odf/shared/utils';
import {
  Select,
  SelectProps,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
} from '@patternfly/react-core';
import { PROJECTS, STORAGE_CLASSES, PODS } from '../../constants';
import { breakdownIndependentQueryMap } from '../../queries';
import { getStackChartStats } from '../../utils/metrics';
import '../persistent-internal/capacity-breakdown-card/capacity-breakdown-card.scss';

export const BreakdownCard: React.FC = () => {
  const { t } = useCustomTranslation();
  const [metricType, setMetricType] = React.useState(PROJECTS);
  const [isOpenBreakdownSelect, setBreakdownSelect] = React.useState(false);
  const { queries, model, metric } = breakdownIndependentQueryMap[metricType];
  const queryKeys = Object.keys(queries);

  const [byUsed, byUsedError, byUsedLoading] = useCustomPrometheusPoll({
    endpoint: 'api/v1/query' as any,
    query: queries[queryKeys[0]],
    basePath: usePrometheusBasePath(),
  });
  const [totalUsed, totalUsedError, totalUsedLoading] = useCustomPrometheusPoll(
    {
      endpoint: 'api/v1/query' as any,
      query: queries[queryKeys[1]],
      basePath: usePrometheusBasePath(),
    }
  );

  const queriesLoadError = byUsedError || totalUsedError;
  const queriesDataLoaded = !byUsedLoading && !totalUsedLoading;

  const humanize = humanizeBinaryBytes;
  const top6MetricsData = getInstantVectorStats(byUsed, metric);
  const top5SortedMetricsData = sortInstantVectorStats(top6MetricsData);
  const top5MetricsStats = getStackChartStats(top5SortedMetricsData, humanize);
  const metricTotal = totalUsed?.data?.result[0]?.value[1];

  const handleMetricsChange: SelectProps['onSelect'] = (_e, breakdown) => {
    setMetricType(breakdown as string);
    setBreakdownSelect(!isOpenBreakdownSelect);
  };

  const dropdownOptions = [
    {
      name: t('Projects'),
      id: PROJECTS,
    },
    {
      name: t('Storage Classes'),
      id: STORAGE_CLASSES,
    },
    {
      name: t('Pods'),
      id: PODS,
    },
  ];

  const breakdownSelectItems = getSelectOptions(dropdownOptions);

  return (
    <Card>
      <CardHeader className="ceph-capacity-breakdown-card__header">
        <CardTitle>{t('Capacity breakdown')}</CardTitle>
        <Select
          className="ceph-capacity-breakdown-card-header__dropdown"
          autoFocus={false}
          onSelect={handleMetricsChange}
          onToggle={() => setBreakdownSelect(!isOpenBreakdownSelect)}
          isOpen={isOpenBreakdownSelect}
          selections={[t('{{metricType}}', { metricType })]}
          placeholderText={t('{{metricType}}', { metricType })}
          aria-label={t('Break by dropdown')}
          isCheckboxSelectionBadgeHidden
        >
          {breakdownSelectItems}
        </Select>
      </CardHeader>
      <CardBody className="ceph-capacity-breakdown-card__body">
        <BreakdownCardBody
          isLoading={queriesDataLoaded}
          hasLoadError={queriesLoadError}
          metricTotal={metricTotal}
          capacityUsed={metricTotal}
          top5MetricsStats={top5MetricsStats}
          metricModel={model}
          humanize={humanize}
        />
      </CardBody>
    </Card>
  );
};

export default BreakdownCard;
