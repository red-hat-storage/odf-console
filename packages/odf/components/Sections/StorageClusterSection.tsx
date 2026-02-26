import * as React from 'react';
import { LSO_OPERATOR } from '@odf/core/constants';
import {
  useGetExternalClusterDetails,
  useGetInternalClusterDetails,
} from '@odf/core/redux/utils';
import { isCapacityAutoScalingAllowed, getResourceInNs } from '@odf/core/utils';
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
import {
  EmptyState,
  EmptyStateBody,
  EmptyStateHeader,
  EmptyStateIcon,
} from '@patternfly/react-core';
import { CubesIcon } from '@patternfly/react-icons';
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
    const platform = getInfrastructurePlatform(infrastructure);
    const customKebabItems: CustomKebabItem[] = [];
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
            import('@odf/core/modals/configure-performance/configure-performance-modal')
        ),
      });
      if (isCapacityAutoScalingAllowed(platform, resourceProfile)) {
        customKebabItems.push({
          key: 'CAPACITY_AUTOSCALING',
          value: t('Automatic capacity scaling'),
          component: React.lazy(
            () =>
              import('@odf/core/modals/capacity-autoscaling/capacity-autoscaling-modal')
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

const useInternalStorageCluster = () => {
  const [storageClusters] = useK8sWatchResource<StorageClusterKind[]>({
    kind: referenceForModel(StorageClusterModel),
    isList: true,
  });

  const internalClusterDetails = useGetInternalClusterDetails();
  const currentStorageCluster = getResourceInNs(
    storageClusters,
    internalClusterDetails.clusterNamespace
  ) as StorageClusterKind;
  const hasMultipleStorageClusters = storageClusters?.length > 1;

  return {
    hasMultipleStorageClusters,
    selectedCluster: { ...internalClusterDetails, isExternalMode: false },
    currentStorageCluster,
  };
};

const StorageClusterSection: React.FC = () => {
  const { t } = useCustomTranslation();

  const { selectedCluster, hasMultipleStorageClusters, currentStorageCluster } =
    useInternalStorageCluster();
  const [lsoCSV, lsoCSVLoaded, lsoCSVLoadError] = useFetchCsv({
    specName: LSO_OPERATOR,
  });
  const [infrastructure] = useK8sGet<InfrastructureKind>(
    InfrastructureModel,
    DEFAULT_INFRASTRUCTURE
  );

  const externalClusterDetails = useGetExternalClusterDetails();
  const isLSOInstalled =
    lsoCSVLoaded && !lsoCSVLoadError && isCSVSucceeded(lsoCSV);

  const hasExternalMode = externalClusterDetails.clusterName !== '';
  const hasInternalMode = selectedCluster.clusterName !== '';
  const noStorageClusters = !hasExternalMode && !hasInternalMode;

  return noStorageClusters ? (
    <InitialEmptyStatePage />
  ) : hasExternalMode && !hasInternalMode && !hasMultipleStorageClusters ? (
    <ExternalClusterPresentMessage />
  ) : (
    <>
      <PageHeading
        title={t('Storage cluster')}
        actions={storageClusterActions(
          t,
          currentStorageCluster,
          infrastructure,
          isLSOInstalled,
          hasExternalMode
        )}
      />
      <OCSSystemDashboard />
    </>
  );
};

const ExternalClusterPresentMessage: React.FC = () => {
  const { t } = useCustomTranslation();
  return (
    <EmptyState isFullHeight>
      <EmptyStateHeader
        titleText={t('Internal mode cluster not available')}
        headingLevel="h4"
        icon={<EmptyStateIcon icon={CubesIcon} />}
      />
      <EmptyStateBody>
        {t(
          'Internal mode cluster setup path is unavailable because an External mode cluster has already been configured.'
        )}
      </EmptyStateBody>
    </EmptyState>
  );
};

export default StorageClusterSection;
