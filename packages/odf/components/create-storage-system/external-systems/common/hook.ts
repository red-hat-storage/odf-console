import * as React from 'react';
import { IBM_SCALE_LOCAL_CLUSTER_NAME } from '@odf/core/constants';
import { ClusterKind } from '@odf/core/types/scale';
import { ClusterModel } from '@odf/shared/models/scale';
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';
import * as _ from 'lodash-es';

export const useIsLocalClusterConfigured = () => {
  const localClusterRef = React.useRef<ClusterKind>(null);

  const [localCluster, isLocalClusterLoaded, localClusterError] =
    useK8sWatchResource<ClusterKind>({
      groupVersionKind: {
        group: ClusterModel.apiGroup,
        version: ClusterModel.apiVersion,
        kind: ClusterModel.kind,
      },
      isList: false,
      name: IBM_SCALE_LOCAL_CLUSTER_NAME,
    });

  if (!_.isEmpty(localClusterRef.current)) {
    return localClusterRef.current;
  }

  if (isLocalClusterLoaded && !localClusterError && !_.isEmpty(localCluster)) {
    localClusterRef.current = localCluster;
    return localCluster;
  }

  return null;
};
