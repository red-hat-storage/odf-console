import * as React from 'react';
import {
  getVectorBucketOverviewBaseRoute,
  VECTOR_BUCKETS_BASE_ROUTE,
  VECTOR_INDEX_CACHE_KEY_SUFFIX,
} from '@odf/core/constants/s3-vectors';
import { S3ProviderType } from '@odf/core/types';
import { DASH, getCreationTimestamp, PageHeading } from '@odf/shared';
import { SectionHeading } from '@odf/shared/heading/page-heading';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { useParams } from 'react-router-dom-v5-compat';
import useSWR from 'swr';
import {
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
} from '@patternfly/react-core';
import { S3VectorsContext, S3VectorsProvider } from '../s3-vectors-context';

const VectorIndexDetails: React.FC<{}> = () => {
  const { t } = useCustomTranslation();
  const { indexName } = useParams();

  const { s3VectorsClient } = React.useContext(S3VectorsContext);

  const { data: index } = useSWR(
    `${s3VectorsClient.providerType}-${indexName}-${VECTOR_INDEX_CACHE_KEY_SUFFIX}`,
    () => s3VectorsClient.getVectorIndex(indexName)
  );

  const createdOn = getCreationTimestamp(index) || DASH;

  return (
    <div className="odf-m-pane__body">
      <SectionHeading text={t('Index overview')} />
      <div className="row">
        <div className="col-sm-6">
          <DescriptionList>
            <DescriptionListGroup>
              <DescriptionListTerm>{t('Name')}</DescriptionListTerm>
              <DescriptionListDescription>
                {indexName}
              </DescriptionListDescription>
            </DescriptionListGroup>
            <DescriptionListGroup>
              <DescriptionListTerm>{t('Created on')}</DescriptionListTerm>
              <DescriptionListDescription>
                {createdOn}
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
