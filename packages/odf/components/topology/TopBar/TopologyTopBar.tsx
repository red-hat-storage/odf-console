import * as React from 'react';
import { TopologyDataContext } from '@odf/shared/topology';
import TopologyNavigationBar from './TopologyNavigation';
import TopologySearchBar from './TopologySearch';

const TopologyTopBar: React.FC = () => {
  const { activeNode, setActiveNode } = React.useContext(TopologyDataContext);
  return (
    <div>
      <div>
        <TopologySearchBar />
      </div>
      <div>
        {activeNode !== '' && (
          <TopologyNavigationBar
            initialNode={activeNode}
            updateCurrentNode={setActiveNode}
          />
        )}
      </div>
    </div>
  );
};

export default TopologyTopBar;
