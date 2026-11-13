import * as React from 'react';
import { NodeData } from '@odf/core/types';
import { matchesNodeQuery } from './node-filter';

// Encapsulates the free-text search state shared by the node-selection tables:
// keeps the query and derives the visible (filtered) node list from it. Pair
// with <NodeSearchToolbar> for the input and `mergePreservedSelection` to keep
// selections of filtered-out nodes intact.
export const useNodeSearch = (nodes: NodeData[]) => {
  const [query, setQuery] = React.useState('');
  const filteredNodes = React.useMemo(
    () => nodes.filter((node) => matchesNodeQuery(node, query)),
    [nodes, query]
  );
  return { query, setQuery, filteredNodes };
};
