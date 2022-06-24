import * as React from 'react';
import { K8sResourceKind } from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { ActivityItem } from '@openshift-console/dynamic-plugin-sdk-internal';

export const ClusterExpandActivity: React.FC = () => {
  const { t } = useCustomTranslation();

  return <ActivityItem>{t('Expanding StorageCluster')}</ActivityItem>;
};

export const isClusterExpandActivity = (
  storageCluster: K8sResourceKind
): boolean => storageCluster?.status?.phase === 'Expanding';
