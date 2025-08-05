import * as React from 'react';
import { LSO_OPERATOR } from '@odf/core/constants';
import { FDF_FLAG } from '@odf/core/redux';
import { isCapacityAutoScalingAllowed } from '@odf/core/utils';
import {
  OCSDashboardContext,
  OCSDashboardDispatchContext,
  useOCSDashboardContextSetter,
} from '@odf/ocs/dashboards/ocs-dashboard-providers';
import OCSSystemDashboard from '@odf/ocs/dashboards/ocs-system-dashboard';
import {
  CustomKebabItem,
  DEFAULT_INFRASTRUCTURE,
  getName,
  getNamespace,
  InfrastructureKind,
  InfrastructureModel,
  Kebab,
  PageHeading,
  RHCS_SUPPORTED_INFRA,
  StorageClusterKind,
  StorageClusterModel,
  useCustomTranslation,
  useFetchCsv,
  useK8sGet,
} from '@odf/shared';
import {
  getInfrastructurePlatform,
  isCSVSucceeded,
  referenceForModel,
} from '@odf/shared/utils';
import { useFlag } from '@openshift-console/dynamic-plugin-sdk';
import { TFunction } from 'react-i18next';
import InitialEmptyStatePage from './InitialEmptyStatePage';

const storageClusterActions =
  (
    t: TFunction,
    storageCluster: StorageClusterKind,
    infrastructure: InfrastructureKind,
    isLSOInstalled: boolean,
    isExternalMode: boolean,
    isFDF?: boolean,
    hasMultipleStorageClusters?: boolean
  ) =>
  () => {
    const resourceProfile = storageCluster?.spec?.resourceProfile;
    const platform = getInfrastructurePlatform(infrastructure);
    const isRHCSSupported = RHCS_SUPPORTED_INFRA.includes(platform);
    const customKebabItems: CustomKebabItem[] = [];
    if (
      !isFDF &&
      !hasMultipleStorageClusters &&
      isRHCSSupported &&
      !isExternalMode
    ) {
      customKebabItems.push({
        key: 'ADD_EXTERNAL_CLUSTER',
        value: t('Add external cluster'),
        redirect: '/odf/external-systems/ceph/~create',
      });
    }

    if (!isExternalMode) {
      customKebabItems.push({
        key: 'ADD_CAPACITY',
        value: t('Add Capacity'),
        component: React.lazy(
          () => import('../../modals/add-capacity/add-capacity-modal')
        ),
      });
      customKebabItems.push({
        key: 'CONFIGURE_PERFORMANCE',
        value: t('Configure performance'),
        component: React.lazy(
          () =>
            import(
              '@odf/core/modals/configure-performance/configure-performance-modal'
            )
        ),
      });
      if (isCapacityAutoScalingAllowed(platform, resourceProfile)) {
        customKebabItems.push({
          key: 'CAPACITY_AUTOSCALING',
          value: t('Automatic capacity scaling'),
          component: React.lazy(
            () =>
              import(
                '@odf/core/modals/capacity-autoscaling/capacity-autoscaling-modal'
              )
          ),
        });
      }
      if (isLSOInstalled) {
        customKebabItems.push({
          key: 'ATTACH_STORAGE',
          value: t('Attach Storage'),
          redirect: `/odf/system/ns/${getNamespace(storageCluster)}/${referenceForModel(
            StorageClusterModel
          )}/${getName(storageCluster)}/~attachstorage`,
        });
      }
    }
    return (
      <Kebab
        extraProps={{
          resource: storageCluster,
          resourceModel: StorageClusterModel,
          storageCluster,
        }}
        customKebabItems={customKebabItems}
        toggleType="Dropdown"
        customLabel={StorageClusterModel.label}
      />
    );
  };

const StorageClusterSection: React.FC = () => {
  const { t } = useCustomTranslation();

  const {
    selectedCluster,
    hasMultipleStorageClusters,
    switchStorageCluster,
    currentStorageCluster,
  } = useOCSDashboardContextSetter();
  const [lsoCSV, lsoCSVLoaded, lsoCSVLoadError] = useFetchCsv({
    specName: LSO_OPERATOR,
  });
  const [infrastructure] = useK8sGet<InfrastructureKind>(
    InfrastructureModel,
    DEFAULT_INFRASTRUCTURE
  );
  const isFDF = useFlag(FDF_FLAG);

  const isLSOInstalled =
    lsoCSVLoaded && !lsoCSVLoadError && isCSVSucceeded(lsoCSV);

  const isExternalMode = selectedCluster.isExternalMode;
  const noStorageClusters = selectedCluster.clusterName === '';
  return noStorageClusters || selectedCluster.clusterName === '' ? (
    <InitialEmptyStatePage />
  ) : (
    <>
      <PageHeading
        title={t('Storage cluster')}
        actions={storageClusterActions(
          t,
          currentStorageCluster,
          infrastructure,
          isLSOInstalled,
          isExternalMode,
          isFDF,
          hasMultipleStorageClusters
        )}
      />
      <OCSDashboardContext.Provider
        // These values are not changing frequently
        // eslint-disable-next-line react/jsx-no-constructed-context-values
        value={{
          hasMultipleStorageClusters,
          selectedCluster,
        }}
      >
        <OCSDashboardDispatchContext.Provider
          // These values are not changing frequently
          // eslint-disable-next-line react/jsx-no-constructed-context-values
          value={{ switchStorageCluster }}
        >
          <OCSSystemDashboard />
        </OCSDashboardDispatchContext.Provider>
      </OCSDashboardContext.Provider>
    </>
  );
};

export default StorageClusterSection;
