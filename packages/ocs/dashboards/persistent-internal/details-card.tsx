import * as React from 'react';
import { getODFVersion } from '@odf/core/utils';
import { useK8sGet } from '@odf/shared/hooks/k8s-get-hook';
import { useK8sList } from '@odf/shared/hooks/useK8sList';
import {
  ClusterServiceVersionModel,
  InfrastructureModel,
  SubscriptionModel,
} from '@odf/shared/models';
import { getInfrastructurePlatform, getName } from '@odf/shared/selectors';
import { K8sResourceKind, StorageClusterKind } from '@odf/shared/types';
import { resourcePathFromModel } from '@odf/shared/utils';
import {
  DetailItem,
  DetailsBody,
} from '@openshift-console/dynamic-plugin-sdk-internal';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Card, CardBody, CardHeader, CardTitle } from '@patternfly/react-core';
import { CEPH_NS } from '../../constants';
import { StorageClusterModel } from '../../models';

const DetailsCard: React.FC = () => {
  const { t } = useTranslation();
  const [infrastructure, infrastructureLoaded, infrastructureError] =
    useK8sGet<K8sResourceKind>(InfrastructureModel, 'cluster');
  const [ocsData, ocsLoaded, ocsError] = useK8sList(
    StorageClusterModel,
    CEPH_NS
  );
  const [subscription, subscriptionLoaded] = useK8sList(SubscriptionModel);
  const infrastructurePlatform = getInfrastructurePlatform(infrastructure);
  const cluster = ocsData?.find(
    (item: StorageClusterKind) => item.status.phase !== 'Ignored'
  );
  const ocsName = getName(cluster);

  const serviceVersion = getODFVersion(subscription);
  const servicePath = `${resourcePathFromModel(
    ClusterServiceVersionModel,
    serviceVersion,
    CEPH_NS
  )}`;
  const serviceName = t('OpenShift Data Foundation');
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('Details')}</CardTitle>
      </CardHeader>
      <CardBody>
        <DetailsBody>
          <DetailItem
            key="service_name"
            title={t('Service name')}
            isLoading={false}
            error={false}
          >
            <Link data-test="ocs-link" to={servicePath}>
              {serviceName}
            </Link>
          </DetailItem>
          <DetailItem
            key="cluster_name"
            title={t('Cluster name')}
            error={!!ocsError}
            isLoading={!ocsLoaded}
          >
            {ocsName}
          </DetailItem>
          <DetailItem
            key="provider"
            title={t('Provider')}
            error={
              !!infrastructureError ||
              (infrastructure && !infrastructurePlatform)
            }
            isLoading={!infrastructureLoaded}
          >
            {infrastructurePlatform}
          </DetailItem>
          <DetailItem title={t('Mode')}>{t('Internal')}</DetailItem>
          <DetailItem
            key="version"
            title={t('Version')}
            isLoading={!subscriptionLoaded}
            error={subscriptionLoaded && !serviceVersion}
          >
            {serviceVersion}
          </DetailItem>
        </DetailsBody>
      </CardBody>
    </Card>
  );
};

export default DetailsCard;
