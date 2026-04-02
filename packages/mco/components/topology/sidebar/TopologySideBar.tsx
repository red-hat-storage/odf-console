import * as React from 'react';
import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk';
import { TopologySideBar as PFTopologySideBar } from '@patternfly/react-topology';
import { AppSidebar } from './AppSidebar';
import { ClusterSidebar } from './ClusterSidebar';
import { DRPolicySidebar } from './DRPolicySidebar';
import { OperationSidebar } from './OperationSidebar';

type TopologySideBarProps = {
  resource: K8sResourceCommon;
  onClose: () => void;
  isExpanded: boolean;
  edgeData?: any; // Edge data when edge is selected
};

const TopologySideBar: React.FC<TopologySideBarProps> = ({
  resource,
  onClose,
  edgeData,
}) => {
  // Determine what content to render based on selection type
  let content: React.ReactNode = null;

  // Handle app node selection (check isSource first to distinguish from failover nodes)
  if (edgeData?.isSource !== undefined) {
    // App node during operation (has operations or operation)
    content = <AppSidebar edgeData={edgeData} />;
  } else if (edgeData?.isStatic && (edgeData?.appInfo || edgeData?.isGrouped)) {
    // Handle static app node selection (single app or grouped apps)
    content = <AppSidebar edgeData={edgeData} />;
  } else if (edgeData?.operations) {
    // Failover node selection (has operations but no isSource)
    content = <OperationSidebar edgeData={edgeData} />;
  } else if (edgeData) {
    // Handle edge selection (DR Policy edge or operation edge)
    const { policies, isOperation } = edgeData;
    const hasActiveOperation = isOperation && edgeData.operation;

    // DR Policy edge (not operation edge)
    if (!hasActiveOperation && policies && policies.length > 0) {
      content = (
        <DRPolicySidebar policies={policies} pairKey={edgeData.pairKey} />
      );
    } else {
      // Operation edge
      content = <OperationSidebar edgeData={edgeData} />;
    }
  } else if (resource) {
    // Handle cluster node selection
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
