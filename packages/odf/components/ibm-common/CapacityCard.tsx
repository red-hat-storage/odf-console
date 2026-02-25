import * as React from 'react';
import {
  getBreakdownByStorageClass,
  ScaleDashboardQuery,
} from '@odf/core/queries';
import { filesystemResource, scResource } from '@odf/core/resources';
import { FileSystemKind } from '@odf/core/types/scale';
import { getStackChartStats } from '@odf/ocs/utils';
import {
  BreakdownCardBody,
  getName,
  getSelectOptions,
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
import * as _ from 'lodash-es';
import { useLocation } from 'react-router-dom-v5-compat';
import {
  MenuToggle,
  MenuToggleElement,
  Select,
  SelectList,
  SelectProps,
} from '@patternfly/react-core';
import { Card, CardBody, CardHeader, CardTitle } from '@patternfly/react-core';
import './CapacityCard.scss';

export const CapacityCard: React.FC = () => {
  const location = useLocation();
  const pathName = location.pathname;
  return (
    <CapacityCardInternal
      useRemoteFileSystems={!pathName.toLowerCase().includes('san')}
    />
  );
};

type CapacityCardInternalProps = {
  useRemoteFileSystems: boolean;
};

const filterScaleStorageClasses = (
  storageClasses: StorageClassResourceKind[],
  fileSystems: FileSystemKind[]
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
  fileSystems: FileSystemKind[]
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
    useK8sWatchResource<FileSystemKind[]>(filesystemResource);

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
    id: getName(sc),
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
      {storageClassName}
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
            selected={storageClassName}
            onSelect={handleMetricsChange}
            isOpen={isOpenBreakdownSelect}
            toggle={toggle}
            shouldFocusToggleOnSelect
            popperProps={{ width: 'trigger' }}
            onOpenChange={(isOpen) => setBreakdownSelect(isOpen)}
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
