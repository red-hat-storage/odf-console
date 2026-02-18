import * as React from 'react';
import { GraphElement } from '@patternfly/react-topology';
import { ACMManagedClusterKind } from '../../../types';
import { TopologyViewLevel } from '../types';

type DefaultContext = {
  clusters: ACMManagedClusterKind[];
  selectedElement: GraphElement;
  setSelectedElement: (element: GraphElement) => void;
  visualizationLevel: TopologyViewLevel;
  odfMCOVersion?: string;
};

const defaultContext: DefaultContext = {
  clusters: [],
  selectedElement: null,
  setSelectedElement: () => null,
  visualizationLevel: TopologyViewLevel.CLUSTERS,
  odfMCOVersion: undefined,
};

export const TopologyDataContext =
  React.createContext<DefaultContext>(defaultContext);
