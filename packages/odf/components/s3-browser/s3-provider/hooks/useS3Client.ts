import * as React from 'react';
import { S3ProviderType } from '@odf/core/types';
import { S3Commands } from '@odf/shared/s3';
import { S3_INTERNAL_ENDPOINT_PORT } from '@odf/shared/s3';
import { SecretKind } from '@odf/shared/types';
import type { HttpRequest } from '@smithy/types';
import * as _ from 'lodash-es';
import { ProviderConfig } from '../registry/providers';

export const useS3Client = (
  secretData: SecretKind | null,
  secretFieldKeys: ProviderConfig['secretFieldKeys'],
  providerConfig: ProviderConfig | null,
  providerType: S3ProviderType
): { s3Client: S3Commands | null; error: unknown } => {
  return React.useMemo(() => {
    if (
      _.isEmpty(secretData) ||
      _.isEmpty(providerConfig) ||
      !secretFieldKeys
    ) {
      return { s3Client: null, error: null };
    }

    try {
      const accessKeyId = atob(
        secretData.data?.[secretFieldKeys.accessKey] ||
          secretData.data?.[secretFieldKeys.fallBackAccessKey]
      );
      const secretAccessKey = atob(
        secretData.data?.[secretFieldKeys.secretKey] ||
          secretData.data?.[secretFieldKeys.fallBackSecretKey]
      );

      const skipSignatureCalculation = providerConfig.skipSignatureCalculation;

      const region = providerConfig.region;
      const s3ConsolePath = providerConfig.s3ConsolePath;
      const s3Url = skipSignatureCalculation
        ? s3ConsolePath
        : providerConfig.s3Endpoint;

      if (!s3Url) {
        return {
          s3Client: null,
          error: new Error('No endpoint for the provider'),
        };
      }

      if (!accessKeyId || !secretAccessKey) {
        return {
          s3Client: null,
          error: new Error(
            'No access key or secret access key in the Secret data'
          ),
        };
      }

      const client = new S3Commands(
        s3Url.toString(),
        accessKeyId,
        secretAccessKey,
        region,
        skipSignatureCalculation ? null : s3ConsolePath,
        providerType
      );

      if (!skipSignatureCalculation) {
        // Middleware for proxy handling:
        // We must include the port in the host header as the proxy does (it's omitted
        // if the port is the protocol default port e.g. 443 for 'https').
        // It must be done BEFORE signature calculation.
        client.middlewareStack.add(
          (next) => (args) => {
            const request: Partial<HttpRequest> = args.request;
            if ((s3Url as URL).protocol === 'https:') {
              request.headers['host'] =
                `${(s3Url as URL).hostname}:${S3_INTERNAL_ENDPOINT_PORT}`;
            }
            return next(args);
          },
          { step: 'build' }
        );

        // We must redirect the request to the proxy AFTER the signature calculation.
        client.middlewareStack.add(
          (next) => (args) => {
            const request: Partial<HttpRequest> = args.request;
            request.protocol = window.location.protocol;
            request.hostname = window.location.hostname;
            request.port = Number(window.location.port);
            request.path = `${s3ConsolePath}${request.path}`;
            return next(args);
          },
          { step: 'finalizeRequest' }
        );
      }

      return { s3Client: client, error: null };
    } catch (err) {
      return { s3Client: null, error: err };
    }
  }, [secretData, secretFieldKeys, providerConfig, providerType]);
};
