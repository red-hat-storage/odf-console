import * as React from 'react';
import { useODFNamespaceSelector } from '@odf/core/redux';
import { ConfigMapModel, StorageClientModel } from '@odf/shared/models';
import { CLIENT_NOOBAA_EXPOSED_AS } from '@odf/shared/s3';
import { getName, getOwnerReferences } from '@odf/shared/selectors';
import { ConfigMapKind } from '@odf/shared/types';
import { isClientPlugin, getValidWatchK8sResourceObj } from '@odf/shared/utils';
import {
  WatchK8sResource,
  useK8sWatchResource,
  OwnerReference,
  K8sResourceCommon,
} from '@openshift-console/dynamic-plugin-sdk';

const HUB_S3_ENDPOINTS_LABEL = 'ocs.openshift.io/hub-s3-endpoints';

const getHubS3EndpointsConfigMapWatch = (
  namespace: string
): WatchK8sResource => ({
  kind: ConfigMapModel.kind,
  isList: true,
  namespaced: true,
  namespace,
  selector: {
    matchLabels: {
      [HUB_S3_ENDPOINTS_LABEL]: 'true',
    },
  },
});

const getControllerOf = (obj: K8sResourceCommon): OwnerReference | undefined =>
  getOwnerReferences(obj)?.find((ref) => ref.controller);

type S3EndpointConfigJson = {
  endpointUrl?: string;
};

const isValidHttpsEndpointUrl = (value: string): boolean => {
  try {
    const u = new URL(value);
    return u.protocol === 'https:' && u.hostname.length > 0;
  } catch {
    return false;
  }
};

const isStorageClientControllerKind = (owner: OwnerReference): boolean =>
  owner.kind === StorageClientModel.kind;

const getNoobaaS3UrlFromHubConfigMap = (cm: ConfigMapKind): string => {
  const rawCfg = cm?.data?.[CLIENT_NOOBAA_EXPOSED_AS];
  if (!String(rawCfg ?? '').trim()) {
    return '';
  }

  try {
    const cfg: S3EndpointConfigJson = JSON.parse(String(rawCfg));
    const url = cfg.endpointUrl?.trim() ?? '';
    if (url && isValidHttpsEndpointUrl(url)) {
      return url;
    }
  } catch {
    /* invalid JSON, ignore */
  }

  return '';
};

export type HubS3EndpointsData = {
  isClientCluster: boolean;
  uniqueIdentifier: string;
  noobaaS3Endpoint: string;
};

type UseHubS3Endpoints = () => {
  data: HubS3EndpointsData;
  isLoaded: boolean;
  hubS3EndpointsError: unknown;
};

// We only need this hook for Client cluster users
export const useHubS3Endpoints: UseHubS3Endpoints = () => {
  const isClientCluster = isClientPlugin();
  const { odfNamespace, isODFNsLoaded, odfNsLoadError } =
    useODFNamespaceSelector();

  const [configMaps, configMapsLoaded, configMapsError] = useK8sWatchResource<
    ConfigMapKind[]
  >(
    getValidWatchK8sResourceObj(
      getHubS3EndpointsConfigMapWatch(odfNamespace),
      isClientCluster && isODFNsLoaded && !!odfNamespace
    )
  );

  const hubS3EndpointsData: HubS3EndpointsData = React.useMemo(() => {
    if (!isClientCluster) {
      return {
        isClientCluster,
        uniqueIdentifier: '',
        noobaaS3Endpoint: '',
      };
    }

    for (const cm of configMaps ?? []) {
      if (!cm.metadata?.deletionTimestamp) {
        const ownerRef = getControllerOf(cm);
        if (ownerRef && isStorageClientControllerKind(ownerRef)) {
          const noobaaS3Endpoint = getNoobaaS3UrlFromHubConfigMap(cm);
          if (noobaaS3Endpoint) {
            return {
              isClientCluster,
              uniqueIdentifier: getName(cm),
              noobaaS3Endpoint,
            };
          }
        }
      }
    }

    return {
      isClientCluster,
      uniqueIdentifier: '',
      noobaaS3Endpoint: '',
    };
  }, [configMaps, isClientCluster]);

  const isLoaded = !isClientCluster || (isODFNsLoaded && configMapsLoaded);

  const hubS3EndpointsError = React.useMemo(() => {
    if (odfNsLoadError || configMapsError) {
      return odfNsLoadError || configMapsError;
    }

    if (isClientCluster && isLoaded && !hubS3EndpointsData.noobaaS3Endpoint) {
      return new Error('NooBaa S3 hub endpoint is not available');
    }

    return undefined;
  }, [
    odfNsLoadError,
    configMapsError,
    isClientCluster,
    isLoaded,
    hubS3EndpointsData.noobaaS3Endpoint,
  ]);

  return {
    data: hubS3EndpointsData,
    isLoaded,
    hubS3EndpointsError,
  };
};
