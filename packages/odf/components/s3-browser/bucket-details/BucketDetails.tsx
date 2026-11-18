import * as React from 'react';
import { Tag } from '@aws-sdk/client-s3';
import { OBDetails as ObjectBucketDetails } from '@odf/core/components/mcg/ObjectBucket';
import { S3Context } from '@odf/core/components/s3-browser/s3-context';
import {
  BUCKET_ACL_CACHE_KEY_SUFFIX,
  BUCKET_OBJECT_LOCK_CACHE_KEY_SUFFIX,
  BUCKET_TAGGING_CACHE_KEY_SUFFIX,
  BUCKET_VERSIONING_CACHE_KEY_SUFFIX,
} from '@odf/core/constants';
import SetDefaultRetentionModal, {
  SetDefaultRetentionModalProps,
} from '@odf/core/modals/s3-browser/set-object-lock-and-retention/SetDefaultRetentionModal';
import SetObjectLockModal, {
  SetObjectLockModalModalProps,
} from '@odf/core/modals/s3-browser/set-object-lock-and-retention/SetObjectLockModal';
import SetVersioningModal, {
  SetVersioningModalModalProps,
} from '@odf/core/modals/s3-browser/set-versioning/SetVersioningModal';
import { DASH, useModalWrapper } from '@odf/shared';
import { LoadingBox } from '@odf/shared/generic/status-box';
import { SectionHeading } from '@odf/shared/heading/page-heading';
import {
  getVersioningStatus,
  getIsVersioningEnabled,
  getIsObjectLockEnabled,
  getDefaultRetention,
  getRetentionModalLabel,
  RetentionPeriodUnit,
} from '@odf/shared/s3/utils';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk';
import { useParams } from 'react-router';
import useSWR from 'swr';
import {
  Alert,
  AlertVariant,
  Button,
  ButtonVariant,
  Flex,
  FlexItem,
  Label,
  LabelGroup,
  Level,
  LevelItem,
  Switch,
  Content,
  ContentVariants,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
} from '@patternfly/react-core';
import { TagIcon } from '@patternfly/react-icons';

const S3BucketDetailsOverview: React.FC<{}> = ({}) => {
  const { t } = useCustomTranslation();
  const { s3Client } = React.useContext(S3Context);
  const { bucketName } = useParams();
  const input = { Bucket: bucketName };
  const { data: aclData } = useSWR(
    `${s3Client.providerType}-${bucketName}-${BUCKET_ACL_CACHE_KEY_SUFFIX}`,
    () => s3Client.getBucketAcl(input)
  );
  const { data: tagData } = useSWR(
    `${s3Client.providerType}-${bucketName}-${BUCKET_TAGGING_CACHE_KEY_SUFFIX}`,
    () => s3Client.getBucketTagging(input)
  );

  const tags = tagData?.TagSet?.map((tag: Tag) => (
    <Label className="pf-v6-u-mr-xs" color="grey" icon={<TagIcon />}>
      {tag.Key}
      {tag.Value && `=${tag.Value}`}
    </Label>
  ));

  return (
    <div className="odf-m-pane__body">
      <SectionHeading text={t('Bucket overview')} />
      <div className="row">
        <div className="col-sm-6">
          <DescriptionList>
            <DescriptionListGroup>
              <DescriptionListTerm>{t('Name')}</DescriptionListTerm>
              <DescriptionListDescription>
                {bucketName}
              </DescriptionListDescription>
            </DescriptionListGroup>

            <DescriptionListGroup>
              <DescriptionListTerm>{t('Tags')}</DescriptionListTerm>
              <DescriptionListDescription>
                <LabelGroup>{tags || DASH}</LabelGroup>
              </DescriptionListDescription>
            </DescriptionListGroup>

            <DescriptionListGroup>
              <DescriptionListTerm>{t('Owner')}</DescriptionListTerm>
              <DescriptionListDescription>
                {aclData?.Owner?.DisplayName || DASH}
              </DescriptionListDescription>
            </DescriptionListGroup>
          </DescriptionList>
        </div>
      </div>
    </div>
  );
};

