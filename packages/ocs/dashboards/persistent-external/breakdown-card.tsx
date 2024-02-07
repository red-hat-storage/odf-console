import * as React from 'react';
import {
  useODFNamespaceSelector,
  useODFSystemFlagsSelector,
} from '@odf/core/redux';
import { BreakdownCardBody } from '@odf/shared/dashboards/breakdown-card/breakdown-body';
import { getSelectOptions } from '@odf/shared/dashboards/breakdown-card/breakdown-dropdown';
import {
  useCustomPrometheusPoll,
  usePrometheusBasePath,
} from '@odf/shared/hooks/custom-prometheus-poll';
import {
  BreakdownCardFields,
  BreakdownCardFieldsWithParams,
} from '@odf/shared/queries';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  humanizeBinaryBytes,
  getInstantVectorStats,
  sortInstantVectorStats,
} from '@odf/shared/utils';
import { useParams } from 'react-router-dom-v5-compat';
import {
  Select,
  SelectProps,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
} from '@patternfly/react-core';
import { getBreakdownMetricsQuery } from '../../queries';
import { ODFSystemParams } from '../../types';
import { getStackChartStats } from '../../utils/metrics';
import {
  NamespaceDropdown,
  DescriptionText,
  TitleWithHelp,
} from '../persistent-internal/capacity-breakdown-card/capacity-breakdown-card';
import '../persistent-internal/capacity-breakdown-card/capacity-breakdown-card.scss';
import useClientFallback from './fallback-hook';

export const BreakdownCard: React.FC = () => {
  const { t } = useCustomTranslation();
  const [metricType, setMetricType] = React.useState<
    BreakdownCardFields | BreakdownCardFieldsWithParams
  >(BreakdownCardFields.PROJECTS);
  const [isOpenBreakdownSelect, setBreakdownSelect] = React.useState(false);
  const [pvcNamespace, setPVCNamespace] = React.useState('');

  const { namespace: clusterNs } = useParams<ODFSystemParams>();
  const { odfNamespace } = useODFNamespaceSelector();
  const { systemFlags } = useODFSystemFlagsSelector();

  // name of created StorageClasses are prefix by StorageCluster name
  const storageClassName = systemFlags?.[clusterNs]?.ocsClusterName;
  const storageClassNamePrefix = useClientFallback(storageClassName);

  const { queries, model, metric } = getBreakdownMetricsQuery(
    metricType,
    storageClassNamePrefix,
    pvcNamespace,
    true
  );
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
    setMetricType(breakdown as BreakdownCardFields);
    setBreakdownSelect(!isOpenBreakdownSelect);
  };

  const dropdownOptions = [
    {
      name: t('Projects'),
      id: BreakdownCardFields.PROJECTS,
    },
    {
      name: t('Storage Classes'),
      id: BreakdownCardFields.STORAGE_CLASSES,
    },
    {
      name: t('Pods'),
      id: BreakdownCardFields.PODS,
    },
    {
      name: t('PersistentVolumeClaims'),
      id: BreakdownCardFieldsWithParams.PVCS,
    },
  ];

  const breakdownSelectItems = getSelectOptions(dropdownOptions);

  return (
    <Card>
      <CardHeader className="ceph-capacity-breakdown-card__header">
        <CardTitle>
          <TitleWithHelp />
        </CardTitle>
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
      {metricType === BreakdownCardFieldsWithParams.PVCS && (
        <NamespaceDropdown setPVCNamespace={setPVCNamespace} />
      )}
      <CardBody className="ceph-capacity-breakdown-card__body">
        <BreakdownCardBody
          isLoading={!queriesDataLoaded}
          hasLoadError={queriesLoadError}
          metricTotal={metricTotal}
          capacityUsed={metricTotal}
          top5MetricsStats={top5MetricsStats}
          metricModel={model}
          humanize={humanize}
          odfNamespace={odfNamespace}
        />
        {metricType === BreakdownCardFieldsWithParams.PVCS &&
          !queriesLoadError &&
          top5MetricsStats.length > 0 && <DescriptionText />}
      </CardBody>
    </Card>
  );
};

export default BreakdownCard;
