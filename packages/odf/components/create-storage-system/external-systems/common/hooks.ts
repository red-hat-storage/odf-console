import * as React from 'react';
import {
  IBM_SCALE_LOCAL_CLUSTER_NAME,
  IBM_SCALE_NAMESPACE,
} from '@odf/core/constants';
import { ClusterKind } from '@odf/core/types/scale';
import { ClusterModel } from '@odf/shared/models/scale';
import { isNotFoundError } from '@odf/shared/utils';
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';
import * as _ from 'lodash-es';

export enum LocalScaleClusterStatus {
  LOADING = 'loading',
  ABSENT = 'absent',
  PRESENT = 'present',
  ERROR = 'error',
}

export type LocalScaleClusterState =
  | { status: LocalScaleClusterStatus.LOADING }
  | { status: LocalScaleClusterStatus.ABSENT }
  | { status: LocalScaleClusterStatus.PRESENT; cluster: ClusterKind }
  | { status: LocalScaleClusterStatus.ERROR; error: unknown };

const localClusterResource = {
  groupVersionKind: {
    group: ClusterModel.apiGroup,
    version: ClusterModel.apiVersion,
    kind: ClusterModel.kind,
  },
  isList: false,
  name: IBM_SCALE_LOCAL_CLUSTER_NAME,
  namespace: IBM_SCALE_NAMESPACE,
};

export const useLocalScaleClusterState = (): LocalScaleClusterState => {
  const [localCluster, isLocalClusterLoaded, localClusterError] =
    useK8sWatchResource<ClusterKind>(localClusterResource);

  if (!isLocalClusterLoaded) {
    return { status: LocalScaleClusterStatus.LOADING };
  }

  if (localClusterError && !isNotFoundError(localClusterError)) {
    return { status: LocalScaleClusterStatus.ERROR, error: localClusterError };
  }

  return _.isEmpty(localCluster)
    ? { status: LocalScaleClusterStatus.ABSENT }
    : { status: LocalScaleClusterStatus.PRESENT, cluster: localCluster };
};

export const useIsLocalClusterConfigured = () => {
  const localClusterRef = React.useRef<ClusterKind>(null);
  const [localCluster, isLocalClusterLoaded, localClusterError] =
    useK8sWatchResource<ClusterKind>(localClusterResource);

  if (!_.isEmpty(localClusterRef.current)) {
    return localClusterRef.current;
  }

  if (isLocalClusterLoaded && !localClusterError && !_.isEmpty(localCluster)) {
    localClusterRef.current = localCluster;
    return localCluster;
  }

  return null;
};
