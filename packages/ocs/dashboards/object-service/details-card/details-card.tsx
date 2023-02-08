import * as React from 'react';
import { OCS_OPERATOR } from '@odf/core/constants';
import { ODF_MODEL_FLAG } from '@odf/core/features';
import { RGW_FLAG } from '@odf/core/features';
import { getOperatorVersion } from '@odf/core/utils';
import { CEPH_STORAGE_NAMESPACE, ODF_OPERATOR } from '@odf/shared/constants';
import {
  useCustomPrometheusPoll,
  usePrometheusBasePath,
} from '@odf/shared/hooks/custom-prometheus-poll';
import { useK8sGet } from '@odf/shared/hooks/k8s-get-hook';
import { useFetchCsv } from '@odf/shared/hooks/use-fetch-csv';
import {
  InfrastructureModel,
  ClusterServiceVersionModel,
} from '@odf/shared/models';
import { K8sResourceKind } from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { getInfrastructurePlatform } from '@odf/shared/utils';
import { resourcePathFromModel } from '@odf/shared/utils';
import { getMetric } from '@odf/shared/utils';
import { useFlag } from '@openshift-console/dynamic-plugin-sdk';
import { DetailsBody } from '@openshift-console/dynamic-plugin-sdk-internal';
import { OverviewDetailItem as DetailItem } from '@openshift-console/plugin-shared';
import * as _ from 'lodash';
import { Link } from 'react-router-dom';
import { Card, CardBody, CardHeader, CardTitle } from '@patternfly/react-core';
import './details-card.scss';

const NOOBAA_SYSTEM_NAME_QUERY = 'NooBaa_system_info';
const NOOBAA_DASHBOARD_LINK_QUERY = 'NooBaa_system_links';

export const ObjectServiceDetailsCard: React.FC<{}> = () => {
  const [infrastructure, infrastructureLoaded, infrastructureError] =
    useK8sGet<K8sResourceKind>(InfrastructureModel, 'cluster');

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

  const { t } = useCustomTranslation();
  const isODF = useFlag(ODF_MODEL_FLAG);

  const systemName = getMetric(systemResult, 'system_name');
  const systemLink = getMetric(dashboardLinkResult, 'dashboard');

  const infrastructurePlatform = getInfrastructurePlatform(infrastructure);

  const [csv, csvLoaded, csvLoadError] = useFetchCsv({
    specName: !isODF ? OCS_OPERATOR : ODF_OPERATOR,
  });

  const serviceVersion = getOperatorVersion(csv);

  const serviceName = isODF
    ? t('Data Foundation')
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
            isLoading={!csvLoaded}
            error={csvLoadError}
          >
            {serviceVersion}
          </DetailItem>
        </DetailsBody>
      </CardBody>
    </Card>
  );
};

export const DetailsCard = ObjectServiceDetailsCard;