const S3BucketProperties: React.FC<{}> = ({}) => {
  const { t } = useCustomTranslation();
  const { s3Client } = React.useContext(S3Context);
  const { bucketName } = useParams();
  const input = { Bucket: bucketName };
  const { data: versioningData, mutate: versioningMutate } = useSWR(
    `${s3Client.providerType}-${bucketName}-${BUCKET_VERSIONING_CACHE_KEY_SUFFIX}`,
    () => s3Client.getBucketVersioning(input)
  );

  const { data: objectLockData, mutate: objectLockMutate } = useSWR(
    `${s3Client.providerType}-${bucketName}-${BUCKET_OBJECT_LOCK_CACHE_KEY_SUFFIX}`,
    () => s3Client.getObjectLockConfiguration(input)
  );

  const [isVersioningChecked, setIsVersioningChecked] =
    React.useState<boolean>(false);
  const [isObjectLockChecked, setIsObjectLockChecked] =
    React.useState<boolean>(false);
  const [isDefaultRetentionChecked, setIsDefaultRetentionChecked] =
    React.useState<boolean>(false);

  const versioningStatus = getVersioningStatus(versioningData, t);
  const isVersioningEnabled = getIsVersioningEnabled(versioningData);
  const isObjectLockEnabled = getIsObjectLockEnabled(objectLockData);
  const objectLockStatus = isObjectLockEnabled ? t('Enabled') : t('Disabled');

  const defaultRetention = getDefaultRetention(objectLockData);
  const isDefaultRetentionEnabled = !!defaultRetention;
  const defaultRetentionStatus = isDefaultRetentionEnabled
    ? t('Enabled')
    : t('Disabled');
  const retentionMode = defaultRetention?.Mode;
  const retentionModeLabel = getRetentionModalLabel(retentionMode, t);
  const retentionPeriod = defaultRetention?.Days ?? defaultRetention?.Years;
  const retentionPeriodUnit = defaultRetention?.Days
    ? RetentionPeriodUnit.DAYS
    : RetentionPeriodUnit.YEARS;
  const retentionPeriodUnitLabel = defaultRetention?.Days
    ? t('days')
    : t('years');

  const launcher = useModalWrapper();

  React.useEffect(
    () => setIsVersioningChecked(isVersioningEnabled),
    [isVersioningEnabled, setIsVersioningChecked]
  );

  React.useEffect(
    () => setIsObjectLockChecked(isObjectLockEnabled),
    [isObjectLockEnabled, setIsObjectLockChecked]
  );

  React.useEffect(
    () => setIsDefaultRetentionChecked(isDefaultRetentionEnabled),
    [isDefaultRetentionEnabled, setIsDefaultRetentionChecked]
  );

  return (
    <div className="odf-m-pane__body">
      <SectionHeading text={t('Bucket properties')} />
      {isObjectLockEnabled && (
        <div className="pf-v6-u-mb-lg">
          <Alert
            variant={AlertVariant.info}
            isInline
            title={t(
              'Bucket versioning cannot be suspended as object lock is already enabled for this bucket'
            )}
            className="odf-alert pf-v6-u-mb-xs pf-v6-u-pl-md"
          />
        </div>
      )}
      <br />
      <Level>
        <LevelItem>
          <Content>
            <Content component={ContentVariants.h4}>{t('Versioning')}</Content>
            <Content component={ContentVariants.small}>
              {t(
                'Versioning helps in keeping multiple version of an object in the bucket.'
              )}
            </Content>
          </Content>
        </LevelItem>
        <LevelItem>
          <Switch
            id="versioning-switch"
            label={versioningStatus}
            isChecked={isVersioningChecked}
            isDisabled={isObjectLockEnabled}
            onChange={(_event, checked) =>
              launcher(SetVersioningModal, {
                extraProps: {
                  mutate: versioningMutate,
                  s3Client,
                  bucketName,
                  enableVersioning: checked,
                } as SetVersioningModalModalProps,
                isOpen: true,
              })
            }
          />
        </LevelItem>
      </Level>
      <br />
      <Level>
        <LevelItem>
          <Content>
            <Content component={ContentVariants.h4}>{t('Object Lock')}</Content>
            <Content component={ContentVariants.small}>
              {t(
                'Prevents objects in a bucket from being deleted or overwritten for a specified retention period, ensuring data immutability and compliance.'
              )}
              <br />
              {t('Object lock works only in versioned buckets.')}
            </Content>
          </Content>
        </LevelItem>
        <LevelItem>
          <Switch
            id="object-lock-switch"
            label={objectLockStatus}
            isChecked={isObjectLockChecked}
            isDisabled={isObjectLockEnabled}
            onChange={() =>
              launcher(SetObjectLockModal, {
                extraProps: {
                  mutate: objectLockMutate,
                  versioningMutate,
                  s3Client,
                  bucketName,
                  isVersioningEnabled,
                } as SetObjectLockModalModalProps,
                isOpen: true,
              })
            }
          />
        </LevelItem>
      </Level>
      {isObjectLockEnabled && (
        <div className="pf-v6-u-ml-lg pf-v6-u-mt-lg">
          <Level>
            <LevelItem>
              <Content>
                <Content component={ContentVariants.h4}>
                  {t('Default Retention')}
                </Content>
                <Content component={ContentVariants.small}>
                  {t(
                    'Ensure that every new object added to this bucket is automatically protected against deletion and overwrite operation'
                  )}
                </Content>
              </Content>
            </LevelItem>
            <LevelItem>
              <Switch
                id="default-retention-switch"
                label={defaultRetentionStatus}
                isChecked={isDefaultRetentionChecked}
                onChange={(_event, checked) =>
                  launcher(SetDefaultRetentionModal, {
                    extraProps: {
                      bucketName,
                      s3Client,
                      mutate: objectLockMutate,
                      enableDefaultRetention: checked,
                      onConfirm: () => setIsDefaultRetentionChecked(checked),
                    } as SetDefaultRetentionModalProps,
                    isOpen: true,
                  })
                }
              />
            </LevelItem>
          </Level>
          {defaultRetention && (
            <Flex
              alignItems={{ default: 'alignItemsCenter' }}
              className="pf-v6-u-mt-sm"
            >
              <FlexItem>
                <Content component={ContentVariants.small}>
                  {t('{{mode}} mode expires in {{period}} {{unit}}.', {
                    mode: retentionModeLabel,
                    period: retentionPeriod,
                    unit: retentionPeriodUnitLabel,
                  })}
                </Content>
              </FlexItem>
              <FlexItem>
                <Button
                  variant={ButtonVariant.link}
                  isInline
                  onClick={() =>
                    launcher(SetDefaultRetentionModal, {
                      extraProps: {
                        bucketName,
                        s3Client,
                        mutate: objectLockMutate,
                        onConfirm: () => setIsDefaultRetentionChecked(true),
                        currentRetentionMode: retentionMode,
                        currentRetentionPeriod: retentionPeriod,
                        currentRetentionPeriodUnit: retentionPeriodUnit,
                      } as SetDefaultRetentionModalProps,
                      isOpen: true,
                    })
                  }
                >
                  {t('Edit')}
                </Button>
              </FlexItem>
            </Flex>
          )}
        </div>
      )}
    </div>
  );
};

type BucketDetailsProps = {
  obj: {
    fresh: boolean;
    resource?: K8sResourceCommon;
  };
};

export const BucketDetails: React.FC<BucketDetailsProps> = ({
  obj: { resource, fresh },
}) => {
  const { t } = useCustomTranslation();
  return fresh ? (
    <>
      <S3BucketDetailsOverview />
      <S3BucketProperties />
      {resource && (
        <ObjectBucketDetails
          obj={resource}
          ownerLabel={t('Owner References')}
        />
      )}
    </>
  ) : (
    <LoadingBox />
  );
};
