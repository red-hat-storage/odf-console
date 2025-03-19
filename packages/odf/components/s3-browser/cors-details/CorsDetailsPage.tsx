import * as React from 'react';
import { CORSRule } from '@aws-sdk/client-s3';
import { DetailsItem } from '@odf/core/components/resource-pages/CommonDetails';
import {
  NoobaaS3Provider,
  NoobaaS3Context,
} from '@odf/core/components/s3-browser/noobaa-context';
import { DASH } from '@odf/shared';
import { StatusBox } from '@odf/shared/generic/status-box';
import PageHeading from '@odf/shared/heading/page-heading';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { deepSortObject } from '@odf/shared/utils';
import * as _ from 'lodash-es';
import { murmur3 } from 'murmurhash-js';
import { useParams, useSearchParams } from 'react-router-dom-v5-compat';
import useSWR from 'swr';
import {
  TextContent,
  Text,
  TextVariants,
  TextInput,
} from '@patternfly/react-core';
import {
  RULE_NAME,
  RULE_HASH,
  BUCKET_CORS_RULE_CACHE_KEY_SUFFIX,
  BUCKETS_BASE_ROUTE,
} from '../../../constants';
import { isAllowAllConfig } from '../../../utils';

type CorsDetailsContentProps = { corsRule: CORSRule };

const CorsDetailsContent: React.FC<CorsDetailsContentProps> = ({
  corsRule,
}) => {
  const { t } = useCustomTranslation();

  const allOriginsAllowed = isAllowAllConfig(corsRule.AllowedOrigins);
  const allHeadersAllowed = isAllowAllConfig(corsRule.AllowedHeaders);

  return (
    <div className="pf-v5-u-m-md">
      <DetailsItem field={t('Rule name')}>{corsRule.ID || DASH}</DetailsItem>
      <DetailsItem field={t('Allowed origins')}>
        {allOriginsAllowed
          ? t('All origins')
          : corsRule.AllowedOrigins.map((origin, index) => (
              <TextInput
                key={origin + index}
                value={origin}
                className="pf-v5-u-mb-xs pf-v5-u-w-50"
                isDisabled
              />
            ))}
      </DetailsItem>
      <DetailsItem field={t('Allowed methods')}>
        {corsRule.AllowedMethods.join(', ')}
      </DetailsItem>
      <DetailsItem field={t('Allowed headers')}>
        {allHeadersAllowed
          ? t('All headers')
          : corsRule.AllowedHeaders?.map((header, index) => (
              <TextInput
                key={header + index}
                value={header}
                className="pf-v5-u-mb-xs pf-v5-u-w-50"
                isDisabled
              />
            )) || DASH}
      </DetailsItem>
      <DetailsItem field={t('Exposed headers')}>
        {corsRule.ExposeHeaders?.map((exposedHeader, index) => (
          <TextInput
            key={exposedHeader + index}
            value={exposedHeader}
            className="pf-v5-u-mb-xs pf-v5-u-w-50"
            isDisabled
          />
        )) || DASH}
      </DetailsItem>
      <DetailsItem field={t('Max age for preflight requests (in seconds)')}>
        {corsRule.MaxAgeSeconds || DASH}
      </DetailsItem>
    </div>
  );
};

const CorsDetails: React.FC = () => {
  const { t } = useCustomTranslation();

  const { bucketName } = useParams();
  const { noobaaS3 } = React.useContext(NoobaaS3Context);
  const [searchParams] = useSearchParams();
  const ruleName = searchParams.get(RULE_NAME);
  const ruleHash = searchParams.get(RULE_HASH);

  const {
    data,
    isLoading,
    error: loadError,
  } = useSWR(
    `${bucketName}-${BUCKET_CORS_RULE_CACHE_KEY_SUFFIX}`,
    () => noobaaS3.getBucketCors({ Bucket: bucketName }),
    {
      shouldRetryOnError: false,
    }
  );

  const [corsRule, searchError] = React.useMemo(() => {
    if (!_.isEmpty(data)) {
      if (!!ruleName) {
        return [data.CORSRules?.find((rule) => rule.ID === ruleName), null];
      } else if (!!ruleHash) {
        // fallback if rule name (ID) is missing
        return [
          data.CORSRules?.find(
            (rule) =>
              `${murmur3(JSON.stringify(deepSortObject(rule)))}` === ruleHash
          ),
          null,
        ];
      }
      return [{} as CORSRule, Error('Rule not found')];
    }

    return [{} as CORSRule, null];
  }, [data, ruleName, ruleHash]);

  if (isLoading || loadError || searchError) {
    return (
      <StatusBox
        loaded={!isLoading}
        loadError={isLoading ? '' : loadError || searchError}
      />
    );
  }

  return (
    <>
      <PageHeading
        breadcrumbs={[
          {
            name: t('Buckets'),
            path: BUCKETS_BASE_ROUTE,
          },
          {
            name: t('CORS'),
            path: `${BUCKETS_BASE_ROUTE}/${bucketName}/permissions/cors`,
          },
          {
            name: t('CORS details'),
            path: '',
          },
        ]}
        title={
          !!ruleName ? (
            <TextContent>
              <Text component={TextVariants.h1}>{ruleName}</Text>
            </TextContent>
          ) : null
        }
        // ToDo: add actions dropdown
        className="pf-v5-u-mt-md"
      />
      <CorsDetailsContent corsRule={corsRule} />
    </>
  );
};

export const CorsDetailsPage: React.FC = () => (
  <NoobaaS3Provider>
    <CorsDetails />
  </NoobaaS3Provider>
);
