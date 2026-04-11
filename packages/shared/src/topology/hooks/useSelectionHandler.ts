import * as React from 'react';
import {
  GraphElement,
  SELECTION_EVENT,
  Visualization,
  Controller,
} from '@patternfly/react-topology';

export type UseSelectionHandlerOptions = {
  controller: Visualization | Controller;
  setSelectedElement: (element: GraphElement) => void;
  setSelectedIds: (ids: string[]) => void;
  setSideBarOpen: (open: boolean) => void;
  /**
   * Optional filter to determine if an element should be selectable.
   * Return false to prevent selection.
   */
  shouldSelect?: (element: GraphElement) => boolean;
  /**
   * Optional additional events to listen for that should close the sidebar
   */
  additionalCloseEvents?: string[];
  onCloseSideBar?: () => void;
};

/**
 * Hook that handles topology selection events and sidebar state
 */
export const useSelectionHandler = ({
  controller,
  setSelectedElement,
  setSelectedIds,
  setSideBarOpen,
  shouldSelect,
  additionalCloseEvents = [],
  onCloseSideBar,
}: UseSelectionHandlerOptions) => {
  React.useEffect(() => {
    if (!controller) return;

    const selectionHandler = (ids: string[]) => {
      const element = controller.getElementById(ids[0]);
      if (element && (!shouldSelect || shouldSelect(element))) {
        setSelectedElement(element);
        setSelectedIds([ids[0]]);
        setSideBarOpen(true);
      }
    };

    const closeHandler = () => {
      if (onCloseSideBar) {
        onCloseSideBar();
      } else {
        setSideBarOpen(false);
        setSelectedIds([]);
      }
    };

    controller.addEventListener(SELECTION_EVENT, selectionHandler);

    additionalCloseEvents.forEach((event) => {
      controller.addEventListener(event, closeHandler);
    });

    return () => {
      controller.removeEventListener(SELECTION_EVENT, selectionHandler);
      additionalCloseEvents.forEach((event) => {
        controller.removeEventListener(event, closeHandler);
      });
    };
  }, [
    controller,
    setSelectedElement,
    setSelectedIds,
    setSideBarOpen,
    shouldSelect,
    additionalCloseEvents,
    onCloseSideBar,
  ]);
};
