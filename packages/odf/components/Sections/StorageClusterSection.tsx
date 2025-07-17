import * as React from 'react';
import { LSO_OPERATOR } from '@odf/core/constants';
import {
  isCapacityAutoScalingAllowed,
  isExternalCluster,
} from '@odf/core/utils';
import {
  OCSDashboardContext,
  OCSDashboardDispatchContext,
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
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';
import { TFunction } from 'react-i18next';
import InitialEmptyStatePage from './InitialEmptyStatePage';

const storageClusterActions =
  (
    t: TFunction,
    storageCluster: StorageClusterKind,
    infrastructure: InfrastructureKind,
    isLSOInstalled: boolean,
    isExternalMode: boolean
  ) =>
  () => {
    const resourceProfile = storageCluster?.spec?.resourceProfile;
    const customKebabItems: CustomKebabItem[] = isExternalMode
      ? []
      : [
          {
            key: 'ADD_CAPACITY',
            value: t('Add Capacity'),
            component: React.lazy(
              () => import('../../modals/add-capacity/add-capacity-modal')
            ),
          },
          {
            key: 'CONFIGURE_PERFORMANCE',
            value: t('Configure performance'),
            component: React.lazy(
              () =>
                import(
                  '@odf/core/modals/configure-performance/configure-performance-modal'
                )
            ),
          },
        ];

    if (
      isCapacityAutoScalingAllowed(
        getInfrastructurePlatform(infrastructure),
        resourceProfile
      )
    ) {
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
  const [storageClusters] = useK8sWatchResource<StorageClusterKind[]>({
    groupVersionKind: {
      group: StorageClusterModel.apiGroup,
      version: StorageClusterModel.apiVersion,
      kind: StorageClusterModel.kind,
    },
    isList: true,
  });

  const { t } = useCustomTranslation();

  const noStorageClusters = storageClusters?.length === 0;

  const [selectedCluster, setSelectedCluster] = React.useState({
    clusterName: '',
    clusterNamespace: '',
    isExternalMode: false,
  });
  React.useEffect(() => {
    if (storageClusters?.length > 0) {
      setSelectedCluster({
        clusterName: storageClusters[0].metadata.name,
        clusterNamespace: storageClusters[0].metadata.namespace,
        isExternalMode: isExternalCluster(storageClusters[0]),
      });
    }
  }, [selectedCluster.clusterName, storageClusters]);

  const switchStorageCluster = React.useCallback(() => {
    if (storageClusters?.length > 1) {
      const currentIndex = storageClusters.findIndex(
        (cluster) => getName(cluster) === selectedCluster.clusterName
      );
      const nextIndex = (currentIndex + 1) % storageClusters.length;
      const nextCluster = storageClusters[nextIndex];
      setSelectedCluster({
        clusterName: getName(nextCluster),
        clusterNamespace: getNamespace(nextCluster),
        isExternalMode: isExternalCluster(nextCluster),
      });
    }
  }, [storageClusters, selectedCluster]);

  const hasMultipleStorageClusters = storageClusters?.length > 1;

  const [lsoCSV, lsoCSVLoaded, lsoCSVLoadError] = useFetchCsv({
    specName: LSO_OPERATOR,
  });
  const [infrastructure] = useK8sGet<InfrastructureKind>(
    InfrastructureModel,
    DEFAULT_INFRASTRUCTURE
  );
  const currentStorageCluster = storageClusters?.find(
    (cluster) => getName(cluster) === selectedCluster.clusterName
  );

  const isLSOInstalled =
    lsoCSVLoaded && !lsoCSVLoadError && isCSVSucceeded(lsoCSV);

  const isExternalMode = isExternalCluster(currentStorageCluster);

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
          isExternalMode
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
