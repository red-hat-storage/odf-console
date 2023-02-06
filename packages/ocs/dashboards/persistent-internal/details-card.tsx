import * as React from 'react';
import { getOperatorVersion } from '@odf/core/utils';
import { ODF_OPERATOR } from '@odf/shared/constants';
import { useK8sGet } from '@odf/shared/hooks/k8s-get-hook';
import { useFetchCsv } from '@odf/shared/hooks/use-fetch-csv';
import { useK8sList } from '@odf/shared/hooks/useK8sList';
import {
  ClusterServiceVersionModel,
  InfrastructureModel,
} from '@odf/shared/models';
import { getName } from '@odf/shared/selectors';
import { K8sResourceKind, StorageClusterKind } from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  getInfrastructurePlatform,
  resourcePathFromModel,
} from '@odf/shared/utils';
import { DetailsBody } from '@openshift-console/dynamic-plugin-sdk-internal';
import { OverviewDetailItem as DetailItem } from '@openshift-console/plugin-shared';
import { Link } from 'react-router-dom';
import { Card, CardBody, CardHeader, CardTitle } from '@patternfly/react-core';
import { CEPH_NS } from '../../constants';
import { StorageClusterModel } from '../../models';

const DetailsCard: React.FC = () => {
  const { t } = useCustomTranslation();
  const [infrastructure, infrastructureLoaded, infrastructureError] =
    useK8sGet<K8sResourceKind>(InfrastructureModel, 'cluster');
  const [ocsData, ocsLoaded, ocsError] = useK8sList(
    StorageClusterModel,
    CEPH_NS
  );
  const [csv, csvLoaded, csvError] = useFetchCsv({ specName: ODF_OPERATOR });
  const infrastructurePlatform = getInfrastructurePlatform(infrastructure);
  const cluster = ocsData?.find(
    (item: StorageClusterKind) => item.status.phase !== 'Ignored'
  );
  const ocsName = getName(cluster);

  const serviceVersion = getOperatorVersion(csv);
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
          >
            <Link data-test="ocs-link" to={servicePath}>
              {serviceName}
            </Link>
          </DetailItem>
          <DetailItem
            key="cluster_name"
            title={t('Cluster name')}
            error={ocsError}
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
          <DetailItem title={t('Mode')}>{t('Internal')}</DetailItem>
          <DetailItem
            key="version"
            title={t('Version')}
            isLoading={!csvLoaded}
            error={csvError}
          >
            {serviceVersion}
          </DetailItem>
        </DetailsBody>
      </CardBody>
    </Card>
  );
};

export default DetailsCard;
