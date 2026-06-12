import * as React from 'react';
import { useODFNamespaceSelector } from '@odf/core/redux/selectors';
import { storageClusterResource } from '@odf/core/resources';
import { getStorageClusterInNs, isClusterIgnored } from '@odf/core/utils';
import { computeOCSHealth, useGetOCSHealth } from '@odf/ocs/hooks/useOcsHealth';
import { healthStateMapping } from '@odf/shared/dashboards';
import {
  CephClusterModel,
  CephObjectStoreModel,
  NooBaaSystemModel,
  StorageClusterModel,
} from '@odf/shared/models';
import {
  K8sResourceKind,
  NooBaaKind,
  StorageClusterKind,
} from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { referenceForModel } from '@odf/shared/utils';
import {
  StatusPopupSection,
  useK8sWatchResource,
  WatchK8sResource,
} from '@openshift-console/dynamic-plugin-sdk';
import { ResourceHealthHandler } from '@openshift-console/dynamic-plugin-sdk/lib/extensions/dashboard-types';
import { Link } from 'react-router';
import { Stack, StackItem } from '@patternfly/react-core';
import '@odf/shared/popup/status-popup.scss';

type StorageHealthResources = {
  storageClusters: StorageClusterKind[];
  ceph: K8sResourceKind[];
  noobaa: NooBaaKind[];
  cephObjectStore: K8sResourceKind[];
};

export const healthResources: {
  [k in keyof StorageHealthResources]: WatchK8sResource;
} = {
  storageClusters: {
    kind: referenceForModel(StorageClusterModel),
    isList: true,
  },
  ceph: {
    kind: referenceForModel(CephClusterModel),
    isList: true,
  },
  noobaa: {
    kind: referenceForModel(NooBaaSystemModel),
    isList: true,
  },
  cephObjectStore: {
    kind: referenceForModel(CephObjectStoreModel),
    isList: true,
  },
};

export const getStorageSystemHealthState: ResourceHealthHandler<
  StorageHealthResources
> = (resourcesResult, t) => {
  const storageCluster = (
    resourcesResult.storageClusters?.data as StorageClusterKind[]
  )?.find((sc) => !isClusterIgnored(sc));

  const { healthState, message } = computeOCSHealth(
    storageCluster,
    resourcesResult.ceph,
    resourcesResult.cephObjectStore,
    resourcesResult.noobaa,
    t
  );

  return { state: healthState, message };
};

export const StoragePopover: React.FC = () => {
  const { t } = useCustomTranslation();
  const { odfNamespace } = useODFNamespaceSelector();

  const [storageClusters] = useK8sWatchResource<StorageClusterKind[]>(
    storageClusterResource
  );
  const storageCluster = getStorageClusterInNs(storageClusters, odfNamespace);

  const { healthState } = useGetOCSHealth(storageCluster);
  const operatorName = t('Data Foundation');

  return (
    <Stack hasGutter>
      <StackItem>
        {t(
          "Storage status represents the health status of Data Foundation's StorageCluster."
        )}
      </StackItem>
      <StackItem>
        <StatusPopupSection
          firstColumn={t('Provider')}
          secondColumn={t('Health')}
        >
          <div className="odf-status-popup__row">
            <Link to="/odf/overview">{operatorName}</Link>
            {healthStateMapping[healthState]?.icon}
          </div>
        </StatusPopupSection>
      </StackItem>
    </Stack>
  );
};

export { getStorageSystemHealthState as healthHandler };
