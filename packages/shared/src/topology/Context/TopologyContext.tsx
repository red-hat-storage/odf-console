import * as React from 'react';
import {
  DeploymentKind,
  NodeKind,
  PodKind,
  StorageClusterKind,
} from '@odf/shared/types';
import { GraphElement } from '@patternfly/react-topology';
import { TopologyViewLevel } from '../types';

export type NodeDeploymentMap = {
  [nodeName: string]: DeploymentKind[];
};

export type NodeOsdCountMap = {
  [nodeName: string]: number;
};

type DefaultContext = {
  zones: string[];
  nodes: NodeKind[];
  storageCluster: StorageClusterKind;
  deployments: DeploymentKind[];
  nodeDeploymentMap: NodeDeploymentMap;
  nodeOsdCountMap?: NodeOsdCountMap;
  pods: PodKind[];
  podsLoaded: boolean;
  podsLoadError: any;
  osdPods: PodKind[];
  visualizationLevel: TopologyViewLevel;
  activeNode?: string;
  setActiveNode?: (node: string) => void;
  selectedElement: GraphElement;
  setSelectedElement: (node: GraphElement) => void;
};

const defaultContext: DefaultContext = {
  nodes: [],
  zones: [],
  storageCluster: null,
  deployments: null,
  visualizationLevel: TopologyViewLevel.NODES,
  activeNode: null,
  setActiveNode: null,
  nodeDeploymentMap: {},
  nodeOsdCountMap: {},
  pods: [],
  podsLoaded: false,
  podsLoadError: null,
  osdPods: [],
  selectedElement: null,
  setSelectedElement: () => null,
};

export const TopologyDataContext =
  React.createContext<DefaultContext>(defaultContext);
