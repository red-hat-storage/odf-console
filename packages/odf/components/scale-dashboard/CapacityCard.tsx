import * as React from 'react';
import { SCALE_PROVISIONER } from '@odf/core/constants';
import {
  getBreakdownByStorageClass,
  ScaleDashboardQuery,
} from '@odf/core/queries';
import { scResource } from '@odf/core/resources';
import { getStackChartStats } from '@odf/ocs/utils';
import {
  BreakdownCardBody,
  getName,
  getSelectOptions,
  getUID,
  StorageClassResourceKind,
  NamespaceModel,
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
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';
import {
  MenuToggle,
  MenuToggleElement,
  Select,
  SelectList,
  SelectProps,
} from '@patternfly/react-core';
import { Card, CardBody, CardHeader, CardTitle } from '@patternfly/react-core';
import './CapacityCard.scss';

export const CapacityCard: React.FC<{}> = () => {
  const { t } = useCustomTranslation();
  const [storageClassName, setStorageClassName] = React.useState('');
  const [isOpenBreakdownSelect, setBreakdownSelect] = React.useState(false);

  const {
    [ScaleDashboardQuery.BY_USED]: queryByUsed,
    [ScaleDashboardQuery.TOTAL_USED]: queryTotalUsed,
  } = getBreakdownByStorageClass(storageClassName);
  const [modelByUsed, modelUsedError, modelUsedLoading] =
    useCustomPrometheusPoll({
      query: queryByUsed,
      endpoint: 'api/v1/query' as any,
      basePath: usePrometheusBasePath(),
    });
  const [modelTotalUsed, modelTotalError, modalTotalLoading] =
    useCustomPrometheusPoll({
      query: queryTotalUsed,
      endpoint: 'api/v1/query' as any,
      basePath: usePrometheusBasePath(),
    });

  const [storageClasses, storageClassesLoaded, storageClassesError] =
    useK8sWatchResource<StorageClassResourceKind[]>(scResource);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const scaleStorageClasses =
    storageClassesLoaded && !storageClassesError
      ? storageClasses?.filter((sc) => sc.provisioner === SCALE_PROVISIONER)
      : [];

  React.useEffect(() => {
    if (scaleStorageClasses.length > 0 && !storageClassName) {
      setStorageClassName(getName(scaleStorageClasses[0]));
    }
  }, [scaleStorageClasses, storageClassName]);

  const dropdownOptions = scaleStorageClasses.map((sc) => ({
    name: getName(sc),
    id: getUID(sc),
  }));

  const breakdownSelectItems = getSelectOptions(dropdownOptions);

  const queriesLoadError = modelUsedError || modelTotalError;
  const dataLoaded = !modelUsedLoading && !modalTotalLoading;

  const humanize = humanizeBinaryBytes;
  const top6MetricsData = getInstantVectorStats(modelByUsed, 'namespace');
  const top5SortedMetricsData = sortInstantVectorStats(top6MetricsData);
  const top5MetricsStats = getStackChartStats(top5SortedMetricsData, humanize);
  const metricTotal: string = modelTotalUsed?.data?.result?.[0]?.value?.[1];

  const handleMetricsChange: SelectProps['onSelect'] = (
    _e,
    storageClassNameSelection
  ) => {
    setStorageClassName(storageClassNameSelection as any);
    setBreakdownSelect(!isOpenBreakdownSelect);
  };

  const onToggleClick = () => {
    setBreakdownSelect(!isOpenBreakdownSelect);
  };

  const toggle = (toggleRef: React.Ref<MenuToggleElement>) => (
    <MenuToggle
      ref={toggleRef}
      onClick={onToggleClick}
      isExpanded={isOpenBreakdownSelect}
      className="scale-capacity-breakdown-card-header__dropdown"
      aria-label={t('Break By Dropdown')}
      isFullWidth
    >
      {t('{{metricType}}', {
        storageClassName,
      })}
    </MenuToggle>
  );

  return (
    <Card>
      <CardHeader>
        <div className="scale-capacity-breakdown-card__header">
          <CardTitle id="breakdown-card-title">
            {t('Requested Capacity - Namespace (5)')}
          </CardTitle>
          <Select
            id="breakdown-card-metrics-dropdown"
            isOpen={isOpenBreakdownSelect}
            selected={storageClassName}
            onSelect={handleMetricsChange}
            onOpenChange={(isOpen) => setBreakdownSelect(isOpen)}
            toggle={toggle}
            shouldFocusToggleOnSelect
            popperProps={{ width: 'trigger' }}
          >
            <SelectList>{breakdownSelectItems}</SelectList>
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
          metricModel={NamespaceModel}
          humanize={humanize}
          isPersistentInternal={true}
        />
      </CardBody>
    </Card>
  );
};

export default CapacityCard;
