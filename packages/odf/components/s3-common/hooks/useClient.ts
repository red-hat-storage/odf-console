import * as React from 'react';
import { S3ProviderType } from '@odf/core/types';
import { IamCommands, IAM_INTERNAL_ENDPOINT_PORT } from '@odf/shared/iam';
import { S3Commands, S3_INTERNAL_ENDPOINT_PORT } from '@odf/shared/s3';
import {
  S3_VECTORS_INTERNAL_ENDPOINT_PORT,
  S3VectorsCommands,
} from '@odf/shared/s3-vectors';
import { SecretKind } from '@odf/shared/types';
import type { HttpRequest } from '@smithy/types';
import * as _ from 'lodash-es';
import { ProviderConfig } from '../registry/s3-providers';
import { ClientType } from '../types';

type ClientCommandType = S3Commands | IamCommands | S3VectorsCommands;

export const useClient = (
  secretData: SecretKind | null,
  secretFieldKeys: ProviderConfig['secretFieldKeys'],
  providerConfig: ProviderConfig | null,
  providerType: S3ProviderType,
  type: ClientType = ClientType.S3
): { client: ClientCommandType | null; error: unknown } => {
  return React.useMemo(() => {
    if (
      _.isEmpty(secretData) ||
      _.isEmpty(providerConfig) ||
      !secretFieldKeys
    ) {
      return { client: null, error: null };
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
          client: null,
          error: new Error('No endpoint for the provider'),
        };
      }

      if (!accessKeyId || !secretAccessKey) {
        return {
          client: null,
          error: new Error(
            'No access key or secret access key in the Secret data'
          ),
        };
      }

      let client: ClientCommandType;
      const internalEndpointPort =
        type === ClientType.IAM
          ? IAM_INTERNAL_ENDPOINT_PORT
          : type === ClientType.S3_VECTORS
            ? S3_VECTORS_INTERNAL_ENDPOINT_PORT
            : S3_INTERNAL_ENDPOINT_PORT;

      // Middleware for proxy handling:
      // We must include the port in the host header as the proxy does (it's omitted
      // if the port is the protocol default port e.g. 443 for 'https').
      // It must be done BEFORE signature calculation.
      const buildMiddleware = (next) => (args) => {
        const request: Partial<HttpRequest> = args.request;
        if ((s3Url as URL).protocol === 'https:') {
          request.headers['host'] =
            `${(s3Url as URL).hostname}:${internalEndpointPort}`;
        }
        return next(args);
      };

      // We must redirect the request to the proxy AFTER the signature calculation.
      const finalizeMiddleware = (next) => (args) => {
        const request: Partial<HttpRequest> = args.request;
        request.protocol = window.location.protocol;
        request.hostname = window.location.hostname;
        request.port = Number(window.location.port);
        request.path = `${s3ConsolePath}${request.path}`;
        return next(args);
      };

      if (type === ClientType.IAM) {
        client = new IamCommands(
          s3Url.toString(),
          accessKeyId,
          secretAccessKey
        );
        if (!skipSignatureCalculation) {
          client.middlewareStack.add(buildMiddleware, { step: 'build' });
          client.middlewareStack.add(finalizeMiddleware, {
            step: 'finalizeRequest',
          });
        }
      } else {
        client = new S3Commands(
          s3Url.toString(),
          accessKeyId,
          secretAccessKey,
          region,
          skipSignatureCalculation ? null : s3ConsolePath,
          providerType
        );
        if (!skipSignatureCalculation) {
          client.middlewareStack.add(buildMiddleware, { step: 'build' });
          client.middlewareStack.add(finalizeMiddleware, {
            step: 'finalizeRequest',
          });
        }
      }

      return { client, error: null };
    } catch (err) {
      return { client: null, error: err };
    }
  }, [secretData, secretFieldKeys, providerConfig, providerType, type]);
};
