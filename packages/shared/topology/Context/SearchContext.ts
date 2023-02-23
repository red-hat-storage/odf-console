import * as React from 'react';

type DefaultSearchContext = {
  activeItemsUID: string[];
  setActiveItemsUID: React.Dispatch<React.SetStateAction<string[]>>;
  activeItem: string;
  setActiveItem: React.Dispatch<React.SetStateAction<string>>;
};

const defaultContext: DefaultSearchContext = {
  activeItemsUID: [],
  setActiveItemsUID: null,
  activeItem: '',
  setActiveItem: null,
};

export const TopologySearchContext =
  React.createContext<DefaultSearchContext>(defaultContext);
