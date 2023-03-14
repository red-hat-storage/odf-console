import * as React from 'react';
import { K8sResourceKind } from '@odf/shared/types';
import { TopologySideBar as PFTopologySideBar } from '@patternfly/react-topology';
import TopologySideBarContent from './TopologySideBarContent';

type TopologySideBarProps = {
  onClose: () => void;
  isExpanded?: boolean;
  onExpand?: () => void;
  resource: K8sResourceKind;
};

const TopologySideBar: React.FC<TopologySideBarProps> = ({
  resource,
  onClose,
}) => {
  return (
    <PFTopologySideBar onClose={onClose} resizable>
      <TopologySideBarContent resource={resource} />
    </PFTopologySideBar>
  );
};

export default TopologySideBar;
