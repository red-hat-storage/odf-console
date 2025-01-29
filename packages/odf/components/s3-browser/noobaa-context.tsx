import * as React from 'react';
import { useSafeK8sGet } from '@odf/core/hooks';
import { useODFNamespaceSelector } from '@odf/core/redux';
import { StatusBox } from '@odf/shared/generic/status-box';
import { SecretModel } from '@odf/shared/models';
import {
  ODF_S3_PROXY_PATH,
  S3_INTERNAL_ENDPOINT_PORT,
  S3_INTERNAL_ENDPOINT_PREFIX,
  S3_INTERNAL_ENDPOINT_SUFFIX,
  S3_LOCAL_ENDPOINT,
  S3Commands,
} from '@odf/shared/s3';
import { SecretKind } from '@odf/shared/types';
import type { HttpRequest } from '@smithy/types';
import * as _ from 'lodash-es';
import {
  NOOBAA_ADMIN_SECRET,
  NOOBAA_ACCESS_KEY_ID,
  NOOBAA_SECRET_ACCESS_KEY,
} from '../../constants';

const getS3Url = (odfNamespace: string) => {
  return new URL(
    window.location.hostname.includes('localhost')
      ? S3_LOCAL_ENDPOINT
      : `${S3_INTERNAL_ENDPOINT_PREFIX}${odfNamespace}${S3_INTERNAL_ENDPOINT_SUFFIX}`
  );
};

type NoobaaS3ContextType = {
  noobaaS3: S3Commands;
  noobaaS3Route: string;
};

type NoobaaS3ProviderType = {
  loading?: boolean;
  error?: unknown;
};

export const NoobaaS3Context = React.createContext<NoobaaS3ContextType>(
  {} as NoobaaS3ContextType
);

// ToDo: In case this provider is needed at too many places, consider applying it to the console's root or use redux instead
export const NoobaaS3Provider: React.FC<NoobaaS3ProviderType> = ({
  children,
  loading,
  error,
}) => {
  const { odfNamespace, isODFNsLoaded, odfNsLoadError } =
    useODFNamespaceSelector();

  const [secretData, secretLoaded, secretError] = useSafeK8sGet<SecretKind>(
    SecretModel,
    NOOBAA_ADMIN_SECRET
  );

  const s3Route = React.useRef<string>();

  const [noobaaS3, noobaaS3Error]: [S3Commands, unknown] = React.useMemo(() => {
    if (!_.isEmpty(secretData)) {
      try {
        // We initially set the S3 endpoint (instead of the proxy endpoint) so the
        // signature calculation is done correctly.
        const s3Url = getS3Url(odfNamespace);
        s3Route.current = s3Url.toString();
        const accessKeyId = atob(secretData.data?.[NOOBAA_ACCESS_KEY_ID]);
        const secretAccessKey = atob(
          secretData.data?.[NOOBAA_SECRET_ACCESS_KEY]
        );
        const client = new S3Commands(
          s3Route.current,
          accessKeyId,
          secretAccessKey
        );

        // We must include the port in the host header as the proxy does (it's omitted
        // if the port is the protocol default port e.g. 443 for 'https').
        // It must be done BEFORE signature calculation.
        client.middlewareStack.add(
          (next) => (args) => {
            const request: Partial<HttpRequest> = args.request;
            if (s3Url.protocol === 'https:') {
              request.headers[
                'host'
              ] = `${s3Url.hostname}:${S3_INTERNAL_ENDPOINT_PORT}`;
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
            request.path = `${ODF_S3_PROXY_PATH}${request.path}`;
            return next(args);
          },
          { step: 'finalizeRequest' }
        );

        return [client, null];
      } catch (err) {
        return [{} as S3Commands, err];
      }
    }
    return [{} as S3Commands, null];
  }, [secretData, odfNamespace]);

  const allLoaded =
    isODFNsLoaded && secretLoaded && !loading && !_.isEmpty(noobaaS3);
  const anyError = odfNsLoadError || secretError || noobaaS3Error || error;

  const contextData = React.useMemo(() => {
    return { noobaaS3, noobaaS3Route: s3Route.current };
  }, [noobaaS3]);

  return allLoaded && !anyError ? (
    <NoobaaS3Context.Provider value={contextData}>
      {children}
    </NoobaaS3Context.Provider>
  ) : (
    <StatusBox loaded={allLoaded} loadError={anyError} />
  );
};
