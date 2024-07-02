import * as React from 'react';
import { WizardNodeState } from '@odf/core/components/create-storage-system/reducer';
import { OCS_TOLERATION } from '@odf/core/constants';
import {
  createLocalVolumeDiscovery,
  updateLocalVolumeDiscovery,
} from '@odf/core/utils';

type UseLSODiskDiscovery = (
  allNodes: WizardNodeState[],
  namespace: string,
  allowDiscovery?: boolean
) => [boolean, unknown];

const initDiskDiscovery = async (
  nodes: WizardNodeState[] = [],
  namespace: string,
  setError: (error: any) => void,
  setInProgress: (inProgress: boolean) => void
) => {
  setInProgress(true);
  const nodeByHostNames: string[] = nodes.map((node) => node.hostName);
  try {
    await updateLocalVolumeDiscovery(nodeByHostNames, namespace, setError);
  } catch (loadError) {
    if (loadError?.response?.status === 404) {
      try {
        await createLocalVolumeDiscovery(
          nodeByHostNames,
          namespace,
          OCS_TOLERATION
        );
      } catch (createError) {
        setError(createError.message);
      }
    }
  } finally {
    setError(false);
    setInProgress(false);
  }
};

export const useLSODiskDiscovery: UseLSODiskDiscovery = (
  allNodes,
  namespace,
  allowDiscovery = true
) => {
  const [lvdInProgress, setLvdInProgress] = React.useState(false);
  const [lvdError, setLvdError] = React.useState(null);

  // using "Ref" instead of "allNodes" directly to prevent adding eslint's "exhaustive-deps" disable rule to the dependency list of React hooks
  const allNodesRef = React.useRef<WizardNodeState[]>([]);
  allNodesRef.current = allNodes;
  const allNodesCount = allNodesRef.current.length;
  const shouldStartDiscovery = allowDiscovery && allNodesCount;

  React.useEffect(() => {
    if (shouldStartDiscovery) {
      initDiskDiscovery(
        allNodesRef.current,
        namespace,
        setLvdError,
        setLvdInProgress
      );
    }
    // reference of "allNodes" can change frequently (ex: if "useNodesData" hook is used), adding nodes' length to the dependency list instead
    // no need to activate the effect on each such change in "allNodes"
  }, [namespace, shouldStartDiscovery, allNodesCount]);

  return [lvdInProgress, lvdError];
};
