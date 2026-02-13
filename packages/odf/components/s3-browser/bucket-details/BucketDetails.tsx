import * as React from 'react';
import { Tag } from '@aws-sdk/client-s3';
import { OBDetails as ObjectBucketDetails } from '@odf/core/components/mcg/ObjectBucket';
import { S3Context } from '@odf/core/components/s3-browser/s3-context';
import {
  BUCKET_ACL_CACHE_KEY_SUFFIX,
  BUCKET_TAGGING_CACHE_KEY_SUFFIX,
  BUCKET_VERSIONING_CACHE_KEY_SUFFIX,
} from '@odf/core/constants';
import SetVersioningModal, {
  SetVersioningModalModalProps,
} from '@odf/core/modals/s3-browser/set-versioning/SetVersioningModal';
import { DASH } from '@odf/shared';
import { LoadingBox } from '@odf/shared/generic/status-box';
import { SectionHeading } from '@odf/shared/heading/page-heading';
import {
  getVersioningStatus,
  getIsVersioningEnabled,
} from '@odf/shared/s3/utils';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  K8sResourceCommon,
  useModal,
} from '@openshift-console/dynamic-plugin-sdk';
import { useParams } from 'react-router-dom-v5-compat';
import useSWR from 'swr';
import {
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

  const [isVersioningChecked, setIsVersioningChecked] =
    React.useState<boolean>(false);

  const versioningStatus = getVersioningStatus(versioningData, t);
  const isVersioningEnabled = getIsVersioningEnabled(versioningData);

  const launcher = useModal();

  React.useEffect(
    () => setIsVersioningChecked(isVersioningEnabled),
    [isVersioningEnabled, setIsVersioningChecked]
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
