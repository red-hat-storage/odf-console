import { NodeData } from '@odf/core/types';
import { getLabels, getName, getUID } from '@odf/shared/selectors';
import { SortByDirection } from '@patternfly/react-table';

// Shared, wizard-agnostic helpers for the node-selection tables used by the
// Fusion Access SAN and IBM Storage Scale flows. Kept as pure functions so they
// can be unit-tested in isolation and reused across both tables.

export const nameSort = (
  a: NodeData,
  b: NodeData,
  direction: SortByDirection
): number => {
  const negation = direction !== SortByDirection.asc;
  const sortVal = getName(a).localeCompare(getName(b));
  return negation ? -sortVal : sortVal;
};

// Sort by number of taints; asc = untainted first, desc = most-tainted first
// (groups tainted nodes together). Falls back to name for a stable order.
export const taintsSort = (
  a: NodeData,
  b: NodeData,
  direction: SortByDirection
): number => {
  const negation = direction !== SortByDirection.asc;
  const sortVal = (a.spec?.taints?.length ?? 0) - (b.spec?.taints?.length ?? 0);
  if (sortVal !== 0) {
    return negation ? -sortVal : sortVal;
  }
  const nameSortVal = getName(a).localeCompare(getName(b));
  return negation ? -nameSortVal : nameSortVal;
};

// Unified free-text filter: case-insensitive substring matching of the typed
// query against the node name, any label key/value, or any taint key/value.
// (A plain `includes` is used rather than the shared `fuzzyCaseInsensitive`
// helper: `fuzzysearch` is a bare-function CommonJS module that is not reliably
// callable through the `import * as` wildcard interop in the webpack bundle, so
// partial queries silently failed to match.)
export const matchesNodeQuery = (node: NodeData, query: string): boolean => {
  if (!query) {
    return true;
  }
  const needle = query.toLowerCase();
  const includes = (value?: string): boolean =>
    (value ?? '').toLowerCase().includes(needle);

  if (includes(getName(node))) {
    return true;
  }
  const labels = getLabels(node) ?? {};
  if (
    Object.entries(labels).some(
      ([key, value]) => includes(key) || includes(value)
    )
  ) {
    return true;
  }
  return (node.spec?.taints ?? []).some(
    (taint) => includes(taint.key) || includes(taint.value)
  );
};

// A search-filtered table reports selections only among the currently-visible
// rows. Merge those with previously-selected rows that are filtered out of view
// so toggling a node while a search is active ADDS to the existing selection
// instead of replacing it: rows hidden by the search keep their prior selection,
// while visible rows are fully described by `visibleSelected`.
export const mergePreservedSelection = (
  currentSelected: NodeData[],
  visibleSelected: NodeData[],
  visibleNodes: NodeData[]
): NodeData[] => {
  const visibleUids = new Set(visibleNodes.map(getUID));
  const preservedHiddenSelection = currentSelected.filter(
    (node) => !visibleUids.has(getUID(node))
  );
  return [...preservedHiddenSelection, ...visibleSelected];
};
