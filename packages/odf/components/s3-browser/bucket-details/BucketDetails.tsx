import * as React from 'react';
import {
  BucketVersioningStatus,
  GetBucketEncryptionCommandOutput,
  GetBucketPolicyCommandOutput,
  ServerSideEncryption,
  Tag,
} from '@aws-sdk/client-s3';
import { OBDetails } from '@odf/core/components/mcg/ObjectBucket';
import { NoobaaS3Context } from '@odf/core/components/s3-browser/noobaa-context';
import {
  BUCKET_ACL_CACHE_KEY_SUFFIX,
  BUCKET_ENCRYPTION_CACHE_KEY_SUFFIX,
  BUCKET_POLICY_CACHE_KEY_SUFFIX,
  BUCKET_TAGGING_CACHE_KEY_SUFFIX,
  BUCKET_VERSIONING_CACHE_KEY_SUFFIX,
} from '@odf/core/constants';
import { DASH } from '@odf/shared';
import { LoadingBox } from '@odf/shared/generic/status-box';
import { SectionHeading } from '@odf/shared/heading/page-heading';
import { BucketPolicy } from '@odf/shared/s3';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  GreenCheckCircleIcon,
  K8sResourceCommon,
} from '@openshift-console/dynamic-plugin-sdk';
import { TFunction } from 'i18next';
import { useParams } from 'react-router-dom-v5-compat';
import useSWR from 'swr';
import { Label, LabelGroup } from '@patternfly/react-core';
import { LockIcon, TagIcon } from '@patternfly/react-icons';

const getEncryptionDescription = (
  t: TFunction,
  encryptionData: GetBucketEncryptionCommandOutput,
  policyData: GetBucketPolicyCommandOutput
): string => {
  if (policyData) {
    // Criteria for detecting SSE-C policy based on:
    // https://docs.aws.amazon.com/AmazonS3/latest/userguide/ServerSideEncryptionCustomerKeys.html#ssec-require-condition-key
    try {
      const putObjectAction = 's3:PutObject';
      for (const statement of (JSON.parse(policyData.Policy) as BucketPolicy)
        .Statement) {
        if (
          (statement.Action === putObjectAction ||
            (Array.isArray(statement.Action) &&
              statement.Action.includes('s3:PutObject'))) &&
          statement.Effect === 'Deny'
        ) {
          for (const [condKey, condition] of Object.entries(
            statement.Condition
          )) {
            if (condKey === 'Null') {
              for (const [key, value] of Object.entries(condition)) {
                if (
                  key ===
                    's3:x-amz-server-side-encryption-customer-algorithm' &&
                  value === 'true'
                ) {
                  return t('SSE-C (customer keys)');
                }
              }
            }
          }
        }
      }
    } catch ({ name, message }) {
      // eslint-disable-next-line no-console
      console.error(`Error while parsing bucket policy: ${name}: ${message}}`);
    }
  }

  switch (
    encryptionData?.ServerSideEncryptionConfiguration?.Rules?.[0]
      ?.ApplyServerSideEncryptionByDefault?.SSEAlgorithm
  ) {
    case ServerSideEncryption.aws_kms:
      return t('SSE-S3 with KMS');
    case ServerSideEncryption.aws_kms_dsse:
      return t('SSE-S3 with KMS (Dual-layer)');
    case ServerSideEncryption.AES256:
    default:
      return t('SSE-S3');
  }
};

const BucketDetailsOverview: React.FC<{}> = ({}) => {
  const { t } = useCustomTranslation();
  const { noobaaS3 } = React.useContext(NoobaaS3Context);
  const { bucketName } = useParams();
  const input = { Bucket: bucketName };
  const { data: aclData } = useSWR(
    `${bucketName}-${BUCKET_ACL_CACHE_KEY_SUFFIX}`,
    () => noobaaS3.getBucketAcl(input)
  );
  const { data: encryptionData } = useSWR(
    `${bucketName}-${BUCKET_ENCRYPTION_CACHE_KEY_SUFFIX}`,
    () => noobaaS3.getBucketEncryption(input)
  );
  const { data: policyData } = useSWR(
    `${bucketName}-${BUCKET_POLICY_CACHE_KEY_SUFFIX}`,
    () => noobaaS3.getBucketPolicy(input)
  );
  const { data: versioningData } = useSWR(
    `${bucketName}-${BUCKET_TAGGING_CACHE_KEY_SUFFIX}`,
    () => noobaaS3.getBucketVersioning(input)
  );
  const { data: tagData } = useSWR(
    `${bucketName}-${BUCKET_VERSIONING_CACHE_KEY_SUFFIX}`,
    () => noobaaS3.getBucketTagging(input)
  );

  const encryptionDescription = getEncryptionDescription(
    t,
    encryptionData,
    policyData
  );

  const tags = tagData?.TagSet?.map((tag: Tag) => (
    <Label className="pf-v5-u-mr-xs" color="grey" icon={<TagIcon />}>
      {tag.Key}
      {tag.Value && `=${tag.Value}`}
    </Label>
  ));

  return (
    <>
      <div className="odf-m-pane__body">
        <SectionHeading text={t('Bucket overview')} />
        <div className="row">
          <div className="col-sm-6">
            <dl>
              <dt>{t('Name')}</dt>
              <dd>{bucketName}</dd>
              <dt>{t('Tags')}</dt>
              <dd>
                <LabelGroup>{tags || DASH}</LabelGroup>
              </dd>
              <dt>{t('Owner')}</dt>
              <dd>{aclData?.Owner?.DisplayName || DASH}</dd>
            </dl>
          </div>
          <div className="col-sm-6">
            <dl>
              <dt>{t('Encryption')}</dt>
              <dd>
                <LockIcon /> {t('Enabled')}
                <div className="pf-v5-u-disabled-color-100">
                  {encryptionDescription}
                </div>
              </dd>
              <dt>{t('Bucket versioning')}</dt>
              <dd>
                {versioningData?.Status === BucketVersioningStatus.Enabled ? (
                  <>
                    <GreenCheckCircleIcon /> {t('Enabled')}
                  </>
                ) : (
                  t('Suspended')
                )}
              </dd>
            </dl>
          </div>
        </div>
      </div>
    </>
  );
};

type BucketDetailsProps = {
  obj: {
    refresh: boolean;
    resource?: K8sResourceCommon;
  };
};

export const BucketDetails: React.FC<BucketDetailsProps> = ({
  obj: { resource, refresh },
}) => {
  const { t } = useCustomTranslation();

  return refresh ? (
    <>
      <BucketDetailsOverview />
      {resource && (
        <OBDetails obj={resource} ownerLabel={t('Owner References')} />
      )}
    </>
  ) : (
    <LoadingBox />
  );
};
