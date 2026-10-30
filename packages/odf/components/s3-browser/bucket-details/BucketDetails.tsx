import * as React from 'react';
import {
  GetObjectLockConfigurationCommandOutput,
  ObjectLockEnabled,
  Tag,
} from '@aws-sdk/client-s3';
import { OBDetails as ObjectBucketDetails } from '@odf/core/components/mcg/ObjectBucket';
import { S3Context } from '@odf/core/components/s3-browser/s3-context';
import {
  BUCKET_ACL_CACHE_KEY_SUFFIX,
  BUCKET_OBJECT_LOCK_CACHE_KEY_SUFFIX,
  BUCKET_TAGGING_CACHE_KEY_SUFFIX,
  BUCKET_VERSIONING_CACHE_KEY_SUFFIX,
} from '@odf/core/constants';
import SetDefaultRetentionModal, {
  RetentionPeriodUnit,
  SetDefaultRetentionModalProps,
} from '@odf/core/modals/s3-browser/set-default-retention/SetDefaultRetentionModal';
import SetObjectLockModal, {
  SetObjectLockModalModalProps,
} from '@odf/core/modals/s3-browser/set-object-lock/SetObjectLockModal';
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
  isNoObjectLockConfigurationError,
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
    () =>
      s3Client.getObjectLockConfiguration(input).catch((err) => {
        // A bucket without Object Lock configured throws; treat that the
        // same as "disabled" instead of surfacing it as a fetch error.
        if (isNoObjectLockConfigurationError(err)) {
          return {} as GetObjectLockConfigurationCommandOutput;
        }
        throw err;
      })
  );

  const [isVersioningChecked, setIsVersioningChecked] =
    React.useState<boolean>(false);
  const [isObjectLockChecked, setIsObjectLockChecked] =
    React.useState<boolean>(false);
  const [isDefaultRetentionChecked, setIsDefaultRetentionChecked] =
    React.useState<boolean>(false);
  const [disableRetentionError, setDisableRetentionError] =
    React.useState<Error>();

  const versioningStatus = getVersioningStatus(versioningData, t);
  const isVersioningEnabled = getIsVersioningEnabled(versioningData);
  const isObjectLockEnabled = getIsObjectLockEnabled(objectLockData);
  const objectLockStatus = isObjectLockEnabled ? t('Enabled') : t('Disabled');
  const defaultRetentionStatus = isDefaultRetentionChecked
    ? t('Enabled')
    : t('Disabled');

  const defaultRetention = getDefaultRetention(objectLockData);
  const isDefaultRetentionEnabled = !!defaultRetention;
  const retentionMode = defaultRetention?.Mode;
  const retentionModeLabel = retentionMode
    ? retentionMode.charAt(0) + retentionMode.slice(1).toLowerCase()
    : '';
  const retentionPeriod = defaultRetention?.Days ?? defaultRetention?.Years;
  const retentionPeriodUnit = defaultRetention?.Days
    ? RetentionPeriodUnit.DAYS
    : RetentionPeriodUnit.YEARS;
  const retentionPeriodUnitLabel = defaultRetention?.Days
    ? t('days')
    : t('years');

  const launcher = useModalWrapper();

  const onDisableDefaultRetention = async () => {
    try {
      // Omitting "Rule" removes the bucket's default retention
      // configuration while keeping Object Lock itself enabled.
      await s3Client.putObjectLockConfiguration({
        Bucket: bucketName,
        ObjectLockConfiguration: {
          ObjectLockEnabled: ObjectLockEnabled.Enabled,
        },
      });
      setDisableRetentionError(undefined);
      setIsDefaultRetentionChecked(false);
      objectLockMutate();
    } catch (err) {
      setDisableRetentionError(err);
    }
  };

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
              {t(
                'Object Lock works only in versioned buckets. Enabling Object Lock automatically enables bucket versioning.'
              )}
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
          <Alert
            variant={AlertVariant.info}
            isInline
            title={t(
              'Bucket versioning cannot be suspended as Object lock is already enabled for this bucket'
            )}
            className="odf-alert pf-v6-u-mb-xs pf-v6-u-pl-md"
          />
        </div>
      )}
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
                  checked
                    ? launcher(SetDefaultRetentionModal, {
                        extraProps: {
                          bucketName,
                          s3Client,
                          mutate: objectLockMutate,
                          onConfirm: () => setIsDefaultRetentionChecked(true),
                        } as SetDefaultRetentionModalProps,
                        isOpen: true,
                      })
                    : onDisableDefaultRetention()
                }
              />
            </LevelItem>
          </Level>
          {disableRetentionError && (
            <Alert
              variant={AlertVariant.danger}
              isInline
              title={t('An error occurred')}
              className="odf-alert pf-v6-u-mb-xs pf-v6-u-mt-sm pf-v6-u-pl-md"
            >
              {disableRetentionError.message ||
                JSON.stringify(disableRetentionError)}
            </Alert>
          )}
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
