import * as React from 'react';
import { CEPH_BRAND_NAME } from '@odf/core/constants';
import { ODF_MODEL_FLAG } from '@odf/core/features';
import { useODFNamespaceSelector } from '@odf/core/redux';
import { getStorageClusterInNs } from '@odf/core/utils';
import { ODF_OPERATOR, OCS_OPERATOR } from '@odf/shared/constants';
import { useFetchCsv } from '@odf/shared/hooks/use-fetch-csv';
import { SecretModel, StorageClusterModel } from '@odf/shared/models';
import { OverviewDetailItem as DetailItem } from '@odf/shared/overview-page';
import { getName } from '@odf/shared/selectors';
import {
  SecretKind,
  K8sResourceKind,
  StorageClusterKind,
} from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { getOprVersionFromCSV } from '@odf/shared/utils';
import { referenceForModel } from '@odf/shared/utils';
import { ExternalLink } from '@odf/shared/utils/link';
import {
  useFlag,
  useK8sWatchResources,
} from '@openshift-console/dynamic-plugin-sdk';
import { Base64 } from 'js-base64';
import { useParams } from 'react-router-dom-v5-compat';
import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  DescriptionList,
} from '@patternfly/react-core';
import { ODFSystemParams } from '../../types';
import EncryptionPopover from '../common/details-card/encryption-popover';

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

const k8sResources = (clusterNs: string) => ({
  ocs: {
    kind: referenceForModel(StorageClusterModel),
    isList: true,
  },
  secret: {
    kind: SecretModel.kind,
    namespace: clusterNs,
    name: 'rook-ceph-dashboard-link',
  },
});

export const DetailsCard: React.FC = () => {
  const { t } = useCustomTranslation();
  const isODF = useFlag(ODF_MODEL_FLAG);

  const { odfNamespace, isNsSafe } = useODFNamespaceSelector();
  const { namespace: clusterNs } = useParams<ODFSystemParams>();

  const resourcesObj: ResourcesObject = useK8sWatchResources(
    k8sResources(clusterNs)
  );
  const ocsCluster = getStorageClusterInNs(
    resourcesObj['ocs'].data as StorageClusterKind[],
    clusterNs
  );

  const ocsName = getName(ocsCluster);

  const [csv, csvLoaded, csvError] = useFetchCsv({
    specName: !isODF ? OCS_OPERATOR : ODF_OPERATOR,
    namespace: odfNamespace,
    startPollingInstantly: isNsSafe,
  });

  const subscriptionVersion = getOprVersionFromCSV(csv);

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
        <DescriptionList>
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
          <DetailItem
            key="encryption"
            title={t('Encryption')}
            isLoading={!resourcesObj['ocs'].loaded}
            error={resourcesObj['ocs'].loadError}
          >
            <EncryptionPopover cluster={ocsCluster} isObjectDashboard={false} />
          </DetailItem>
        </DescriptionList>
      </CardBody>
    </Card>
  );
};

export default DetailsCard;
