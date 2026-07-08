import * as React from 'react';
import {
  getVectorBucketOverviewBaseRoute,
  VECTOR_BUCKETS_BASE_ROUTE,
  VECTOR_INDEX_CACHE_KEY_SUFFIX,
} from '@odf/core/constants/s3-vectors';
import { S3ProviderType } from '@odf/core/types';
import { DASH, PageHeading } from '@odf/shared';
import { Timestamp } from '@odf/shared/details-page/timestamp';
import { SectionHeading } from '@odf/shared/heading/page-heading';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { useParams } from 'react-router';
import useSWR from 'swr';
import {
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Label,
  LabelGroup,
} from '@patternfly/react-core';
import { TagIcon } from '@patternfly/react-icons';
import { S3VectorsContext, S3VectorsProvider } from '../s3-vectors-context';

const VectorIndexDetails: React.FC<{}> = () => {
  const { t } = useCustomTranslation();
  const { vectorBucketName, indexName } = useParams();

  const { s3VectorsClient } = React.useContext(S3VectorsContext);

  const { data } = useSWR(
    `${s3VectorsClient.providerType}-${vectorBucketName}-${indexName}-${VECTOR_INDEX_CACHE_KEY_SUFFIX}`,
    () =>
      s3VectorsClient.getVectorIndex({
        indexName: indexName,
        vectorBucketName: vectorBucketName,
      })
  );

  const createdOn = data?.index?.creationTime?.toString() || DASH;
  const metadatConfiguration =
    data?.index?.metadataConfiguration?.nonFilterableMetadataKeys?.map(
      (tag, index) => (
        <Label
          key={`metadata-key-${index}`}
          className="pf-v6-u-mr-xs"
          color="grey"
          icon={<TagIcon />}
        >
          {tag}
        </Label>
      )
    );
  return (
    <div className="odf-m-pane__body">
      <SectionHeading text={t('Index overview')} />
      <div className="row">
        <div className="col-sm-6">
          <DescriptionList>
            <DescriptionListGroup>
              <DescriptionListTerm>{t('Name')}</DescriptionListTerm>
              <DescriptionListDescription>
                {data?.index?.indexName}
              </DescriptionListDescription>
            </DescriptionListGroup>
            <DescriptionListGroup>
              <DescriptionListTerm>{t('Created on')}</DescriptionListTerm>
              <DescriptionListDescription>
                <Timestamp timestamp={createdOn} ignoreRelativeTime />
              </DescriptionListDescription>
            </DescriptionListGroup>
            <DescriptionListGroup>
              <DescriptionListTerm>{t('DataType')}</DescriptionListTerm>
              <DescriptionListDescription>
                {data?.index?.dataType}
              </DescriptionListDescription>
            </DescriptionListGroup>
            <DescriptionListGroup>
              <DescriptionListTerm>{t('Dimension')}</DescriptionListTerm>
              <DescriptionListDescription>
                {data?.index?.dimension}
              </DescriptionListDescription>
            </DescriptionListGroup>
            <DescriptionListGroup>
              <DescriptionListTerm>{t('Distance metric')}</DescriptionListTerm>
              <DescriptionListDescription>
                {data?.index?.distanceMetric}
              </DescriptionListDescription>
            </DescriptionListGroup>
            <DescriptionListGroup>
              <DescriptionListTerm>
                {t('Non-filterable metadata')}
              </DescriptionListTerm>
              <DescriptionListDescription>
                <LabelGroup>{metadatConfiguration || DASH}</LabelGroup>
              </DescriptionListDescription>
            </DescriptionListGroup>
          </DescriptionList>
        </div>
      </div>
    </div>
  );
};

const VectorIndexDetailsPage: React.FC<{}> = () => {
  const { t } = useCustomTranslation();
  const { providerType, vectorBucketName, indexName } = useParams();

  const breadcrumbs = React.useMemo(
    () => [
      {
        name: t('Buckets'),
        path: VECTOR_BUCKETS_BASE_ROUTE,
      },
      {
        name: vectorBucketName,
        path: getVectorBucketOverviewBaseRoute(
          vectorBucketName as string,
          providerType as S3ProviderType
        ),
      },
      {
        name: t('Vector index'),
        path: '',
      },
    ],
    [providerType, t, vectorBucketName]
  );

  return (
    <S3VectorsProvider>
      <PageHeading
        breadcrumbs={breadcrumbs}
        title={indexName}
        className="pf-v6-u-mt-md"
      />
      <VectorIndexDetails />
    </S3VectorsProvider>
  );
};

export default VectorIndexDetailsPage;
