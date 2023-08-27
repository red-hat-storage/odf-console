import * as React from 'react';
import { namespaceResource } from '@odf/core/resources';
import { BreakdownCardBody } from '@odf/shared/dashboards/breakdown-card/breakdown-body';
import { getSelectOptions } from '@odf/shared/dashboards/breakdown-card/breakdown-dropdown';
import { ResourceDropdown } from '@odf/shared/dropdown';
import { FieldLevelHelp } from '@odf/shared/generic';
import {
  useCustomPrometheusPoll,
  usePrometheusBasePath,
} from '@odf/shared/hooks/custom-prometheus-poll';
import { NamespaceModel } from '@odf/shared/models';
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
import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk';
import {
  Select,
  SelectProps,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
} from '@patternfly/react-core';
import { getBreakdownMetricsQuery } from '../../queries';
import { getStackChartStats } from '../../utils/metrics';
import '../breakdown-card.scss';

export const BreakdownCard: React.FC = () => {
  const { t } = useCustomTranslation();
  const [metricType, setMetricType] = React.useState<
    BreakdownCardFields | BreakdownCardFieldsWithParams
  >(BreakdownCardFields.PROJECTS);
  const [isOpenBreakdownSelect, setBreakdownSelect] = React.useState(false);
  const [pvcNamespace, setPVCNamespace] = React.useState('');

  const initialSelectedPVC = React.useCallback(
    (allNamespace: K8sResourceCommon[]): K8sResourceCommon => {
      const initialResource = allNamespace?.sort((a, b) =>
        a.metadata.name.localeCompare(b.metadata.name)
      )[0];
      setPVCNamespace(initialResource?.metadata.name || '');
      return initialResource;
    },
    []
  );

  const { queries, model, metric } = React.useMemo(
    () => getBreakdownMetricsQuery(metricType, pvcNamespace),
    [metricType, pvcNamespace]
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
        <CardTitle id="breakdown-card-title">
          {t('Requested capacity')}
          <FieldLevelHelp testId="breakdown-card-helper-text">
            {t(
              'This card shows the used capacity for different Kubernetes resources. The figures shown represent the Usable storage, meaning that data replication is not taken into consideration.'
            )}
          </FieldLevelHelp>
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
          id="breakdown-card-metrics-dropdown"
        >
          {breakdownSelectItems}
        </Select>
      </CardHeader>
      {metricType === BreakdownCardFieldsWithParams.PVCS && (
        <div className="odf-capacity-breakdown-card-pvc-namespace__header">
          <div
            id="odf-capacity-breakdown-card-pvc-namespace-title"
            className="odf-capacity-breakdown-card-pvc-namespace__title"
          >
            {t('Select a namespace:')}
          </div>
          <ResourceDropdown<K8sResourceCommon>
            className="odf-capacity-breakdown-card-pvc-namespace__dropdown"
            resource={namespaceResource}
            resourceModel={NamespaceModel}
            initialSelection={initialSelectedPVC}
            onSelect={(ns) => {
              setPVCNamespace(ns?.metadata.name);
            }}
            data-test="odf-capacity-breakdown-card-pvc-namespace-dropdown"
          />
        </div>
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
          isPersistentInternal={true}
        />
      </CardBody>
      {metricType === BreakdownCardFieldsWithParams.PVCS &&
        !queriesLoadError &&
        top5MetricsStats.length > 0 && (
          <CardBody className="odf-capacity-breakdown-card-pvc-description">
            {t('Only showing PVCs that are being mounted on an active pod')}
          </CardBody>
        )}
    </Card>
  );
};

export default BreakdownCard;
