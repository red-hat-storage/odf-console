import * as React from 'react';
import { namespaceResource } from '@odf/core/resources';
import { BreakdownCardBody } from '@odf/shared/dashboards/breakdown-card/breakdown-body';
import { getSelectOptions } from '@odf/shared/dashboards/breakdown-card/breakdown-dropdown';
import ResourceDropdown from '@odf/shared/dropdown/ResourceDropdown';
import { FieldLevelHelp } from '@odf/shared/generic/FieldLevelHelp';
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
  getInstantVectorStats,
  humanizeBinaryBytes,
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
import {
  getBreakdownMetricsQuery,
  CEPH_CAPACITY_BREAKDOWN_QUERIES,
  StorageDashboardQuery,
} from '../../../queries/ceph-storage';
import { getStackChartStats } from '../../../utils/metrics';
import './capacity-breakdown-card.scss';

const modelByUsedQueryMap = {
  [BreakdownCardFields.PROJECTS]: StorageDashboardQuery.PROJECTS_BY_USED,
  [BreakdownCardFields.PODS]: StorageDashboardQuery.PODS_BY_USED,
  [BreakdownCardFields.STORAGE_CLASSES]:
    StorageDashboardQuery.STORAGE_CLASSES_BY_USED,
  [BreakdownCardFieldsWithParams.PVCS]:
    StorageDashboardQuery.PVC_NAMESPACES_BY_USED,
};

const modelByTotalQueryMap = {
  [BreakdownCardFields.PROJECTS]: StorageDashboardQuery.PROJECTS_TOTAL_USED,
  [BreakdownCardFields.PODS]: StorageDashboardQuery.PODS_TOTAL_USED,
  [BreakdownCardFields.STORAGE_CLASSES]:
    StorageDashboardQuery.STORAGE_CLASSES_TOTAL_USED,
  [BreakdownCardFieldsWithParams.PVCS]:
    StorageDashboardQuery.PVC_NAMESPACES_TOTAL_USED,
};

const BreakdownCard: React.FC = () => {
  const { t } = useCustomTranslation();
  const [metricType, setMetricType] = React.useState<
    BreakdownCardFields | BreakdownCardFieldsWithParams
  >(BreakdownCardFields.PROJECTS);
  const [isOpenBreakdownSelect, setBreakdownSelect] = React.useState(false);
  const [pvcNamespace, setPVCNamespace] = React.useState('');

  const initialSelection = React.useCallback(
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

  const [modelByUsed, modelUsedError, modelUsedLoading] =
    useCustomPrometheusPoll({
      query: queries[modelByUsedQueryMap[metricType]],
      endpoint: 'api/v1/query' as any,
      basePath: usePrometheusBasePath(),
    });
  const [modelTotalUsed, modelTotalError, modalTotalLoading] =
    useCustomPrometheusPoll({
      query: queries[modelByTotalQueryMap[metricType]],
      endpoint: 'api/v1/query' as any,
      basePath: usePrometheusBasePath(),
    });
  const [cephUsedMetric, cephError, cephLoading] = useCustomPrometheusPoll({
    query:
      CEPH_CAPACITY_BREAKDOWN_QUERIES[StorageDashboardQuery.CEPH_CAPACITY_USED],
    endpoint: 'api/v1/query' as any,
    basePath: usePrometheusBasePath(),
  });

  const queriesLoadError = modelUsedError || modelTotalError || cephError;
  const dataLoaded = !modelUsedLoading && !modalTotalLoading && !cephLoading;

  const humanize = humanizeBinaryBytes;
  const top6MetricsData = getInstantVectorStats(modelByUsed, metric);
  const top5SortedMetricsData = sortInstantVectorStats(top6MetricsData);
  const top5MetricsStats = getStackChartStats(top5SortedMetricsData, humanize);
  const metricTotal: string = modelTotalUsed?.data?.result?.[0]?.value?.[1];
  const cephUsed: string = cephUsedMetric?.data?.result?.[0]?.value?.[1];

  const handleMetricsChange: SelectProps['onSelect'] = (_e, breakdown) => {
    setMetricType(breakdown as any);
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
            initialSelection={initialSelection}
            onSelect={(ns) => {
              setPVCNamespace(ns?.metadata.name);
            }}
            data-test="odf-capacity-breakdown-card-pvc-namespace-dropdown"
          />
        </div>
      )}
      <CardBody className="ceph-capacity-breakdown-card__body">
        <BreakdownCardBody
          isLoading={!dataLoaded}
          hasLoadError={queriesLoadError}
          metricTotal={metricTotal}
          top5MetricsStats={top5MetricsStats}
          capacityUsed={cephUsed}
          metricModel={model}
          humanize={humanize}
          isPersistentInternal={true}
        />
      </CardBody>
      {metricType === BreakdownCardFieldsWithParams.PVCS &&
        !queriesLoadError &&
        top5MetricsStats.length > 0 &&
        cephUsed && (
          <CardBody className="odf-capacity-breakdown-card-pvc-description">
            {t('Only showing PVCs that are being mounted on an active pod')}
          </CardBody>
        )}
    </Card>
  );
};

export default BreakdownCard;
