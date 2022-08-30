import * as React from 'react';
import { StorageClusterModel } from '@odf/ocs/models';
import { K8sResourceKind } from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { referenceForModel } from '@odf/shared/utils';
import { ActivityItem } from '@openshift-console/dynamic-plugin-sdk-internal';

export const ClusterExpandActivity: React.FC = () => {
  const { t } = useCustomTranslation();

  return <ActivityItem>{t('Expanding StorageCluster')}</ActivityItem>;
};

export const isClusterExpandActivity = (
  storageCluster: K8sResourceKind
): boolean => storageCluster?.status?.phase === 'Expanding';

export const k8sResource = {
  isList: true,
  kind: referenceForModel(StorageClusterModel),
  namespaced: false,
  prop: 'storage-cluster',
};
