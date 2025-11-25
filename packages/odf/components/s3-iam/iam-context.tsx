import * as React from 'react';
import {
  NOOBAA_ACCESS_KEY_ID,
  NOOBAA_ADMIN_SECRET,
  NOOBAA_SECRET_ACCESS_KEY,
} from '@odf/core/constants';
import { useSafeK8sGet } from '@odf/core/hooks';
import { useODFNamespaceSelector } from '@odf/core/redux';
import { SecretKind, SecretModel, StatusBox } from '@odf/shared';
import {
  ODF_S3_IAM_PROXY_PATH,
  S3IAMCommands,
  S3_IAM_INTERNAL_ENDPOINT_PORT,
  S3_IAM_INTERNAL_ENDPOINT_PREFIX,
  S3_IAM_INTERNAL_ENDPOINT_SUFFIX,
  S3_IAM_LOCAL_ENDPOINT,
} from '@odf/shared/iam';
import type { HttpRequest } from '@smithy/types';
import * as _ from 'lodash-es';

const getS3IAMUrl = (odfNamespace: string) => {
  return new URL(
    window.location.hostname.includes('localhost')
      ? S3_IAM_LOCAL_ENDPOINT
      : `${S3_IAM_INTERNAL_ENDPOINT_PREFIX}${odfNamespace}${S3_IAM_INTERNAL_ENDPOINT_SUFFIX}}`
  );
};

type NoobaaS3IAMContextType = {
  noobaaS3IAM: S3IAMCommands;
  noobaaS3IAMRoute: string;
};

type NoobaaS3IAMProviderType = {
  loading?: boolean;
  error?: unknown;
};

export const NoobaaS3IAMContext = React.createContext<NoobaaS3IAMContextType>(
  {} as NoobaaS3IAMContextType
);

export const NoobaaS3IAMProvider: React.FC<NoobaaS3IAMProviderType> = ({
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
  const s3IAMRoute = React.useRef<string>();

  const [noobaaS3IAM, noobaaS3IAMError]: [S3IAMCommands, unknown] =
    React.useMemo(() => {
      if (!_.isEmpty(secretData)) {
        try {
          // We initially set the S3 IAM endpoint (instead of the proxy endpoint) so the
          // signature calculation is done correctly.
          const s3IAMUrl = getS3IAMUrl(odfNamespace);
          s3IAMRoute.current = s3IAMUrl.toString();
          const accessKeyId = atob(secretData.data?.[NOOBAA_ACCESS_KEY_ID]);
          const secretAccessKey = atob(
            secretData.data?.[NOOBAA_SECRET_ACCESS_KEY]
          );
          const client = new S3IAMCommands(
            s3IAMRoute.current,
            accessKeyId,
            secretAccessKey
          );

          // We must include the port in the host header as the proxy does (it's omitted
          // if the port is the protocol default port e.g. 443 for 'https').
          // It must be done BEFORE signature calculation.
          client.middlewareStack.add(
            (next) => (args) => {
              const request: Partial<HttpRequest> = args.request;
              if (s3IAMUrl.protocol === 'https:') {
                request.headers['host'] =
                  `${s3IAMUrl.hostname}:${S3_IAM_INTERNAL_ENDPOINT_PORT}`;
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
              request.hostname = window.location.pathname;
              request.port = Number(window.location.port);
              request.path = `${ODF_S3_IAM_PROXY_PATH}${request.path}`;
              return next(args);
            },
            { step: 'finalizeRequest' }
          );
          return [client, null];
        } catch (err) {
          return [{} as S3IAMCommands, err];
        }
      }
      return [{} as S3IAMCommands, null];
    }, [secretData, odfNamespace]);

  const allLoaded =
    isODFNsLoaded && secretLoaded && !loading && !_.isEmpty(noobaaS3IAM);
  const anyError = odfNsLoadError || secretError || noobaaS3IAMError || error;

  const contextData = React.useMemo(() => {
    return { noobaaS3IAM, noobaaS3IAMRoute: s3IAMRoute.current };
  }, [noobaaS3IAM]);

  return allLoaded && !anyError ? (
    <NoobaaS3IAMContext.Provider value={contextData}>
      {children}
    </NoobaaS3IAMContext.Provider>
  ) : (
    <StatusBox loaded={allLoaded} loadError={anyError} />
  );
};
