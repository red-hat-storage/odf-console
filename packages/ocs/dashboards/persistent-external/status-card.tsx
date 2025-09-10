import * as React from 'react';
import { useGetExternalClusterDetails } from '@odf/core/redux/utils';
import { cephClusterResource } from '@odf/core/resources';
import { getResourceInNs as getCephClusterInNs } from '@odf/core/utils';
import { getCephHealthState } from '@odf/ocs/utils';
import { K8sResourceKind, CephClusterKind } from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';
import { HealthItem } from '@openshift-console/dynamic-plugin-sdk-internal';
import {
  GalleryItem,
  Gallery,
  Card,
  CardHeader,
  CardBody,
  CardTitle,
} from '@patternfly/react-core';
import '../../style.scss';

export const StatusCard: React.FC = () => {
  const { t } = useCustomTranslation();
  const [data, loaded, loadError] =
    useK8sWatchResource<K8sResourceKind[]>(cephClusterResource);

  const { clusterNamespace: clusterNs } = useGetExternalClusterDetails();

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
    <Card className="odf-overview-card--gradient">
      <CardHeader>
        <CardTitle>{t('Status')}</CardTitle>
      </CardHeader>
      <CardBody>
        <Gallery className="odf-overview-status__health" hasGutter>
          <GalleryItem>
            <HealthItem
              title={t('Storage Cluster')}
              state={cephHealth.state}
              details={cephHealth.message}
            />
          </GalleryItem>
        </Gallery>
      </CardBody>
    </Card>
  );
};

export default StatusCard;
