import * as React from 'react';
import {
  useODFNamespaceSelector,
  useODFSystemFlagsSelector,
} from '@odf/core/redux';
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
import { getName } from '@odf/shared/selectors';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  getInstantVectorStats,
  humanizeBinaryBytes,
  sortInstantVectorStats,
} from '@odf/shared/utils';
import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk';
import { useParams } from 'react-router-dom-v5-compat';
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
import { ODFSystemParams } from '../../../types';
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

const getInitialSortedNs = (
  allResources: K8sResourceCommon[]
): K8sResourceCommon =>
  allResources?.sort((a, b) => getName(a).localeCompare(getName(b)))[0];

export const NamespaceDropdown: React.FC<{
  setPVCNamespace: React.Dispatch<React.SetStateAction<string>>;
}> = ({ setPVCNamespace }) => {
  const { t } = useCustomTranslation();

  const initialSelection = React.useCallback(
    (allResources: K8sResourceCommon[]): K8sResourceCommon => {
      const initialResource = getInitialSortedNs(allResources);
      setPVCNamespace(getName(initialResource));
      return initialResource;
    },
    [setPVCNamespace]
  );

  return (
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
          setPVCNamespace(getName(ns));
        }}
        data-test="odf-capacity-breakdown-card-pvc-namespace-dropdown"
      />
    </div>
  );
};

export const DescriptionText: React.FC = () => {
  const { t } = useCustomTranslation();

  return (
    <div className="odf-capacity-breakdown-card-pvc-description">
      {t('Only showing PVCs that are being mounted on an active pod')}
    </div>
  );
};

export const TitleWithHelp: React.FC = () => {
  const { t } = useCustomTranslation();

  return (
    <>
      {t('Requested capacity')}
      <FieldLevelHelp testId="breakdown-card-helper-text">
        {t(
          'This card shows the requested capacity for different Kubernetes resources. The figures shown represent the usable storage, meaning that data replication is not taken into consideration.'
        )}
      </FieldLevelHelp>
    </>
  );
};

const BreakdownCard: React.FC = () => {
  const { t } = useCustomTranslation();
  const [metricType, setMetricType] = React.useState<
    BreakdownCardFields | BreakdownCardFieldsWithParams
  >(BreakdownCardFields.PROJECTS);
  const [isOpenBreakdownSelect, setBreakdownSelect] = React.useState(false);
  const [pvcNamespace, setPVCNamespace] = React.useState('');

  const { namespace: clusterNs } = useParams<ODFSystemParams>();
  const { systemFlags } = useODFSystemFlagsSelector();

  // name of the created StorageClasses are prefix by StorageCluster name,
  // it is also the value of the "managedBy" label in the metrics.
  const ocsCluster = systemFlags[clusterNs]?.ocsClusterName;

  const { queries, model, metric } = getBreakdownMetricsQuery(
    metricType,
    ocsCluster,
    pvcNamespace,
    false,
    ocsCluster
  );

  const { odfNamespace } = useODFNamespaceSelector();

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
    query: CEPH_CAPACITY_BREAKDOWN_QUERIES(ocsCluster, ocsCluster)[
      StorageDashboardQuery.CEPH_CAPACITY_USED
    ],
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
          <TitleWithHelp />
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
        <NamespaceDropdown setPVCNamespace={setPVCNamespace} />
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
          odfNamespace={odfNamespace}
        />
        {metricType === BreakdownCardFieldsWithParams.PVCS &&
          !queriesLoadError &&
          top5MetricsStats.length > 0 &&
          cephUsed && <DescriptionText />}
      </CardBody>
    </Card>
  );
};

export default BreakdownCard;
