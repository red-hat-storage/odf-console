import * as React from 'react';
import { S3Commands } from '@odf/shared/s3';
import { S3_INTERNAL_ENDPOINT_PORT } from '@odf/shared/s3';
import { SecretKind } from '@odf/shared/types';
import type { HttpRequest } from '@smithy/types';
import * as _ from 'lodash-es';
import { ProviderConfig } from '../registry/providers';

export const useS3Client = (
  secretData: SecretKind | null,
  accessKeyField: string | undefined,
  secretKeyField: string | undefined,
  providerConfig: ProviderConfig | null
): { s3Client: S3Commands | null; error: unknown } => {
  return React.useMemo(() => {
    if (
      _.isEmpty(secretData) ||
      _.isEmpty(providerConfig) ||
      !accessKeyField ||
      !secretKeyField
    ) {
      return { s3Client: null, error: null };
    }

    try {
      const accessKeyId = atob(secretData.data?.[accessKeyField]);
      const secretAccessKey = atob(secretData.data?.[secretKeyField]);

      const s3Url = providerConfig.endpoint;
      const region = providerConfig.region;
      const proxyPath = providerConfig.proxyPath;

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
        proxyPath
      );

      // Middleware for proxy handling:
      // We must include the port in the host header as the proxy does (it's omitted
      // if the port is the protocol default port e.g. 443 for 'https').
      // It must be done BEFORE signature calculation.
      client.middlewareStack.add(
        (next) => (args) => {
          const request: Partial<HttpRequest> = args.request;
          if (s3Url.protocol === 'https:') {
            request.headers['host'] =
              `${s3Url.hostname}:${S3_INTERNAL_ENDPOINT_PORT}`;
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
          request.path = `${proxyPath}${request.path}`;
          return next(args);
        },
        { step: 'finalizeRequest' }
      );

      return { s3Client: client, error: null };
    } catch (err) {
      return { s3Client: null, error: err };
    }
  }, [secretData, accessKeyField, secretKeyField, providerConfig]);
};
