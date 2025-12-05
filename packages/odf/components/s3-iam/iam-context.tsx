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
  ODF_IAM_PROXY_PATH,
  IamCommands,
  IAM_INTERNAL_ENDPOINT_PORT,
  IAM_INTERNAL_ENDPOINT_PREFIX,
  IAM_INTERNAL_ENDPOINT_SUFFIX,
  IAM_LOCAL_ENDPOINT,
} from '@odf/shared/iam';
import type { HttpRequest } from '@smithy/types';
import * as _ from 'lodash-es';

const getIamUrl = (odfNamespace: string) => {
  return new URL(
    window.location.hostname.includes('localhost')
      ? IAM_LOCAL_ENDPOINT
      : `${IAM_INTERNAL_ENDPOINT_PREFIX}${odfNamespace}${IAM_INTERNAL_ENDPOINT_SUFFIX}}`
  );
};

type IamContextType = {
  iamClient: IamCommands;
  iamRoute: string;
};

type IamProviderType = {
  loading?: boolean;
  error?: unknown;
};

export const IamContext = React.createContext<IamContextType>(
  {} as IamContextType
);

export const IamProvider: React.FC<IamProviderType> = ({
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
  const iamRoute = React.useRef<string>();

  const [iamClient, iamClientError]: [IamCommands, unknown] =
    React.useMemo(() => {
      if (!_.isEmpty(secretData)) {
        try {
          // We initially set the S3 IAM endpoint (instead of the proxy endpoint) so the
          // signature calculation is done correctly.
          const iamUrl = getIamUrl(odfNamespace);
          iamRoute.current = iamUrl.toString();
          const accessKeyId = atob(secretData.data?.[NOOBAA_ACCESS_KEY_ID]);
          const secretAccessKey = atob(
            secretData.data?.[NOOBAA_SECRET_ACCESS_KEY]
          );
          const client = new IamCommands(
            iamRoute.current,
            accessKeyId,
            secretAccessKey
          );

          // We must include the port in the host header as the proxy does (it's omitted
          // if the port is the protocol default port e.g. 443 for 'https').
          // It must be done BEFORE signature calculation.
          client.middlewareStack.add(
            (next) => (args) => {
              const request: Partial<HttpRequest> = args.request;
              if (iamUrl.protocol === 'https:') {
                request.headers['host'] =
                  `${iamUrl.hostname}:${IAM_INTERNAL_ENDPOINT_PORT}`;
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
              request.path = `${ODF_IAM_PROXY_PATH}${request.path}`;
              return next(args);
            },
            { step: 'finalizeRequest' }
          );
          return [client, null];
        } catch (err) {
          return [{} as IamCommands, err];
        }
      }
      return [{} as IamCommands, null];
    }, [secretData, odfNamespace]);

  const allLoaded =
    isODFNsLoaded && secretLoaded && !loading && !_.isEmpty(iamClient);
  const anyError = odfNsLoadError || secretError || iamClientError || error;

  const contextData = React.useMemo(() => {
    return { iamClient, iamRoute: iamRoute.current };
  }, [iamClient]);

  return allLoaded && !anyError ? (
    <IamContext.Provider value={contextData}>{children}</IamContext.Provider>
  ) : (
    <StatusBox loaded={allLoaded} loadError={anyError} />
  );
};
