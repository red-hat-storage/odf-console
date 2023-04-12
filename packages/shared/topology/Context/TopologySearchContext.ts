import * as React from 'react';

export type TopologySearchContextType = {
  activeItemsUID: string[];
  setActiveItemsUID: React.Dispatch<React.SetStateAction<string[]>>;
  activeItem: string;
  setActiveItem: React.Dispatch<React.SetStateAction<string>>;
};

const defaultContext: TopologySearchContextType = {
  activeItemsUID: [],
  setActiveItemsUID: null,
  activeItem: '',
  setActiveItem: null,
};

export const TopologySearchContext =
  React.createContext<TopologySearchContextType>(defaultContext);
