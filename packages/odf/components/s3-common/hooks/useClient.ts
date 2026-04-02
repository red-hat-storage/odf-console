import * as React from 'react';
import { S3ProviderType } from '@odf/core/types';
import { useDeepCompareMemoize } from '@odf/shared/hooks/deep-compare-memoize';
import { IamCommands } from '@odf/shared/iam';
import { S3Commands, S3_INTERNAL_ENDPOINT_PORT } from '@odf/shared/s3';
import { S3VectorsCommands } from '@odf/shared/s3-vectors';
import { SecretKind } from '@odf/shared/types';
import type { HttpRequest } from '@smithy/types';
import * as _ from 'lodash-es';
import { ProviderConfig } from '../registry/s3-providers';
import { ClientType } from '../types';

export type ClientCommandType = S3Commands | IamCommands | S3VectorsCommands;

type S3ClientMapProps = {
  s3Url: URL;
  s3ConsolePath: string | undefined;
  skipSignatureCalculation: boolean;
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  providerType: S3ProviderType;
};

const S3_CLIENT_MAP: Record<
  ClientType,
  (props: S3ClientMapProps) => ClientCommandType
> = {
  [ClientType.IAM]: (props) => {
    const { s3Url, accessKeyId, secretAccessKey } = props;
    return new IamCommands(s3Url.toString(), accessKeyId, secretAccessKey);
  },
  [ClientType.S3_VECTORS]: (props) => {
    const { s3Url, accessKeyId, secretAccessKey, region } = props;
    return new S3VectorsCommands(
      s3Url.toString(),
      accessKeyId,
      secretAccessKey,
      region
    );
  },
  [ClientType.S3]: (props) => {
    const {
      s3Url,
      accessKeyId,
      secretAccessKey,
      region,
      s3ConsolePath,
      skipSignatureCalculation,
      providerType,
    } = props;
    return new S3Commands(
      s3Url.toString(),
      accessKeyId,
      secretAccessKey,
      region,
      skipSignatureCalculation ? null : s3ConsolePath,
      providerType
    );
  },
};

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
        : `${s3Url.hostname}:${S3_INTERNAL_ENDPOINT_PORT}`;
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
    const mapProps: S3ClientMapProps = {
      s3Url,
      s3ConsolePath,
      skipSignatureCalculation,
      accessKeyId,
      secretAccessKey,
      region,
      providerType,
    };
    const client = S3_CLIENT_MAP[type](mapProps);
    if (!skipSignatureCalculation) {
      (client.middlewareStack as S3Commands['middlewareStack']).add(
        buildMiddleware,
        { step: 'build' }
      );
      (client.middlewareStack as S3Commands['middlewareStack']).add(
        finalizeMiddleware,
        { step: 'finalizeRequest' }
      );
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
