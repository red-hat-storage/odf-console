import * as React from 'react';
import {
  DeploymentKind,
  NodeKind,
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
  selectedElement: null,
  setSelectedElement: () => null,
};

export const TopologyDataContext =
  React.createContext<DefaultContext>(defaultContext);
