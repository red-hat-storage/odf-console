import * as React from 'react';
import {
  getOsdPodsByDeviceClassResource,
  getOsdPodsByDeviceSetResource,
} from '@odf/core/resources';
import { PodKind, StorageClusterKind } from '@odf/shared/types';
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';

export type OsdNodeCountForDeviceClassResult = {
  nodeCount: number;
  loaded: boolean;
  loadError: unknown;
};

export const useOsdNodeCountForDeviceClass = (
  namespace: string | undefined,
  deviceClass: string | undefined,
  storageCluster: StorageClusterKind | undefined,
  storageClusterFetchReady: boolean
): OsdNodeCountForDeviceClassResult => {
  const ns = namespace?.trim();
  const dc = deviceClass?.trim();
  const canWatch = Boolean(ns && dc);

  const pathAActive =
    canWatch && storageClusterFetchReady && storageCluster != null;

  const [podsPathA, loadedA, errorA] = useK8sWatchResource<PodKind[]>(
    pathAActive ? getOsdPodsByDeviceSetResource(ns, dc, storageCluster) : null
  );
  const [podsPathB, loadedB, errorB] = useK8sWatchResource<PodKind[]>(
    canWatch ? getOsdPodsByDeviceClassResource(ns, dc) : null
  );

  return React.useMemo(() => {
    if (!canWatch) {
      return { nodeCount: 0, loaded: true, loadError: undefined };
    }

    const loaded = loadedB && (!pathAActive || loadedA);
    const loadError = errorB ?? (pathAActive ? errorA : undefined);

    const nodes = new Set<string>();
    for (const pod of podsPathB ?? []) {
      if (pod.spec?.nodeName) nodes.add(pod.spec.nodeName);
    }
    for (const pod of podsPathA ?? []) {
      if (pod.spec?.nodeName) nodes.add(pod.spec.nodeName);
    }

    return {
      nodeCount: nodes.size,
      loaded,
      loadError: loadError ?? undefined,
    };
  }, [
    canWatch,
    pathAActive,
    loadedA,
    loadedB,
    errorA,
    errorB,
    podsPathA,
    podsPathB,
  ]);
};
