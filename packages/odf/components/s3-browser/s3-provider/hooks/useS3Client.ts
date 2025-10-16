import * as React from 'react';
import { S3Commands } from '@odf/shared/s3';
import { S3_INTERNAL_ENDPOINT_PORT } from '@odf/shared/s3';
import { getProxyPath } from '@odf/shared/s3/utils';
import { SecretKind } from '@odf/shared/types';
import type { HttpRequest } from '@smithy/types';
import * as _ from 'lodash-es';
import { PROVIDER_REGISTRY } from '../registry/providers';
import { S3ProviderType } from '../types';

export const useS3Client = (
  secretData: SecretKind | null,
  provider: S3ProviderType,
  odfNamespace: string,
  accessKeyField?: string,
  secretKeyField?: string,
  proxyPathFn: () => string = getProxyPath
): { s3Client: S3Commands | null; error: unknown } => {
  return React.useMemo(() => {
    if (_.isEmpty(secretData) || !accessKeyField || !secretKeyField) {
      return { s3Client: null, error: null };
    }

    try {
      const accessKeyId = atob(secretData.data?.[accessKeyField]);
      const secretAccessKey = atob(secretData.data?.[secretKeyField]);

      const entry = PROVIDER_REGISTRY[provider];
      const s3Url = entry.endpointBuilder?.(odfNamespace);
      const region = entry.region;

      if (!s3Url) {
        return {
          s3Client: null,
          error: new Error('No endpoint for the provider'),
        };
      }

      const proxyPath = proxyPathFn();
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
  }, [
    secretData,
    provider,
    odfNamespace,
    accessKeyField,
    secretKeyField,
    proxyPathFn,
  ]);
};
