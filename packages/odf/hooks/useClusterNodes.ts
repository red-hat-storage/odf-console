import * as React from 'react';
import { WizardNodeState } from '@odf/core/components/create-storage-system/reducer';
import { createWizardNodeState } from '@odf/core/components/utils';
import { nodesWithoutTaints } from '@odf/core/utils';
import { useNodesData } from './useNodesData';

export const useClusterNodes = () => {
  const [nodesData, nodesLoaded, nodesLoadError] = useNodesData();

  const clusterNodes = React.useMemo((): WizardNodeState[] => {
    if (!nodesLoaded || nodesLoadError) {
      return [];
    }
    return createWizardNodeState(nodesWithoutTaints(nodesData));
  }, [nodesLoaded, nodesLoadError, nodesData]);

  return { clusterNodes, nodesLoaded, nodesLoadError };
};
