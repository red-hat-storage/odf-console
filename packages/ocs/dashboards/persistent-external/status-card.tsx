import * as React from 'react';
import { cephClusterResource } from '@odf/core/resources';
import { getResourceInNs as getCephClusterInNs } from '@odf/core/utils';
import { getCephHealthState } from '@odf/ocs/utils';
import { K8sResourceKind, CephClusterKind } from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';
import {
  HealthBody,
  HealthItem,
} from '@openshift-console/dynamic-plugin-sdk-internal';
import { useParams } from 'react-router-dom-v5-compat';
import {
  GalleryItem,
  Gallery,
  Card,
  CardHeader,
  CardTitle,
} from '@patternfly/react-core';
import { ODFSystemParams } from '../../types';

export const StatusCard: React.FC = () => {
  const { t } = useCustomTranslation();
  const [data, loaded, loadError] =
    useK8sWatchResource<K8sResourceKind[]>(cephClusterResource);

  const { namespace: clusterNs } = useParams<ODFSystemParams>();

  const cephHealth = getCephHealthState(
    {
      ceph: {
        data: getCephClusterInNs(data as CephClusterKind[], clusterNs),
        loaded,
        loadError,
      },
    },
    t
  );

  return (
    <Card className="co-overview-card--gradient">
      <CardHeader>
        <CardTitle>{t('Status')}</CardTitle>
      </CardHeader>
      <HealthBody>
        <Gallery className="co-overview-status__health" hasGutter>
          <GalleryItem>
            <HealthItem
              title={t('Storage Cluster')}
              state={cephHealth.state}
              details={cephHealth.message}
            />
          </GalleryItem>
        </Gallery>
      </HealthBody>
    </Card>
  );
};

export default StatusCard;
