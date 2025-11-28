import * as React from 'react';
import { IBM_SCALE_NAMESPACE } from '@odf/core/constants';
import { DaemonKind } from '@odf/core/types/scale';
import { DaemonModel } from '@odf/shared/models/scale';
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';

// Wait for the cluster to be ready
export const useWaitForClusterReady = () => {
  const [clusterReady, setClusterReady] = React.useState(false);
  const [resource, loaded, loadError] = useK8sWatchResource<DaemonKind>({
    groupVersionKind: {
      group: DaemonModel.apiGroup,
      version: DaemonModel.apiVersion,
      kind: DaemonModel.kind,
    },
    isList: true,
    namespaced: true,
    namespace: IBM_SCALE_NAMESPACE,
  });
  React.useEffect(() => {
    if (
      loaded &&
      !loadError &&
      resource?.status?.conditions?.some(
        (condition) => condition.type === 'Ready' && condition.status === 'True'
      )
    ) {
      setClusterReady(true);
    }
  }, [loaded, loadError, resource]);
  return clusterReady;
};
