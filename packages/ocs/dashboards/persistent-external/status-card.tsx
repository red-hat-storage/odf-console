import * as React from 'react';
import { cephClusterResource } from '@odf/core/resources';
import { K8sResourceKind } from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';
import {
  HealthBody,
  HealthItem,
} from '@openshift-console/dynamic-plugin-sdk-internal';
import {
  GalleryItem,
  Gallery,
  Card,
  CardHeader,
  CardTitle,
} from '@patternfly/react-core';
import { getCephHealthState } from '../persistent-internal/status-card/utils';
import './../../style.scss';

export const StatusCard: React.FC = () => {
  const { t } = useCustomTranslation();
  const [data, loaded, loadError] =
    useK8sWatchResource<K8sResourceKind[]>(cephClusterResource);

  const cephHealth = getCephHealthState(
    { ceph: { data, loaded, loadError } },
    t
  );

  return (
    <Card className="odf-overview-card--gradient">
      <CardHeader>
        <CardTitle>{t('Status')}</CardTitle>
      </CardHeader>
      <HealthBody>
        <Gallery className="odf-overview-status__health" hasGutter>
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
