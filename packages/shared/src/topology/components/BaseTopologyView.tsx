import * as React from 'react';
import {
  TopologyControlBar,
  TopologyView,
  VisualizationSurface,
  TopologyControlButton,
} from '@patternfly/react-topology';

export type BaseTopologyViewProps = {
  controlButtons: TopologyControlButton[];
  sideBar: React.ReactNode;
  sideBarOpen: boolean;
  selectedIds: string[];
  minSideBarSize?: string;
  sideBarResizable?: boolean;
  /**
   * Optional children rendered before the VisualizationSurface
   * (e.g., back buttons, message buttons)
   */
  children?: React.ReactNode;
};

/**
 * Base topology view component with standard layout
 */
export const BaseTopologyView: React.FC<BaseTopologyViewProps> = ({
  controlButtons,
  sideBar,
  sideBarOpen,
  selectedIds,
  minSideBarSize = '400px',
  sideBarResizable = true,
  children,
}) => {
  return (
    <TopologyView
      controlBar={
        <TopologyControlBar
          data-test="topology-control-bar"
          controlButtons={controlButtons}
        />
      }
      sideBar={sideBar}
      sideBarResizable={sideBarResizable}
      minSideBarSize={minSideBarSize}
      sideBarOpen={sideBarOpen}
    >
      {children}
      <VisualizationSurface state={{ selectedIds }} />
    </TopologyView>
  );
};
