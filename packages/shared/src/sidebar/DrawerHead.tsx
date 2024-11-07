import * as React from 'react';
import { DrawerHead as PFDrawerHead } from '@patternfly/react-core';
import './drawer-head.scss';

const DrawerHead: React.FC = ({ children }) => {
  return (
    <div className="odf-sidebar__drawer-head">
      <PFDrawerHead>{children}</PFDrawerHead>
    </div>
  );
};

export default DrawerHead;
