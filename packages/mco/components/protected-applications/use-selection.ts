import * as React from 'react';
import { ProtectedApplicationViewKind } from '@odf/mco/types/pav';
import { getNamespace } from '@odf/shared';
import { getUID } from '@odf/shared/selectors';
import { OnSelect } from '@patternfly/react-table';
import { DRPlacementControlKind } from '../../types';
import { getDRPlacementControlRef } from '../../utils';
import { isFailingOrRelocating } from './utils';

export const getDRPCKey = (pav: ProtectedApplicationViewKind): string => {
  const drpcRef = getDRPlacementControlRef(pav);
  return `${drpcRef.namespace || getNamespace(pav)}/${drpcRef.name}`;
};

const isEligible = (
  pav: ProtectedApplicationViewKind,
  drpcMap: Map<string, DRPlacementControlKind>
): boolean => {
  const drpc = drpcMap.get(getDRPCKey(pav));
  if (!drpc) return false;
  if (drpc.metadata?.deletionTimestamp) return false;
  if (isFailingOrRelocating(drpc)) return false;
  return true;
};

export type SelectionProps = {
  onRowSelect: OnSelect;
  isSelected: (pav: ProtectedApplicationViewKind) => boolean;
  isDisabled: (pav: ProtectedApplicationViewKind) => boolean;
  isAllPageSelected: boolean;
  onSelectAllPage: OnSelect;
  selectedCount: number;
  eligiblePageCount: number;
  eligibleTotalCount: number;
  isPartiallySelected: boolean;
  onSelectNone: () => void;
  onSelectPage: () => void;
  onSelectAll: () => void;
};

export const useProtectedAppsSelection = (
  allPavs: ProtectedApplicationViewKind[],
  pagePavs: ProtectedApplicationViewKind[],
  drpcMap: Map<string, DRPlacementControlKind>
): SelectionProps => {
  const [selectedUids, setSelectedUids] = React.useState<Set<string>>(
    new Set()
  );

  const eligibleAll = React.useMemo(
    () => allPavs.filter((pav) => isEligible(pav, drpcMap)),
    [allPavs, drpcMap]
  );

  const eligiblePage = React.useMemo(
    () => pagePavs.filter((pav) => isEligible(pav, drpcMap)),
    [pagePavs, drpcMap]
  );

  const eligibleUids = React.useMemo(
    () => new Set(eligibleAll.map(getUID)),
    [eligibleAll]
  );

  React.useEffect(() => {
    setSelectedUids((prev) => {
      const pruned = new Set<string>();
      prev.forEach((uid) => {
        if (eligibleUids.has(uid)) pruned.add(uid);
      });
      if (pruned.size !== prev.size) return pruned;
      return prev;
    });
  }, [eligibleUids]);

  const isSelected = React.useCallback(
    (pav: ProtectedApplicationViewKind) => selectedUids.has(getUID(pav)),
    [selectedUids]
  );

  const isDisabled = React.useCallback(
    (pav: ProtectedApplicationViewKind) => !isEligible(pav, drpcMap),
    [drpcMap]
  );

  const eligiblePageUids = React.useMemo(
    () => new Set(eligiblePage.map(getUID)),
    [eligiblePage]
  );

  const isAllPageSelected = React.useMemo(
    () =>
      eligiblePage.length > 0 &&
      eligiblePage.every((pav) => selectedUids.has(getUID(pav))),
    [eligiblePage, selectedUids]
  );

  const isPartiallySelected = React.useMemo(
    () =>
      eligiblePage.some((pav) => selectedUids.has(getUID(pav))) &&
      !isAllPageSelected,
    [eligiblePage, selectedUids, isAllPageSelected]
  );

  const onRowSelect: OnSelect = React.useCallback(
    (_event, isSelecting, _rowIndex, rowData) => {
      const uid = rowData?.props?.id;
      if (!uid) return;
      setSelectedUids((prev) => {
        const next = new Set(prev);
        if (isSelecting) {
          next.add(uid);
        } else {
          next.delete(uid);
        }
        return next;
      });
    },
    []
  );

  const onSelectAllPage: OnSelect = React.useCallback(
    (_event, isSelecting) => {
      setSelectedUids((prev) => {
        const next = new Set(prev);
        eligiblePageUids.forEach((uid) => {
          if (isSelecting) {
            next.add(uid);
          } else {
            next.delete(uid);
          }
        });
        return next;
      });
    },
    [eligiblePageUids]
  );

  const onSelectNone = React.useCallback(() => {
    setSelectedUids(new Set());
  }, []);

  const onSelectPage = React.useCallback(() => {
    setSelectedUids((prev) => {
      const next = new Set(prev);
      eligiblePageUids.forEach((uid) => next.add(uid));
      return next;
    });
  }, [eligiblePageUids]);

  const onSelectAll = React.useCallback(() => {
    setSelectedUids(new Set(eligibleUids));
  }, [eligibleUids]);

  return {
    onRowSelect,
    isSelected,
    isDisabled,
    isAllPageSelected,
    onSelectAllPage,
    selectedCount: selectedUids.size,
    eligiblePageCount: eligiblePage.length,
    eligibleTotalCount: eligibleAll.length,
    isPartiallySelected,
    onSelectNone,
    onSelectPage,
    onSelectAll,
  };
};
