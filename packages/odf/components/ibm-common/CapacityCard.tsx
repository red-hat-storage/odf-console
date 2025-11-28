import * as React from 'react';
import {
  getBreakdownByStorageClass,
  ScaleDashboardQuery,
} from '@odf/core/queries';
import { filesystemResource, scResource } from '@odf/core/resources';
import { FilesystemKind } from '@odf/core/types/scale';
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
import { Select, SelectProps } from '@patternfly/react-core/deprecated';
import * as _ from 'lodash-es';
import { useLocation } from 'react-router-dom-v5-compat';
import { Card, CardBody, CardHeader, CardTitle } from '@patternfly/react-core';
import './CapacityCard.scss';

export const CapacityCard: React.FC = () => {
  const location = useLocation();
  const pathName = location.pathname;
  return (
    <CapacityCardInternal useRemoteFileSystems={pathName.includes('san')} />
  );
};

type CapacityCardInternalProps = {
  useRemoteFileSystems: boolean;
};

const filterScaleStorageClasses = (
  storageClasses: StorageClassResourceKind[],
  fileSystems: FilesystemKind[]
): StorageClassResourceKind[] => {
  const remoteFileSystems = fileSystems.filter(
    (fs) => fs.spec.remote && !_.isEmpty(fs.spec.remote)
  );
  const remoteFileSystemsName = remoteFileSystems.map((fs) => getName(fs));
  const scaleStorageClasses = storageClasses.filter((sc) =>
    remoteFileSystemsName.includes(getName(sc))
  );
  return scaleStorageClasses;
};

const filterSANStorageClasses = (
  storageClasses: StorageClassResourceKind[],
  fileSystems: FilesystemKind[]
): StorageClassResourceKind[] => {
  const localFileSystems = fileSystems.filter(
    (fs) => fs.spec.local && _.isEmpty(fs.spec.remote)
  );
  const localFileSystemsNames = localFileSystems.map((fs) => getName(fs));
  const scaleStorageClasses = storageClasses.filter((sc) =>
    localFileSystemsNames.includes(getName(sc))
  );
  return scaleStorageClasses;
};

export const CapacityCardInternal: React.FC<CapacityCardInternalProps> = ({
  useRemoteFileSystems,
}) => {
  const { t } = useCustomTranslation();
  const [storageClassName, setStorageClassName] = React.useState('');
  const [isOpenBreakdownSelect, setBreakdownSelect] = React.useState(false);

  const [fileSystems, fileSystemsLoaded, fileSystemsError] =
    useK8sWatchResource<FilesystemKind[]>(filesystemResource);

  const [storageClasses, storageClassesLoaded, storageClassesError] =
    useK8sWatchResource<StorageClassResourceKind[]>(scResource);

  const filteredStorageClasses = React.useMemo(() => {
    if (
      storageClassesLoaded &&
      !storageClassesError &&
      fileSystemsLoaded &&
      !fileSystemsError
    ) {
      return useRemoteFileSystems
        ? filterScaleStorageClasses(storageClasses, fileSystems)
        : filterSANStorageClasses(storageClasses, fileSystems);
    }
    return [];
  }, [
    storageClasses,
    storageClassesLoaded,
    storageClassesError,
    fileSystems,
    fileSystemsLoaded,
    fileSystemsError,
    useRemoteFileSystems,
  ]);

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

  React.useEffect(() => {
    if (filteredStorageClasses.length > 0 && !storageClassName) {
      setStorageClassName(getName(filteredStorageClasses[0]));
    }
  }, [filteredStorageClasses, storageClassName]);

  const dropdownOptions = filteredStorageClasses.map((sc) => ({
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

  return (
    <Card>
      <CardHeader>
        <div className="scale-capacity-breakdown-card__header">
          <CardTitle id="breakdown-card-title">
            {t('Requested Capacity - Namespace (5)')}
          </CardTitle>
          <Select
            className="scale-capacity-breakdown-card-header__dropdown"
            autoFocus={false}
            onSelect={handleMetricsChange}
            onToggle={() => setBreakdownSelect(!isOpenBreakdownSelect)}
            isOpen={isOpenBreakdownSelect}
            selections={[storageClassName]}
            placeholderText={storageClassName}
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
          metricModel={NamespaceModel}
          humanize={humanize}
          isPersistentInternal={true}
        />
      </CardBody>
    </Card>
  );
};

export default CapacityCard;
