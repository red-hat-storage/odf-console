import * as React from 'react';
import { S3ProviderType } from '@odf/core/types';
import { useDeepCompareMemoize } from '@odf/shared/hooks/deep-compare-memoize';
import { IamCommands, IAM_INTERNAL_ENDPOINT_PORT } from '@odf/shared/iam';
import { S3Commands, S3_INTERNAL_ENDPOINT_PORT } from '@odf/shared/s3';
import { SecretKind } from '@odf/shared/types';
import type { HttpRequest } from '@smithy/types';
import * as _ from 'lodash-es';
import { ProviderConfig } from '../registry/s3-providers';
import { ClientType } from '../types';

type ClientCommandType = S3Commands | IamCommands;

type CreateClientParams = {
  s3Url: URL | undefined;
  s3ConsolePath: string | undefined;
  skipSignatureCalculation: boolean;
  excludePortInSignature?: boolean;
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  type: ClientType;
  providerType: S3ProviderType;
};

const createClientFromEndpointConfig = (
  params: CreateClientParams
): { client: ClientCommandType | null; error: unknown } => {
  const {
    s3Url,
    s3ConsolePath,
    skipSignatureCalculation,
    excludePortInSignature,
    accessKeyId,
    secretAccessKey,
    region,
    type,
    providerType,
  } = params;

  if (!s3Url) {
    return { client: null, error: new Error('No endpoint for the provider') };
  }
  if (!accessKeyId || !secretAccessKey) {
    return {
      client: null,
      error: new Error('No access key or secret access key in the Secret data'),
    };
  }

  const internalEndpointPort =
    type === ClientType.IAM
      ? IAM_INTERNAL_ENDPOINT_PORT
      : S3_INTERNAL_ENDPOINT_PORT;

  // Middleware for proxy handling:
  // We must include the port in the host header as/if the proxy does (it's omitted
  // if the port is the protocol default port e.g. 443 for 'https').
  // Ex: For Provider cluster (console proxy), include the port as the proxy forwards it.
  // For Client cluster (nginx proxy), omit the port as the proxy forwards host without port.
  // It must be done BEFORE signature calculation.
  const buildMiddleware = (next) => (args) => {
    const request: Partial<HttpRequest> = args.request;
    if (s3Url.protocol === 'https:') {
      request.headers['host'] = excludePortInSignature
        ? s3Url.hostname
        : `${s3Url.hostname}:${internalEndpointPort}`;
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

  try {
    if (type === ClientType.IAM) {
      const client = new IamCommands(
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
      return { client, error: null };
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
      client.middlewareStack.add(buildMiddleware, { step: 'build' });
      client.middlewareStack.add(finalizeMiddleware, {
        step: 'finalizeRequest',
      });
    }
    return { client, error: null };
  } catch (err) {
    return { client: null, error: err };
  }
};

export type UseClientResult = {
  client: ClientCommandType | null;
  error: unknown;
  dataPathClient?: ClientCommandType | null;
};

export const useClient = (
  secretData: SecretKind | null,
  secretFieldKeys: ProviderConfig['secretFieldKeys'],
  providerConfig: ProviderConfig | null,
  providerType: S3ProviderType,
  type: ClientType = ClientType.S3
): UseClientResult => {
  const memoizedSecretData = useDeepCompareMemoize(secretData?.data);
  const memoizedSecretFieldKeys = useDeepCompareMemoize(secretFieldKeys);
  const memoizedProviderConfig = useDeepCompareMemoize(providerConfig);

  return React.useMemo((): UseClientResult => {
    if (
      _.isEmpty(memoizedSecretData) ||
      _.isEmpty(memoizedProviderConfig) ||
      !memoizedSecretFieldKeys
    ) {
      return { client: null, error: null };
    }

    try {
      const accessKeyId = atob(
        memoizedSecretData[memoizedSecretFieldKeys.accessKey] ||
          memoizedSecretData[memoizedSecretFieldKeys.fallBackAccessKey]
      );
      const secretAccessKey = atob(
        memoizedSecretData[memoizedSecretFieldKeys.secretKey] ||
          memoizedSecretData[memoizedSecretFieldKeys.fallBackSecretKey]
      );
      const region = memoizedProviderConfig.region;

      const main = createClientFromEndpointConfig({
        s3Url: memoizedProviderConfig.s3Endpoint,
        s3ConsolePath: memoizedProviderConfig.s3ConsolePath,
        skipSignatureCalculation:
          memoizedProviderConfig.skipSignatureCalculation,
        excludePortInSignature: memoizedProviderConfig.excludePortInSignature,
        accessKeyId,
        secretAccessKey,
        region,
        type,
        providerType,
      });

      if (main.error) {
        return { client: null, error: main.error };
      }

      const dataPathSeparation = memoizedProviderConfig.dataPathSeparation;
      if (!dataPathSeparation) {
        return { client: main.client, error: null };
      }

      const dataPath = createClientFromEndpointConfig({
        s3Url: dataPathSeparation.s3Endpoint,
        s3ConsolePath: dataPathSeparation.s3ConsolePath,
        skipSignatureCalculation: dataPathSeparation.skipSignatureCalculation,
        excludePortInSignature: dataPathSeparation.excludePortInSignature,
        accessKeyId,
        secretAccessKey,
        region,
        type,
        providerType,
      });

      return {
        client: main.client,
        error: null,
        dataPathClient: dataPath.client,
      };
    } catch (err) {
      return { client: null, error: err };
    }
  }, [
    memoizedSecretData,
    memoizedSecretFieldKeys,
    memoizedProviderConfig,
    providerType,
    type,
  ]);
};
