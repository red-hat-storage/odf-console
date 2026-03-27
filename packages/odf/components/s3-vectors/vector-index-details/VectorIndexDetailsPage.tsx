import * as React from 'react';
import {
  getVectorBucketOverviewBaseRoute,
  VECTOR_BUCKETS_BASE_ROUTE,
} from '@odf/core/constants/s3-vectors';
import { S3ProviderType } from '@odf/core/types';
import { VectorCrFormat } from '@odf/core/types/s3-vectors';
import { PageHeading } from '@odf/shared';
import { SectionHeading } from '@odf/shared/heading/page-heading';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { useParams, useLocation } from 'react-router-dom-v5-compat';
import {
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
} from '@patternfly/react-core';
import { S3VectorsProvider } from '../s3-vectors-context';

type LocationState = { index?: VectorCrFormat } | null;

const VectorIndexDetails: React.FC<{}> = () => {
  const { t } = useCustomTranslation();
  const { indexName } = useParams();
  const location = useLocation();
  const state = location.state as LocationState;
  const index = state?.index;

  const name = indexName ?? index?.metadata?.name ?? '—';
  const createdOn = index?.metadata?.creationTimestamp
    ? new Date(index.metadata.creationTimestamp).toLocaleString()
    : '—';
  const indexArn = index?.metadata?.uid ?? '—';

  return (
    <div className="odf-m-pane__body">
      <SectionHeading text={t('Index overview')} />
      <div className="row">
        <div className="col-sm-6">
          <DescriptionList>
            <DescriptionListGroup>
              <DescriptionListTerm>{t('Name')}</DescriptionListTerm>
              <DescriptionListDescription>{name}</DescriptionListDescription>
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
      <div className="row pf-v5-u-mt-lg">
        <div className="col-sm-12">
          <SectionHeading text={t('Non-filterable metadata')} />
          <DescriptionList>
            <DescriptionListGroup>
              <DescriptionListTerm>{t('Index ARN')}</DescriptionListTerm>
              <DescriptionListDescription>
                {indexArn}
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
  const { indexName, vectorBucketName } = useParams();
  const providerType = S3ProviderType.Noobaa;

  const breadcrumbs = React.useMemo(
    () => [
      {
        name: t('Buckets'),
        path: VECTOR_BUCKETS_BASE_ROUTE,
      },
      {
        name: vectorBucketName ?? '',
        path: getVectorBucketOverviewBaseRoute(
          vectorBucketName ?? '',
          providerType
        ),
      },
      {
        name: indexName ?? t('Vector index'),
        path: '',
      },
    ],
    [indexName, providerType, t, vectorBucketName]
  );

  return (
    <S3VectorsProvider>
      <PageHeading
        breadcrumbs={breadcrumbs}
        title={indexName ?? t('Vector index')}
        className="pf-v5-u-mt-md"
      />
      <VectorIndexDetails />
    </S3VectorsProvider>
  );
};

export default VectorIndexDetailsPage;
