import * as React from 'react';
import { CORSRule } from '@aws-sdk/client-s3';
import { BUCKET_CORS_RULE_CACHE_KEY_SUFFIX } from '@odf/core/constants';
import { isNoCorsRuleError } from '@odf/shared/s3/utils';
import { isClientPlugin } from '@odf/shared/utils';
import { useParams } from 'react-router-dom-v5-compat';
import useSWR from 'swr';
import { AllowedMethods } from '../create-or-edit-cors-rules/reducer';
import { S3Context } from '../s3-context';

function ruleAllowsConsoleWithAllMethods(rule: CORSRule): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const origin = window.location.origin;
  const allowedOrigins = rule.AllowedOrigins ?? [];
  const originMatches = allowedOrigins.some((o) => o === '*' || o === origin);
  if (!originMatches) {
    return false;
  }

  const methods = new Set(
    (rule.AllowedMethods ?? []).map((m) => m.toUpperCase())
  );
  return Object.values(AllowedMethods).every((m) => methods.has(m));
}

// We only need this hook for Client cluster users
export const useIsClientCorsConfigured = (): boolean => {
  const { bucketName } = useParams();
  const { s3Client } = React.useContext(S3Context);
  const isClientCluster = isClientPlugin();

  // Only fetch when client cluster and bucket name is present
  const swrKey =
    isClientCluster && bucketName
      ? `${s3Client.providerType}-${bucketName}-${BUCKET_CORS_RULE_CACHE_KEY_SUFFIX}`
      : null;

  const { data, error, isLoading } = useSWR(
    swrKey,
    () => s3Client.getBucketCors({ Bucket: bucketName }),
    { shouldRetryOnError: true }
  );

  if (!isClientCluster || !swrKey) {
    return true;
  }

  const noRuleExistsError = isNoCorsRuleError(error);
  // in case of "noRuleExistsError" error, cache could still have older "data", hence clearing that.
  const corsRules: CORSRule[] = noRuleExistsError ? [] : data?.CORSRules || [];

  // default to true, no need to block users from performing actions
  // browser will automatically reject that request if CORS is not configured
  if ((error && !noRuleExistsError) || isLoading) {
    return true;
  }

  // this means request succeeded but no CORS rules are configured
  if (!corsRules.length) {
    return false;
  }

  return corsRules.some(ruleAllowsConsoleWithAllMethods);
};
