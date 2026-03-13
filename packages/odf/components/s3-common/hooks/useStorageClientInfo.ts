import * as React from 'react';
import { useODFNamespaceSelector } from '@odf/core/redux';
import { ConfigMapModel, StorageClientModel } from '@odf/shared/models';
import { CLIENT_NOOBAA_EXPOSED_AS } from '@odf/shared/s3';
import { getName, getOwnerReferences, getUID } from '@odf/shared/selectors';
import { ConfigMapKind, StorageClient } from '@odf/shared/types';
import {
  isClientPlugin,
  getValidWatchK8sResourceObj,
  getAPIVersionForModel,
  referenceForModel,
} from '@odf/shared/utils';
import {
  WatchK8sResource,
  useK8sWatchResource,
  OwnerReference,
  K8sResourceCommon,
} from '@openshift-console/dynamic-plugin-sdk';

const EXTERNAL_ENDPOINTS_LABEL = 'ocs.openshift.io/external-endpoints';
const STORAGE_CLIENT_API_VERSION = getAPIVersionForModel(StorageClientModel);

const storageClientResource: WatchK8sResource = {
  kind: referenceForModel(StorageClientModel),
  isList: true,
};

const getExternalEndpointsConfigMapWatch = (
  namespace: string
): WatchK8sResource => ({
  kind: ConfigMapModel.kind,
  isList: true,
  namespaced: true,
  namespace,
  selector: {
    matchLabels: {
      [EXTERNAL_ENDPOINTS_LABEL]: 'true',
    },
  },
});

const getControllerOf = (obj: K8sResourceCommon): OwnerReference | undefined =>
  getOwnerReferences(obj)?.find((ref) => ref.controller);

type ExternalEndpointEntry = {
  exposeAs?: string;
  endpointUrl?: string;
};

const getNoobaaS3EndpointFromConfigMap = (cm: ConfigMapKind): string => {
  const raw = cm.data?.endpoints;
  if (!raw) {
    return '';
  }
  try {
    const endpoints = JSON.parse(raw) as ExternalEndpointEntry[];
    if (!Array.isArray(endpoints)) {
      return '';
    }
    return (
      endpoints.find((e) => e.exposeAs === CLIENT_NOOBAA_EXPOSED_AS)
        ?.endpointUrl ?? ''
    );
  } catch {
    return '';
  }
};

const isStorageClientControllerRef = (owner: OwnerReference): boolean =>
  !!owner.uid &&
  owner.kind === StorageClientModel.kind &&
  owner.apiVersion === STORAGE_CLIENT_API_VERSION;

export type StorageClientInfoData = {
  isClientCluster: boolean;
  clientUID: string;
  noobaaS3Endpoint: string;
};

type UseStorageClientInfo = () => {
  data: StorageClientInfoData;
  isLoaded: boolean;
  clientsError: unknown;
};

// We only need this hook for Client cluster users
export const useStorageClientInfo: UseStorageClientInfo = () => {
  const isClientCluster = isClientPlugin();
  const { odfNamespace, isODFNsLoaded, odfNsLoadError } =
    useODFNamespaceSelector();

  // Only watch when it's a client cluster (not needed for provider cluster)
  const [storageClients, storageClientsLoaded, storageClientsError] =
    useK8sWatchResource<StorageClient[]>(
      getValidWatchK8sResourceObj(storageClientResource, isClientCluster)
    );

  // Only watch when it's a client cluster and the namespace is loaded (not needed for provider cluster)
  const [configMaps, configMapsLoaded, configMapsError] = useK8sWatchResource<
    ConfigMapKind[]
  >(
    getValidWatchK8sResourceObj(
      getExternalEndpointsConfigMapWatch(odfNamespace),
      isClientCluster && isODFNsLoaded && !!odfNamespace
    )
  );

  const storageClientInfoData: StorageClientInfoData = React.useMemo(() => {
    if (!isClientCluster) {
      return {
        isClientCluster,
        clientUID: '',
        noobaaS3Endpoint: '',
      };
    }

    for (const cm of configMaps ?? []) {
      const ownerRef = getControllerOf(cm);
      if (ownerRef && isStorageClientControllerRef(ownerRef)) {
        const sc = storageClients?.find(
          (s) =>
            getName(s) === ownerRef.name &&
            !s.metadata?.deletionTimestamp &&
            getUID(s) === ownerRef.uid
        );
        if (!!sc) {
          const clientUID = getUID(sc) ?? '';
          const noobaaS3Endpoint = getNoobaaS3EndpointFromConfigMap(cm);

          return {
            isClientCluster,
            clientUID,
            noobaaS3Endpoint,
          };
        }
      }
    }

    return {
      isClientCluster,
      clientUID: '',
      noobaaS3Endpoint: '',
    };
  }, [configMaps, isClientCluster, storageClients]);

  const isLoaded =
    !isClientCluster ||
    (isODFNsLoaded && storageClientsLoaded && configMapsLoaded);

  const clientsError = React.useMemo(() => {
    if (odfNsLoadError || storageClientsError || configMapsError) {
      return odfNsLoadError || storageClientsError || configMapsError;
    }

    if (
      isClientCluster &&
      isLoaded &&
      !storageClientInfoData.noobaaS3Endpoint
    ) {
      return new Error('NooBaa S3 external endpoint is not available');
    }

    return undefined;
  }, [
    odfNsLoadError,
    storageClientsError,
    configMapsError,
    isClientCluster,
    isLoaded,
    storageClientInfoData.noobaaS3Endpoint,
  ]);

  return {
    data: storageClientInfoData,
    isLoaded,
    clientsError,
  };
};
