import * as React from 'react';
import { LoadingBox } from '@odf/shared/generic/status-box';
import { SecretModel, StorageClassModel } from '@odf/shared/models';
import { ResourceLink } from '@openshift-console/dynamic-plugin-sdk';
import { useTranslation } from 'react-i18next';
import { Flex, FlexItem } from '@patternfly/react-core';
import { BC_PROVIDERS, NOOBAA_TYPE_MAP } from '../../constants';
import { BackingStoreKind } from '../../types';
import { getRegion } from '../../utils';
import { DetailsItem } from './CommonDetails';
import './common-details.scss';

type ProviderDetailsProps = {
  resource: BackingStoreKind;
};

const AWSDetails: React.FC<ProviderDetailsProps> = ({ resource }) => {
  const { t } = useTranslation();
  const region = getRegion(resource);
  const secret = resource.spec.awsS3.secret;
  const targetBucket = resource.spec.awsS3.targetBucket;

  return (
    <Flex direction={{ default: 'column' }} className="details-item--border">
      <FlexItem>
        <DetailsItem field={t('Provider')}>{BC_PROVIDERS.AWS}</DetailsItem>
      </FlexItem>
      <FlexItem>
        <DetailsItem field={t('Region')}>{region}</DetailsItem>
      </FlexItem>
      <FlexItem>
        <DetailsItem field={t('Secret')}>
          <ResourceLink
            kind={SecretModel.kind}
            name={secret.name}
            namespace={secret.namespace}
          />
        </DetailsItem>
      </FlexItem>
      <FlexItem>
        <DetailsItem field={t('Target Bucket')}>{targetBucket}</DetailsItem>
      </FlexItem>
    </Flex>
  );
};

const AzureBlobDetails: React.FC<ProviderDetailsProps> = ({ resource }) => {
  const { t } = useTranslation();
  const secret = resource.spec.azureBlob.secret;
  const targetBucket = resource.spec.azureBlob.targetBlobContainer;

  return (
    <Flex direction={{ default: 'column' }} className="details-item--border">
      <FlexItem>
        <DetailsItem field={t('Provider')}>{BC_PROVIDERS.AZURE}</DetailsItem>
      </FlexItem>
      <FlexItem>
        <DetailsItem field={t('Secret')}>
          <ResourceLink
            kind={SecretModel.kind}
            name={secret.name}
            namespace={secret.namespace}
          />
        </DetailsItem>
      </FlexItem>
      <FlexItem>
        <DetailsItem field={t('Target Blob Container')}>
          {targetBucket}
        </DetailsItem>
      </FlexItem>
    </Flex>
  );
};

const S3CompatibleDetails: React.FC<ProviderDetailsProps> = ({ resource }) => {
  const { t } = useTranslation();
  const secret = resource.spec.s3Compatible.secret;
  const endpoint = resource.spec.s3Compatible.endpoint;
  const targetBucket = resource.spec.s3Compatible.targetBucket;

  return (
    <Flex direction={{ default: 'column' }} className="details-item--border">
      <FlexItem>
        <DetailsItem field={t('Provider')}>{BC_PROVIDERS.S3}</DetailsItem>
      </FlexItem>
      <FlexItem>
        <DetailsItem field={t('Endpoint')}>{endpoint}</DetailsItem>
      </FlexItem>
      <FlexItem>
        <DetailsItem field={t('Secret')}>
          <ResourceLink
            kind={SecretModel.kind}
            name={secret.name}
            namespace={secret.namespace}
          />
        </DetailsItem>
      </FlexItem>
      <FlexItem>
        <DetailsItem field={t('Target Bucket')}>{targetBucket}</DetailsItem>
      </FlexItem>
    </Flex>
  );
};

const IBMDetails: React.FC<ProviderDetailsProps> = ({ resource }) => {
  const { t } = useTranslation();
  const secret = resource.spec.ibmCos.secret;
  const endpoint = resource.spec.ibmCos.endpoint;
  const targetBucket = resource.spec.ibmCos.targetBucket;

  return (
    <Flex direction={{ default: 'column' }} className="details-item--border">
      <FlexItem>
        <DetailsItem field={t('Provider')}>{BC_PROVIDERS.IBM}</DetailsItem>
      </FlexItem>
      <FlexItem>
        <DetailsItem field={t('Endpoint')}>{endpoint}</DetailsItem>
      </FlexItem>
      <FlexItem>
        <DetailsItem field={t('Secret')}>
          <ResourceLink
            kind={SecretModel.kind}
            name={secret.name}
            namespace={secret.namespace}
          />
        </DetailsItem>
      </FlexItem>
      <FlexItem>
        <DetailsItem field={t('Target Bucket')}>{targetBucket}</DetailsItem>
      </FlexItem>
    </Flex>
  );
};

const GCPDetails: React.FC<ProviderDetailsProps> = ({ resource }) => {
  const { t } = useTranslation();
  const secret = resource.spec.googleCloudStorage.secret;
  const targetBucket = resource.spec.googleCloudStorage.targetBucket;

  return (
    <Flex direction={{ default: 'column' }} className="details-item--border">
      <FlexItem>
        <DetailsItem field={t('Provider')}>{BC_PROVIDERS.IBM}</DetailsItem>
      </FlexItem>
      <FlexItem>
        <DetailsItem field={t('Secret')}>
          <ResourceLink
            kind={SecretModel.kind}
            name={secret.name}
            namespace={secret.namespace}
          />
        </DetailsItem>
      </FlexItem>
      <FlexItem>
        <DetailsItem field={t('Target Bucket')}>{targetBucket}</DetailsItem>
      </FlexItem>
    </Flex>
  );
};

const PVCDetails: React.FC<ProviderDetailsProps> = ({ resource }) => {
  const { t } = useTranslation();
  const numVolumes = resource.spec.pvPool.numVolumes;
  const storageClass = resource.spec.pvPool.storageClass;

  return (
    <Flex direction={{ default: 'column' }} className="details-item--border">
      <FlexItem>
        <DetailsItem field={t('Provider')}>{BC_PROVIDERS.PVC}</DetailsItem>
      </FlexItem>
      <FlexItem>
        <DetailsItem field={t('Num Volumes')}>{numVolumes}</DetailsItem>
      </FlexItem>
      <FlexItem>
        <DetailsItem field={t('StorageClass')}>
          <ResourceLink kind={StorageClassModel.kind} name={storageClass} />
        </DetailsItem>
      </FlexItem>
    </Flex>
  );
};

const ProviderDetails: React.FC<ProviderDetailsProps> = ({ resource }) => {
  const type = resource.spec.type;

  const ProviderComponent = React.useMemo(() => {
    switch (type) {
      case NOOBAA_TYPE_MAP[BC_PROVIDERS.AWS]:
        return AWSDetails;
      case NOOBAA_TYPE_MAP[BC_PROVIDERS.AZURE]:
        return AzureBlobDetails;
      case NOOBAA_TYPE_MAP[BC_PROVIDERS.S3]:
        return S3CompatibleDetails;
      case NOOBAA_TYPE_MAP[BC_PROVIDERS.IBM]:
        return IBMDetails;
      case NOOBAA_TYPE_MAP[BC_PROVIDERS.PVC]:
        return PVCDetails;
      case NOOBAA_TYPE_MAP[BC_PROVIDERS.GCP]:
        return GCPDetails;
      default:
        return LoadingBox;
    }
  }, [type]);

  return <ProviderComponent resource={resource} />;
};

export default ProviderDetails;
