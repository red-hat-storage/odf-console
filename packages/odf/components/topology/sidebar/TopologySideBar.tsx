import * as React from 'react';
import { K8sResourceKind } from '@odf/shared/types';
import { TopologySideBar as PFTopologySideBar } from '@patternfly/react-topology';
import TopologySideBarContent from './TopologySideBarContent';

type TopologySideBarProps = {
  onClose: () => void;
  isExpanded?: boolean;
  onExpand?: () => void;
  resource: K8sResourceKind;
  className?: string;
};

const TopologySideBar: React.FC<TopologySideBarProps> = ({
  resource,
  onClose,
  className,
}) => {
  return (
    <PFTopologySideBar onClose={onClose} resizable>
      <TopologySideBarContent resource={resource} className={className} />
    </PFTopologySideBar>
  );
};

export default TopologySideBar;
