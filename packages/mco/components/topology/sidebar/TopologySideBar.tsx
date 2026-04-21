import * as React from 'react';
import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk';
import { TopologySideBar as PFTopologySideBar } from '@patternfly/react-topology';
import {
  StaticAppsSidebarData,
  OperationAppSidebarData,
  OperationEdgeSidebarData,
  PolicyEdgeSidebarData,
  SidebarData,
} from '../types';
import { AppSidebar } from './AppSidebar';
import { ClusterSidebar } from './ClusterSidebar';
import { DRPolicySidebar } from './DRPolicySidebar';
import { OperationSidebar } from './OperationSidebar';

const isStaticApps = (data: SidebarData): data is StaticAppsSidebarData =>
  'isStatic' in data && data.isStatic === true;

const isOperationApp = (data: SidebarData): data is OperationAppSidebarData =>
  'isSource' in data;

const isOperationEdge = (data: SidebarData): data is OperationEdgeSidebarData =>
  'operations' in data && 'pairKey' in data;

const isPolicyEdge = (data: SidebarData): data is PolicyEdgeSidebarData =>
  'policies' in data && 'pairKey' in data;

type TopologySideBarProps = {
  resource: K8sResourceCommon;
  onClose: () => void;
  isExpanded: boolean;
  edgeData?: SidebarData;
};

const TopologySideBar: React.FC<TopologySideBarProps> = ({
  resource,
  onClose,
  edgeData,
}) => {
  let content: React.ReactNode = null;

  if (edgeData) {
    if (isOperationApp(edgeData)) {
      content = <AppSidebar edgeData={edgeData} />;
    } else if (isStaticApps(edgeData)) {
      content = <AppSidebar edgeData={edgeData} />;
    } else if (isOperationEdge(edgeData)) {
      content = <OperationSidebar edgeData={edgeData} />;
    } else if (isPolicyEdge(edgeData)) {
      content = (
        <DRPolicySidebar
          policies={edgeData.policies}
          pairKey={edgeData.pairKey}
        />
      );
    }
  } else if (resource) {
    content = <ClusterSidebar resource={resource} />;
  } else {
    return null;
  }

  return (
    <PFTopologySideBar onClose={onClose} resizable>
      {content}
    </PFTopologySideBar>
  );
};

export default TopologySideBar;
