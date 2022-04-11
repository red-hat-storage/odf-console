import * as React from 'react';
import { K8sResourceKind } from '@odf/shared/types';
import { ActivityItem } from '@openshift-console/dynamic-plugin-sdk-internal';
import { useTranslation } from 'react-i18next';

export const ClusterExpandActivity: React.FC = () => {
  const { t } = useTranslation();

  return <ActivityItem>{t('Expanding StorageCluster')}</ActivityItem>;
};

export const isClusterExpandActivity = (storageCluster: K8sResourceKind): boolean =>
  storageCluster?.status?.phase === 'Expanding';
