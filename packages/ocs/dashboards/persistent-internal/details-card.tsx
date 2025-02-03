import * as React from 'react';
import { useODFNamespaceSelector } from '@odf/core/redux';
import { getStorageClusterInNs } from '@odf/core/utils';
import { DEFAULT_INFRASTRUCTURE, ODF_OPERATOR } from '@odf/shared/constants';
import { useK8sGet } from '@odf/shared/hooks/k8s-get-hook';
import { useFetchCsv } from '@odf/shared/hooks/use-fetch-csv';
import { StorageClusterModel } from '@odf/shared/models';
import {
  ClusterServiceVersionModel,
  InfrastructureModel,
} from '@odf/shared/models';
import { getName } from '@odf/shared/selectors';
import { InfrastructureKind, StorageClusterKind } from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { getOprVersionFromCSV } from '@odf/shared/utils';
import {
  getInfrastructurePlatform,
  resourcePathFromModel,
  referenceForModel,
} from '@odf/shared/utils';
import {
  useK8sWatchResource,
  useFlag,
} from '@openshift-console/dynamic-plugin-sdk';
import { DetailsBody } from '@openshift-console/dynamic-plugin-sdk-internal';
import { OverviewDetailItem as DetailItem } from '@openshift-console/plugin-shared';
import { Link, useParams } from 'react-router-dom-v5-compat';
import { Card, CardBody, CardHeader, CardTitle } from '@patternfly/react-core';
import { PROVIDER_MODE } from '../../../odf/features';
import { ODFSystemParams } from '../../types';
import EncryptionPopover from '../common/details-card/encryption-popover';

const storageClusterResource = {
  kind: referenceForModel(StorageClusterModel),
  isList: true,
};

const DetailsCard: React.FC = () => {
  const { t } = useCustomTranslation();
  const { namespace: ocsNs } = useParams<ODFSystemParams>();

  const { odfNamespace, isNsSafe } = useODFNamespaceSelector();

  const [infrastructure, infrastructureLoaded, infrastructureError] =
    useK8sGet<InfrastructureKind>(InfrastructureModel, DEFAULT_INFRASTRUCTURE);

  const [ocsData, ocsLoaded, ocsError] = useK8sWatchResource<
    StorageClusterKind[]
  >(storageClusterResource);

  const [csv, csvLoaded, csvError] = useFetchCsv({
    specName: ODF_OPERATOR,
    namespace: odfNamespace,
    startPollingInstantly: isNsSafe,
  });

  const infrastructurePlatform = getInfrastructurePlatform(infrastructure);
  const storageCluster: StorageClusterKind = getStorageClusterInNs(
    ocsData,
    ocsNs
  );
  const ocsName = getName(storageCluster);

  const isProviderMode = useFlag(PROVIDER_MODE);

  const serviceVersion = getOprVersionFromCSV(csv);
  const servicePath = `${resourcePathFromModel(
    ClusterServiceVersionModel,
    getName(csv),
    odfNamespace
  )}`;
  const serviceName = t('Data Foundation');

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('Details')}</CardTitle>
      </CardHeader>
      <CardBody>
        <DetailsBody>
          <DetailItem key="service_name" title={t('Service name')}>
            {isNsSafe && csvLoaded && !csvError ? (
              <Link data-test="ocs-link" to={servicePath}>
                {serviceName}
              </Link>
            ) : (
              serviceName
            )}
          </DetailItem>
          <DetailItem
            key="cluster_name"
            title={t('Cluster name')}
            error={ocsError as any}
            isLoading={!ocsLoaded}
          >
            {ocsName}
          </DetailItem>
          <DetailItem
            key="provider"
            title={t('Provider')}
            error={infrastructureError}
            isLoading={!infrastructureLoaded}
          >
            {infrastructurePlatform}
          </DetailItem>
          <DetailItem title={t('Mode')}>
            {isProviderMode ? t('Provider') : t('Internal')}
          </DetailItem>
          <DetailItem
            key="version"
            title={t('Version')}
            isLoading={!csvLoaded}
            error={csvError}
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
              isObjectDashboard={false}
            />
          </DetailItem>
        </DetailsBody>
      </CardBody>
    </Card>
  );
};

export default DetailsCard;
