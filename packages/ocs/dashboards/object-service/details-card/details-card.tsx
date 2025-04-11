import * as React from 'react';
import { ODF_MODEL_FLAG } from '@odf/core/features';
import { useODFNamespaceSelector } from '@odf/core/redux';
import { useODFSystemFlagsSelector } from '@odf/core/redux';
import { getStorageClusterInNs } from '@odf/core/utils';
import { ODF_OPERATOR, OCS_OPERATOR } from '@odf/shared/constants';
import {
  useCustomPrometheusPoll,
  usePrometheusBasePath,
} from '@odf/shared/hooks/custom-prometheus-poll';
import { useK8sGet } from '@odf/shared/hooks/k8s-get-hook';
import { useFetchCsv } from '@odf/shared/hooks/use-fetch-csv';
import {
  InfrastructureModel,
  ClusterServiceVersionModel,
  StorageClusterModel,
} from '@odf/shared/models';
import { OverviewDetailItem as DetailItem } from '@odf/shared/overview-page';
import { getName } from '@odf/shared/selectors';
import { K8sResourceKind, StorageClusterKind } from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { getOprVersionFromCSV, referenceForModel } from '@odf/shared/utils';
import { getInfrastructurePlatform } from '@odf/shared/utils';
import { resourcePathFromModel } from '@odf/shared/utils';
import { getMetric } from '@odf/shared/utils';
import {
  useFlag,
  useK8sWatchResource,
} from '@openshift-console/dynamic-plugin-sdk';
import { DetailsBody } from '@openshift-console/dynamic-plugin-sdk-internal';
import { Link, useParams } from 'react-router-dom-v5-compat';
import { Card, CardBody, CardHeader, CardTitle } from '@patternfly/react-core';
import { ODFSystemParams } from '../../../types';
import './details-card.scss';
import EncryptionPopover from '../../common/details-card/encryption-popover';

const NOOBAA_SYSTEM_NAME_QUERY = 'NooBaa_system_info';
const NOOBAA_DASHBOARD_LINK_QUERY = 'NooBaa_system_links';

const storageClusterResource = {
  kind: referenceForModel(StorageClusterModel),
  isList: true,
};

export const ObjectServiceDetailsCard: React.FC<{}> = () => {
  const [infrastructure, infrastructureLoaded, infrastructureError] =
    useK8sGet<K8sResourceKind>(InfrastructureModel, 'cluster');
  const { odfNamespace, isNsSafe } = useODFNamespaceSelector();
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
  const [ocsData, ocsLoaded, ocsError] = useK8sWatchResource<
    StorageClusterKind[]
  >(storageClusterResource);
  const systemName = getMetric(systemResult, 'system_name');
  const systemLink = getMetric(dashboardLinkResult, 'dashboard');

  const infrastructurePlatform = getInfrastructurePlatform(infrastructure);

  const [csv, csvLoaded, csvLoadError] = useFetchCsv({
    specName: !isODF ? OCS_OPERATOR : ODF_OPERATOR,
    namespace: odfNamespace,
    startPollingInstantly: isNsSafe,
  });

  const serviceVersion = getOprVersionFromCSV(csv);

  const serviceName = isODF
    ? t('Data Foundation')
    : t('OpenShift Container Storage');

  const { namespace: clusterNs } = useParams<ODFSystemParams>();
  const { systemFlags } = useODFSystemFlagsSelector();
  const hasRGW = systemFlags[clusterNs]?.isRGWAvailable;
  const hasMCG = systemFlags[clusterNs]?.isNoobaaAvailable;

  const storageCluster: StorageClusterKind = getStorageClusterInNs(
    ocsData,
    odfNamespace
  );

  const servicePath = `${resourcePathFromModel(
    ClusterServiceVersionModel,
    getName(csv),
    odfNamespace
  )}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('Details')}</CardTitle>
      </CardHeader>
      <CardBody>
        <DetailsBody>
          <DetailItem key="service_name" title={t('Service name')}>
            {isNsSafe && csvLoaded && !csvLoadError ? (
              <Link to={servicePath}>{serviceName}</Link>
            ) : (
              serviceName
            )}
          </DetailItem>
          <DetailItem
            key="system_name"
            title={t('System name')}
            isLoading={
              !systemResult ||
              !dashboardLinkResult ||
              !systemName ||
              !systemLink
            }
            error={systemLoadError || dashboardLinkLoadError}
          >
            {hasMCG && (
              <p data-test-id="system-name-mcg">
                {t('Multicloud Object Gateway')}
              </p>
            )}
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
          <DetailItem
            key="encryption"
            title={t('Encryption')}
            isLoading={!ocsLoaded}
            error={ocsError}
          >
            <EncryptionPopover
              cluster={storageCluster}
              isObjectDashboard={true}
            />
          </DetailItem>
        </DetailsBody>
      </CardBody>
    </Card>
  );
};

export const DetailsCard = ObjectServiceDetailsCard;
