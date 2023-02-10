import * as React from 'react';
import { CEPH_BRAND_NAME, OCS_OPERATOR } from '@odf/core/constants';
import { ODF_MODEL_FLAG } from '@odf/core/features';
import { getOperatorVersion } from '@odf/core/utils';
import { CEPH_STORAGE_NAMESPACE, ODF_OPERATOR } from '@odf/shared/constants';
import { useFetchCsv } from '@odf/shared/hooks/use-fetch-csv';
import { SecretModel } from '@odf/shared/models';
import { getName } from '@odf/shared/selectors';
import { SecretKind, K8sResourceKind } from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { referenceForModel } from '@odf/shared/utils';
import { ExternalLink } from '@odf/shared/utils/link';
import {
  useFlag,
  useK8sWatchResources,
} from '@openshift-console/dynamic-plugin-sdk';
import { DetailsBody } from '@openshift-console/dynamic-plugin-sdk-internal';
import { OverviewDetailItem as DetailItem } from '@openshift-console/plugin-shared';
import { Base64 } from 'js-base64';
import { Card, CardBody, CardHeader, CardTitle } from '@patternfly/react-core';
import { StorageClusterModel } from '../../models';

const getCephLink = (secret: SecretKind): string => {
  const data = secret?.data?.userKey;
  return data ? Base64.decode(data) : null;
};

type ResourcesObject = {
  [key: string]: {
    data: K8sResourceKind | K8sResourceKind[];
    loaded: boolean;
    loadError: any;
  };
};

const k8sResources = {
  ocs: {
    kind: referenceForModel(StorageClusterModel),
    namespaced: true,
    isList: true,
    namespace: 'openshift-storage',
  },
  secret: {
    kind: SecretModel.kind,
    namespace: CEPH_STORAGE_NAMESPACE,
    name: 'rook-ceph-dashboard-link',
  },
};

export const DetailsCard: React.FC = () => {
  const { t } = useCustomTranslation();
  const isODF = useFlag(ODF_MODEL_FLAG);

  const resourcesObj: ResourcesObject = useK8sWatchResources(k8sResources);

  const ocsName = getName(resourcesObj['ocs'].data?.[0]);

  const [csv, csvLoaded, csvError] = useFetchCsv({
    specName: !isODF ? OCS_OPERATOR : ODF_OPERATOR,
    namespace: CEPH_STORAGE_NAMESPACE,
  });

  const subscriptionVersion = getOperatorVersion(csv);

  const serviceName = isODF
    ? t('Data Foundation')
    : t('OpenShift Container Storage');
  const cephLink = getCephLink(resourcesObj['secret'].data as K8sResourceKind);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('Details')}</CardTitle>
      </CardHeader>
      <CardBody>
        <DetailsBody>
          <DetailItem title={t('Service name')}>{serviceName}</DetailItem>
          <DetailItem
            title={t('Cluster name')}
            error={resourcesObj['ocs'].loadError}
            isLoading={!resourcesObj['ocs'].loaded}
            data-test-id="cluster-name"
          >
            {ocsName}
          </DetailItem>
          <DetailItem
            title={t('Provider')}
            isLoading={
              !resourcesObj['secret'].loaded &&
              !resourcesObj['secret'].loadError
            }
          >
            {cephLink ? (
              <ExternalLink href={cephLink} text={CEPH_BRAND_NAME} />
            ) : (
              CEPH_BRAND_NAME
            )}
          </DetailItem>
          <DetailItem title={t('Mode')}>External</DetailItem>
          <DetailItem
            title={t('Version')}
            isLoading={!csvLoaded}
            error={csvError}
            data-test-id="cluster-subscription"
          >
            {subscriptionVersion}
          </DetailItem>
        </DetailsBody>
      </CardBody>
    </Card>
  );
};

export default DetailsCard;
