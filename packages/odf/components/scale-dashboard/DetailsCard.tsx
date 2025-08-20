import * as React from 'react';
import { ClusterKind, RemoteClusterKind } from '@odf/core/types/scale';
import { getName } from '@odf/shared';
import { useK8sList } from '@odf/shared/hooks';
import { ClusterModel, RemoteClusterModel } from '@odf/shared/models/scale';
import { OverviewDetailItem as DetailItem } from '@odf/shared/overview-page';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  DescriptionList,
} from '@patternfly/react-core';

const DetailsCard: React.FC<{}> = () => {
  const { t } = useCustomTranslation();

  const [clusters, clustersLoaded, clustersError] =
    useK8sList<ClusterKind>(ClusterModel);
  const [remoteClusters] = useK8sList<RemoteClusterKind>(RemoteClusterModel);

  const cluster = clusters?.[0];
  const remoteCluster = remoteClusters?.[0];

  const clusterName = getName(cluster);
  const endpointUrl = remoteCluster?.spec?.gui?.hosts?.[0];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('Details')}</CardTitle>
      </CardHeader>
      <CardBody>
        <DescriptionList>
          <DetailItem
            key="cluster-name"
            title={t('Cluster name')}
            isLoading={!clustersLoaded}
            error={clustersError}
          >
            {clusterName || 'N/A'}
          </DetailItem>
          <DetailItem key="version" title={t('Version')}>
            Version
          </DetailItem>
          <DetailItem key="created-on" title={t('Created on')}>
            {cluster?.metadata?.creationTimestamp}
          </DetailItem>
          <DetailItem key="url" title={t('Remote cluster endpoint URL')}>
            {endpointUrl}
          </DetailItem>
        </DescriptionList>
      </CardBody>
    </Card>
  );
};

export default DetailsCard;
