import * as React from 'react';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  createTopologyControlButtons,
  defaultControlButtonsOptions,
  Visualization,
  Controller,
} from '@patternfly/react-topology';
import { ZOOM_IN, ZOOM_OUT } from '../constants';

export type UseTopologyControlsOptions = {
  controller: Visualization | Controller;
  showLegend?: boolean;
};

/**
 * Hook that provides standard topology control buttons configuration
 */
export const useTopologyControls = ({
  controller,
  showLegend = false,
}: UseTopologyControlsOptions) => {
  const { t } = useCustomTranslation();

  return React.useMemo(
    () =>
      createTopologyControlButtons({
        ...defaultControlButtonsOptions,
        zoomInTip: t('Zoom in'),
        zoomInCallback: () => {
          controller && controller.getGraph()?.scaleBy(ZOOM_IN);
        },
        zoomOutTip: t('Zoom out'),
        zoomOutCallback: () => {
          controller && controller.getGraph()?.scaleBy(ZOOM_OUT);
        },
        fitToScreenTip: t('Fit to screen'),
        fitToScreenCallback: () => {
          controller && controller.getGraph()?.fit(100);
        },
        resetViewTip: t('Reset view'),
        resetViewCallback: () => {
          if (controller) {
            const graph = controller.getGraph();
            graph?.reset();
            graph?.layout();
          }
        },
        legend: showLegend,
      }),
    [controller, showLegend, t]
  );
};
