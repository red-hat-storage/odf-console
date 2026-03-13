import * as React from 'react';
import { getUID } from '@odf/shared';
import { StorageClientModel } from '@odf/shared/models';
import { CLIENT_NOOBAA_EXPOSED_AS } from '@odf/shared/s3';
import { StorageClient } from '@odf/shared/types';
import {
  isClientPlugin,
  getValidWatchK8sResourceObj,
  referenceForModel,
} from '@odf/shared/utils';
import {
  WatchK8sResource,
  useK8sWatchResource,
} from '@openshift-console/dynamic-plugin-sdk';

const storageClientResource: WatchK8sResource = {
  kind: referenceForModel(StorageClientModel),
  isList: true,
};

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

  // Only watch when it's a client cluster (not needed for provider cluster)
  const [storageClients, storageClientsLoaded, storageClientsError] =
    useK8sWatchResource<StorageClient[]>(
      getValidWatchK8sResourceObj(storageClientResource, isClientCluster)
    );

  const storageClientInfoData: StorageClientInfoData = React.useMemo(() => {
    const storageClient = storageClients?.[0];

    return {
      isClientCluster,
      clientUID: getUID(storageClient),
      noobaaS3Endpoint:
        storageClient?.status?.externalEndpoints?.[CLIENT_NOOBAA_EXPOSED_AS] ??
        '',
    };
  }, [storageClients, isClientCluster]);

  const clientsError = React.useMemo(() => {
    if (storageClientsError) {
      return storageClientsError;
    }
    if (
      isClientCluster &&
      storageClientsLoaded &&
      !storageClientInfoData.noobaaS3Endpoint
    ) {
      return new Error('NooBaa S3 external endpoint is not available');
    }
    return undefined;
  }, [
    storageClientsError,
    isClientCluster,
    storageClientsLoaded,
    storageClientInfoData.noobaaS3Endpoint,
  ]);

  return {
    data: storageClientInfoData,
    isLoaded: storageClientsLoaded,
    clientsError,
  };
};
