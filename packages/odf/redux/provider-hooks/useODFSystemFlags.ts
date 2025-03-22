import * as React from 'react';
import {
  isMCGStandaloneCluster,
  isExternalCluster,
  isClusterIgnored,
  isNFSEnabled,
} from '@odf/core/utils';
import { CephObjectStoreModel, NooBaaSystemModel } from '@odf/shared';
import { useDeepCompareMemoize } from '@odf/shared/hooks/deep-compare-memoize';
import {
  CephClusterModel,
  StorageClusterModel,
  ODFStorageSystem,
} from '@odf/shared/models';
import {
  getName,
  getNamespace,
  getOwnerReferences,
} from '@odf/shared/selectors';
import {
  StorageClusterKind,
  CephClusterKind,
  NoobaaSystemKind,
  K8sResourceKind,
} from '@odf/shared/types';
import { referenceForModel } from '@odf/shared/utils';
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';
import { ODFSystemFlagsPayload } from '../actions';
import { useODFSystemFlagsDispatch } from '../dispatchers';

const watchResources = {
  scs: {
    kind: referenceForModel(StorageClusterModel),
    isList: true,
  },
  ccs: {
    kind: referenceForModel(CephClusterModel),
    isList: true,
  },
  coss: {
    kind: referenceForModel(CephObjectStoreModel),
    isList: true,
  },
  nss: {
    kind: referenceForModel(NooBaaSystemModel),
    isList: true,
  },
};

type UseODFSystemFlagsPayload = {
  storageClusters: StorageClusterKind[];
  cephClusters: CephClusterKind[];
  objectStores: K8sResourceKind[];
  noobaas: NoobaaSystemKind[];
  allLoaded: boolean;
  anyError: Error;
};

const useODFSystemFlagsPayload = ({
  storageClusters,
  cephClusters,
  objectStores,
  noobaas,
  allLoaded,
  anyError,
}: UseODFSystemFlagsPayload): ODFSystemFlagsPayload => {
  const payload: ODFSystemFlagsPayload = React.useMemo(() => {
    if (allLoaded && !anyError) {
      return storageClusters?.reduce(
        (acc: ODFSystemFlagsPayload, sc) => {
          if (!isClusterIgnored(sc)) {
            const clusterNamespace = getNamespace(sc);
            const ceph = cephClusters?.find(
              (cc) => getNamespace(cc) === clusterNamespace
            );
            const cephObjStore = objectStores?.find(
              (cos) => getNamespace(cos) === clusterNamespace
            );
            const noobaa = noobaas?.find(
              (ns) => getNamespace(ns) === clusterNamespace
            );

            const odfSystemFlags = {
              odfSystemName: getOwnerReferences(sc)?.find(
                (o) => o.kind === ODFStorageSystem.kind
              )?.name,
              ocsClusterName: getName(sc),
              // Set to "true" if it is internal mode StorageCluster
              isInternalMode: !isExternalCluster(sc),
              // Set to "true" if it is external mode StorageCluster
              isExternalMode: isExternalCluster(sc),
              // Based on the existence of NooBaa only system (no Ceph)
              isNoobaaStandalone: isMCGStandaloneCluster(sc),
              // Based on the existence of NooBaa CR
              isNoobaaAvailable: !!noobaa,
              // Based on the existence of Ceph CR
              isCephAvailable: !!ceph,
              // Based on the existence of CephObjectStore CR
              isRGWAvailable: !!cephObjStore,
              // Based on the enablement of NFS from StorageCluster spec
              isNFSEnabled: isNFSEnabled(sc),
            };
            acc.systemFlags[clusterNamespace] = odfSystemFlags;
          }
          return acc;
        },
        {
          systemFlags: {},
          areFlagsLoaded: allLoaded,
          flagsLoadError: anyError,
        } as ODFSystemFlagsPayload
      );
    }
    return {
      systemFlags: {},
      areFlagsLoaded: allLoaded,
      flagsLoadError: anyError,
    };
  }, [
    storageClusters,
    cephClusters,
    objectStores,
    noobaas,
    allLoaded,
    anyError,
  ]);

  return useDeepCompareMemoize(payload);
};

export const useODFSystemFlags = (): void => {
  const dispatch = useODFSystemFlagsDispatch();

  const [storageClusters, scLoaded, scError] = useK8sWatchResource<
    StorageClusterKind[]
  >(watchResources.scs);
  const [cephClusters, ccLoaded, ccError] = useK8sWatchResource<
    CephClusterKind[]
  >(watchResources.ccs);
  const [objectStores, cosLoaded, cosError] = useK8sWatchResource<
    K8sResourceKind[]
  >(watchResources.coss);
  const [noobaas, nsLoaded, nsError] = useK8sWatchResource<NoobaaSystemKind[]>(
    watchResources.nss
  );

  const allLoaded = scLoaded && ccLoaded && cosLoaded && nsLoaded;
  const anyError = scError || ccError || cosError || nsError;

  const memoizedPayload = useODFSystemFlagsPayload({
    storageClusters,
    cephClusters,
    objectStores,
    noobaas,
    allLoaded,
    anyError,
  });

  React.useEffect(() => dispatch(memoizedPayload), [dispatch, memoizedPayload]);
};
