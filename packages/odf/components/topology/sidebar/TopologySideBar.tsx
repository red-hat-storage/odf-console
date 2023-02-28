import * as React from 'react';
import CloseButton from '@odf/shared/generic/CloseButton';
import { K8sResourceKind } from '@odf/shared/types';
import {
  Drawer,
  DrawerContent,
  DrawerPanelContent,
} from '@patternfly/react-core';
import { TopologySideBar as PFTopologySideBar } from '@patternfly/react-topology';
import TopologySideBarContent from './TopologySideBarContent';
import './topology-sidebar.scss';

type TopologySideBarProps = {
  onClose: () => void;
  isExpanded?: boolean;
  onExpand?: () => void;
  resource: K8sResourceKind;
};

type TopologyDrawerPanelContentProps = {
  onClose: () => void;
  getResourceStatus?: (resource: K8sResourceKind) => string;
};

const TopologyDrawerPanelContent: React.FC<TopologyDrawerPanelContentProps> = ({
  children,
  onClose,
}) => {
  return (
    <DrawerPanelContent isResizable minSize="450px" defaultSize="500px">
      <PFTopologySideBar resizable>
        <div className="odf-topology__sidebar-dismiss clearfix">
          <CloseButton
            onClick={onClose}
            additionalClassName="odf-topology-sidebar__button-close"
          />
        </div>
        {children}
      </PFTopologySideBar>
    </DrawerPanelContent>
  );
};

const TopologySideBar: React.FC<TopologySideBarProps> = ({
  isExpanded,
  onExpand,
  resource,
  onClose,
}) => {
  const panelContent = (
    <TopologyDrawerPanelContent onClose={onClose}>
      <TopologySideBarContent resource={resource} />
    </TopologyDrawerPanelContent>
  );

  return (
    <Drawer isExpanded={isExpanded} onExpand={onExpand}>
      <DrawerContent panelContent={panelContent} />
    </Drawer>
  );
};

export default TopologySideBar;
