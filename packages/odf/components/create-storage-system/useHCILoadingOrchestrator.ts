import * as React from 'react';
import { HCI_PLATFORM } from '@odf/core/features';
import { getNamespace } from '@odf/shared';
import { useFetchCsv } from '@odf/shared/hooks/use-fetch-csv';
import { BareMetalHostModel } from '@odf/shared/models';
import { isOcsLabeledNode } from '@odf/shared/utils';
import { isCSVSucceeded } from '@odf/shared/utils/csv-status';
import {
  useFlag,
  useK8sWatchResource,
  K8sResourceCommon,
} from '@openshift-console/dynamic-plugin-sdk';
import { LSO_OPERATOR } from '../../constants';
import {
  HCIDiskProfile,
  UseHCIDisksResult,
  deriveHCIDiskProfile,
  useHCIDisks,
} from './create-storage-system-steps/create-local-volume-set-step/useHCIDisks';

type UseHCILoadingOrchestratorResult = {
  isHCIEnabled: boolean;
  hciLoading: boolean;
  hciResults: UseHCIDisksResult;
  diskProfile: HCIDiskProfile | null;
};

export const useHCILoadingOrchestrator =
  (): UseHCILoadingOrchestratorResult => {
    const isHCIEnabled = useFlag(HCI_PLATFORM);

    const [lsoCsv, lsoCsvLoaded, lsoCsvLoadError] = useFetchCsv({
      specName: LSO_OPERATOR,
    });
    const lsoNamespace = getNamespace(lsoCsv) || '';
    const isLSOInstalled =
      lsoCsvLoaded && !lsoCsvLoadError && isCSVSucceeded(lsoCsv);

    // BMH-based hardware detection
    const [bmhs, bmhsLoaded, bmhsError] = useK8sWatchResource<
      K8sResourceCommon[]
    >({
      groupVersionKind: {
        group: BareMetalHostModel.apiGroup,
        version: BareMetalHostModel.apiVersion,
        kind: BareMetalHostModel.kind,
      },
      namespace: 'openshift-machine-api',
      isList: true,
      optional: true,
    });

    const diskProfile: HCIDiskProfile | null = React.useMemo(
      () =>
        (bmhsLoaded || bmhsError) && bmhs?.length
          ? deriveHCIDiskProfile(bmhs)
          : null,
      [bmhs, bmhsLoaded, bmhsError]
    );

    const detectionDone = (bmhsLoaded || !!bmhsError) && lsoCsvLoaded;

    const hciResults = useHCIDisks({
      namespace: lsoNamespace,
      includeControlPlaneNodes: true,
      diskProfile,
      enableDiscovery: detectionDone && isLSOInstalled,
    });

    // ---- Auto-create LVS when OCS-labeled nodes are present ----
    const lvsTriggeredRef = React.useRef(false);
    const {
      isLoading: hciIsLoading,
      error: hciError,
      discoveryNodes,
      createHCILocalVolumeSet,
    } = hciResults;

    React.useEffect(() => {
      if (!isHCIEnabled || lvsTriggeredRef.current) return;

      if (hciIsLoading || !lsoCsvLoaded || !bmhsLoaded) return;

      if (!isLSOInstalled || hciError || !discoveryNodes.length) {
        return;
      }

      lvsTriggeredRef.current = true;
      if (discoveryNodes.some((node) => isOcsLabeledNode(node))) {
        createHCILocalVolumeSet();
      }
    }, [
      isHCIEnabled,
      isLSOInstalled,
      bmhsLoaded,
      hciIsLoading,
      hciError,
      lsoCsvLoaded,
      discoveryNodes,
      createHCILocalVolumeSet,
    ]);

    const hciLoading =
      isHCIEnabled === undefined || (isHCIEnabled && !detectionDone);

    return {
      isHCIEnabled,
      hciLoading,
      hciResults,
      diskProfile,
    };
  };
