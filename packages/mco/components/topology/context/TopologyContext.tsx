import * as React from 'react';
import { GraphElement } from '@patternfly/react-topology';
import { ClusterPairOperationsMap } from '../../../hooks/useActiveDROperations';
import { ClusterPairPoliciesMap } from '../../../hooks/useDRPoliciesByClusterPair';
import { ClusterAppsMap } from '../../../hooks/useProtectedAppsByCluster';
import { ACMManagedClusterKind } from '../../../types';
import { TopologyViewLevel } from '../types';

type DefaultContext = {
  clusters: ACMManagedClusterKind[];
  selectedElement: GraphElement | null;
  setSelectedElement: (element: GraphElement | null) => void;
  visualizationLevel: TopologyViewLevel;
  odfMCOVersion?: string;
  clusterAppsMap?: ClusterAppsMap;
  clusterPairPoliciesMap?: ClusterPairPoliciesMap;
  clusterPairOperationsMap?: ClusterPairOperationsMap;
};

const defaultContext: DefaultContext = {
  clusters: [],
  selectedElement: null,
  setSelectedElement: () => null,
  visualizationLevel: TopologyViewLevel.CLUSTERS,
  odfMCOVersion: undefined,
  clusterAppsMap: {},
  clusterPairPoliciesMap: {},
  clusterPairOperationsMap: {},
};

export const TopologyDataContext =
  React.createContext<DefaultContext>(defaultContext);
