import * as React from 'react';
import { ODF_MODEL_FLAG } from '@odf/core/features';
import { RGW_FLAG } from '@odf/core/features';
import { getODFVersion } from '@odf/core/utils';
import { CEPH_STORAGE_NAMESPACE } from '@odf/shared/constants';
import {
  useCustomPrometheusPoll,
  usePrometheusBasePath,
} from '@odf/shared/hooks/custom-prometheus-poll';
import { useK8sGet } from '@odf/shared/hooks/k8s-get-hook';
import {
  InfrastructureModel,
  SubscriptionModel,
  ClusterServiceVersionModel,
} from '@odf/shared/models';
import { K8sResourceKind } from '@odf/shared/types';
import {
  referenceForModel,
  getInfrastructurePlatform,
} from '@odf/shared/utils';
import { resourcePathFromModel } from '@odf/shared/utils';
import { getMetric } from '@odf/shared/utils';
import {
  useK8sWatchResource,
  useFlag,
} from '@openshift-console/dynamic-plugin-sdk';
import { DetailsBody } from '@openshift-console/dynamic-plugin-sdk-internal';
import { OverviewDetailItem as DetailItem } from '@openshift-console/plugin-shared';
import * as _ from 'lodash';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Card, CardBody, CardHeader, CardTitle } from '@patternfly/react-core';
import { getOCSVersion } from '../../../utils';
import './details-card.scss';

const NOOBAA_SYSTEM_NAME_QUERY = 'NooBaa_system_info';
const NOOBAA_DASHBOARD_LINK_QUERY = 'NooBaa_system_links';

const SubscriptionResource = {
  kind: referenceForModel(SubscriptionModel),
  namespaced: false,
  isList: true,
};

export const ObjectServiceDetailsCard: React.FC<{}> = () => {
  const [infrastructure, infrastructureLoaded, infrastructureError] =
    useK8sGet<K8sResourceKind>(InfrastructureModel, 'cluster');

  const [subscription, subscriptionLoaded, subscriptionLoadError] =
    useK8sWatchResource<K8sResourceKind[]>(SubscriptionResource);

  const [systemResult, systemLoadError] = useCustomPrometheusPoll({
    query: NOOBAA_SYSTEM_NAME_QUERY,
    endpoint: 'api/v1/query' as any,
    basePath: usePrometheusBasePath(),
  });
  const [dashboardLinkResult, dashboardLinkLoadError] = useCustomPrometheusPoll(
    {
      query: NOOBAA_DASHBOARD_LINK_QUERY,
      endpoint: 'api/v1/query' as any,
      basePath: usePrometheusBasePath(),
    }
  );

  const { t } = useTranslation();
  const isODF = useFlag(ODF_MODEL_FLAG);

  const systemName = getMetric(systemResult, 'system_name');
  const systemLink = getMetric(dashboardLinkResult, 'dashboard');

  const infrastructurePlatform = getInfrastructurePlatform(infrastructure);

  const serviceVersion = !isODF
    ? getOCSVersion(subscription)
    : getODFVersion(subscription);

  const serviceName = isODF
    ? t('OpenShift Data Foundation')
    : t('OpenShift Container Storage');

  const hasRGW = useFlag(RGW_FLAG);
  const servicePath = `${resourcePathFromModel(
    ClusterServiceVersionModel,
    serviceVersion,
    CEPH_STORAGE_NAMESPACE
  )}`;
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
          >
            <Link to={servicePath}>{serviceName}</Link>
          </DetailItem>
          <DetailItem
            key="system_name"
            title={t('System name')}
            isLoading={!systemResult || !dashboardLinkResult}
            error={
              systemLoadError ||
              dashboardLinkLoadError ||
              !systemName ||
              !systemLink
            }
          >
            <p data-test-id="system-name-mcg">
              {t('Multicloud Object Gateway')}
            </p>
            {hasRGW && (
              <p
                className="ceph-details-card__rgw-system-name--margin"
                data-test-id="system-name-rgw"
              >
                {t('RADOS Object Gateway')}
              </p>
            )}
          </DetailItem>
          <DetailItem
            key="provider"
            title={t('Provider')}
            error={infrastructureError}
            isLoading={!infrastructureLoaded}
          >
            {infrastructurePlatform}
          </DetailItem>
          <DetailItem
            key="version"
            title={t('Version')}
            isLoading={!subscriptionLoaded}
            error={subscriptionLoadError}
          >
            {serviceVersion}
          </DetailItem>
        </DetailsBody>
      </CardBody>
    </Card>
  );
};

export const DetailsCard = ObjectServiceDetailsCard;
