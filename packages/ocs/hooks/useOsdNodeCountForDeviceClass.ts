import * as React from 'react';
import { getOsdPodsByDeviceClassResource } from '@odf/core/resources';
import { PodKind } from '@odf/shared/types';
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';

export type OsdNodeCountForDeviceClassResult = {
  nodeCount: number;
  loaded: boolean;
  loadError: unknown;
};

export const useOsdNodeCountForDeviceClass = (
  namespace: string | undefined,
  deviceClass: string | undefined
): OsdNodeCountForDeviceClassResult => {
  const ns = namespace;
  const dc = deviceClass;
  const canWatch = !!ns && !!dc;

  const [pods, loaded, loadError] = useK8sWatchResource<PodKind[]>(
    canWatch ? getOsdPodsByDeviceClassResource(ns, dc) : null
  );

  return React.useMemo(() => {
    if (!canWatch) {
      return { nodeCount: 0, loaded: true, loadError: undefined };
    }

    const nodes = new Set<string>();
    for (const pod of pods ?? []) {
      if (pod.spec?.nodeName) nodes.add(pod.spec.nodeName);
    }

    return {
      nodeCount: nodes.size,
      loaded,
      loadError: loadError ?? undefined,
    };
  }, [canWatch, loaded, loadError, pods]);
};
