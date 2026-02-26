import * as React from 'react';
import { CORSRule, GetBucketCorsCommandOutput } from '@aws-sdk/client-s3';
import { DetailsItem } from '@odf/core/components/resource-pages/CommonDetails';
import {
  S3Provider,
  S3Context,
} from '@odf/core/components/s3-browser/s3-context';
import { S3ProviderType } from '@odf/core/types';
import { DASH } from '@odf/shared';
import { StatusBox } from '@odf/shared/generic/status-box';
import PageHeading from '@odf/shared/heading/page-heading';
import { S3Commands } from '@odf/shared/s3';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { deepSortObject } from '@odf/shared/utils';
import { useModal } from '@openshift-console/dynamic-plugin-sdk';
import { LaunchModal } from '@openshift-console/dynamic-plugin-sdk/lib/app/modal-support/ModalProvider';
import * as _ from 'lodash-es';
import { murmur3 } from 'murmurhash-js';
import { TFunction } from 'react-i18next';
import {
  useParams,
  useSearchParams,
  useNavigate,
  NavigateFunction,
} from 'react-router-dom-v5-compat';
import useSWR, { KeyedMutator } from 'swr';
import {
  Content,
  ContentVariants,
  TextInput,
  MenuToggle,
} from '@patternfly/react-core';
import {
  ActionsColumn,
  CustomActionsToggleProps,
} from '@patternfly/react-table';
import {
  RULE_NAME,
  RULE_HASH,
  BUCKET_CORS_RULE_CACHE_KEY_SUFFIX,
  BUCKETS_BASE_ROUTE,
  getBucketOverviewBaseRoute,
} from '../../../constants';
import { isAllowAllConfig } from '../../../utils';
import { getRowActions } from '../cors-rules-list/CORSRulesList';

type CorsDetailsContentProps = { corsRule: CORSRule };

const CustomActionsToggle = (props: CustomActionsToggleProps) => {
  const { t } = useCustomTranslation();

  return (
    <MenuToggle
      ref={props.toggleRef}
      onClick={props.onToggle}
      isDisabled={props.isDisabled}
    >
      {t('Actions')}
    </MenuToggle>
  );
};

const createCorsActions = (
  t: TFunction<string>,
  navigate: NavigateFunction,
  launcher: LaunchModal,
  mutate: KeyedMutator<GetBucketCorsCommandOutput>,
  s3Client: S3Commands,
  bucketName: string,
  ruleName: string,
  ruleHash: number
) => {
  return (
    <ActionsColumn
      items={getRowActions(
        t,
        navigate,
        launcher,
        mutate,
        s3Client,
        bucketName,
        ruleName,
        ruleHash,
        true
      )}
      actionsToggle={CustomActionsToggle}
    />
  );
};

const CorsDetailsContent: React.FC<CorsDetailsContentProps> = ({
  corsRule,
}) => {
  const { t } = useCustomTranslation();

  const allOriginsAllowed = isAllowAllConfig(corsRule.AllowedOrigins);
  const allHeadersAllowed = isAllowAllConfig(corsRule.AllowedHeaders);

  return (
    <div className="pf-v6-u-m-md">
      <DetailsItem field={t('Rule name')}>{corsRule.ID || DASH}</DetailsItem>
      <DetailsItem field={t('Allowed origins')}>
        {allOriginsAllowed
          ? t('All origins')
          : corsRule.AllowedOrigins.map((origin, index) => (
              <TextInput
                key={origin + index}
                value={origin}
                className="pf-v6-u-mb-xs pf-v6-u-w-50"
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
                className="pf-v6-u-mb-xs pf-v6-u-w-50"
                isDisabled
              />
            )) || DASH}
      </DetailsItem>
      <DetailsItem field={t('Exposed headers')}>
        {corsRule.ExposeHeaders?.map((exposedHeader, index) => (
          <TextInput
            key={exposedHeader + index}
            value={exposedHeader}
            className="pf-v6-u-mb-xs pf-v6-u-w-50"
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

  const launcher = useModal();
  const navigate = useNavigate();

  const { bucketName } = useParams();
  const { s3Client } = React.useContext(S3Context);
  const [searchParams] = useSearchParams();
  const ruleName = searchParams.get(RULE_NAME);
  const ruleHash = searchParams.get(RULE_HASH);
  const providerType = s3Client.providerType as S3ProviderType;

  const {
    data,
    isLoading,
    error: loadError,
    mutate,
  } = useSWR(
    `${s3Client.providerType}-${bucketName}-${BUCKET_CORS_RULE_CACHE_KEY_SUFFIX}`,
    () => s3Client.getBucketCors({ Bucket: bucketName }),
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
            path: `${getBucketOverviewBaseRoute(bucketName, providerType)}/permissions/cors`,
          },
          {
            name: t('CORS details'),
            path: '',
          },
        ]}
        title={
          !!ruleName ? (
            <Content>
              <Content component={ContentVariants.h1}>{ruleName}</Content>
            </Content>
          ) : null
        }
        actions={() =>
          createCorsActions(
            t,
            navigate,
            launcher,
            mutate,
            s3Client,
            bucketName,
            ruleName,
            !!ruleHash ? Number(ruleHash) : null
          )
        }
        className="pf-v6-u-mt-md"
      />
      <CorsDetailsContent corsRule={corsRule} />
    </>
  );
};

export const CorsDetailsPage: React.FC = () => (
  <S3Provider>
    <CorsDetails />
  </S3Provider>
);
