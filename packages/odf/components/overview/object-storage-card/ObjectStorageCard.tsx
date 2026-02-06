import * as React from 'react';
import { ObjectStorageOverviewQueries } from '@odf/ocs/queries/object-storage';
import { PrometheusMultilineUtilizationItem } from '@odf/shared/dashboards/utilization-card/prometheus-multi-utilization-item';
import { ErrorCardBody } from '@odf/shared/generic/ErrorCardBody';
import {
  useCustomPrometheusPoll,
  usePrometheusBasePath,
} from '@odf/shared/hooks/custom-prometheus-poll';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { humanizeNumber } from '@odf/shared/utils/humanize';
import { parseMetricData } from '@odf/shared/utils/metrics';
import { QueryWithDescription } from '@openshift-console/dynamic-plugin-sdk';
import { UtilizationDurationDropdown } from '@openshift-console/dynamic-plugin-sdk-internal';
import classNames from 'classnames';
import * as _ from 'lodash-es';
import { useNavigate } from 'react-router-dom-v5-compat';
import {
  Button,
  ButtonVariant,
  Card,
  CardBody,
  CardHeader,
  CardProps,
  CardTitle,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Skeleton,
} from '@patternfly/react-core';
import { ArrowRightIcon } from '@patternfly/react-icons';
import './ObjectStorageCard.scss';

const BUCKETS_PROVISIONED_QUERIES: [
  QueryWithDescription,
  QueryWithDescription,
] = [
  {
    query: ObjectStorageOverviewQueries.NOOBAA_BUCKETS_PROVISIONED,
    desc: 'NooBaa',
  },
  { query: '', desc: 'RGW' }, // @TODO: add RGW query when metric is available.
];

export const ObjectStorageCard: React.FC<CardProps> = ({ className }) => {
  const { t } = useCustomTranslation();
  const navigate = useNavigate();
  const [nbBucketsData, nbBucketsError, nbBucketsLoading] =
    useCustomPrometheusPoll({
      query: ObjectStorageOverviewQueries.NOOBAA_BUCKETS_PROVISIONED,
      endpoint: 'api/v1/query' as any,
      basePath: usePrometheusBasePath(),
    });

  const nbBuckets =
    _.isEmpty(nbBucketsError) && !nbBucketsLoading
      ? parseMetricData(nbBucketsData, humanizeNumber)[0]?.usedValue.value || 0
      : 0;

  return (
    <Card className={classNames(className)}>
      <CardHeader
        actions={
          nbBuckets && {
            actions: <UtilizationDurationDropdown />,
          }
        }
      >
        <CardTitle>{t('Object storage')}</CardTitle>
      </CardHeader>
      <CardBody>
        {!nbBucketsLoading && !nbBucketsError && (
          <>
            <DescriptionList>
              <DescriptionListGroup>
                <DescriptionListTerm>
                  {t('Buckets provisioned')}
                </DescriptionListTerm>
                <DescriptionListDescription>
                  {nbBuckets}
                </DescriptionListDescription>
              </DescriptionListGroup>
            </DescriptionList>
            <PrometheusMultilineUtilizationItem
              title={''}
              queries={BUCKETS_PROVISIONED_QUERIES}
              humanizeValue={humanizeNumber}
              chartType="grouped-line"
              className="odf-storage-card__chart"
            />
            <Button
              variant={ButtonVariant.link}
              icon={<ArrowRightIcon />}
              iconPosition="end"
              className="pf-v6-u-font-size-lg pf-v6-u-mt-md odf-cluster-card__storage-link"
              component="a"
              onClick={() => navigate('/odf/object-storage')}
            >
              {t('View buckets')}
            </Button>
          </>
        )}
        {nbBucketsLoading && !nbBucketsError && (
          <Skeleton
            height="100%"
            screenreaderText={t('Loading object storage data')}
          />
        )}
        {nbBucketsError && (
          <ErrorCardBody title={t('Object storage data not available.')} />
        )}
      </CardBody>
    </Card>
  );
};
