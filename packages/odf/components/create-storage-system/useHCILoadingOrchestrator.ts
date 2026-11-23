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
import { LSO_OPERATOR, MACHINE_API_NAMESPACE } from '../../constants';
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

    const maybeHCI = isHCIEnabled !== false;

    const [lsoCsv, lsoCsvLoaded, lsoCsvLoadError] = useFetchCsv({
      specName: LSO_OPERATOR,
      startPollingInstantly: maybeHCI,
    });
    const lsoNamespace = getNamespace(lsoCsv) || '';
    const isLSOInstalled =
      lsoCsvLoaded && !lsoCsvLoadError && isCSVSucceeded(lsoCsv);

    // BMH-based hardware detection (skip on non-HCI)
    const bmhResource = React.useMemo(
      () =>
        maybeHCI
          ? {
              groupVersionKind: {
                group: BareMetalHostModel.apiGroup,
                version: BareMetalHostModel.apiVersion,
                kind: BareMetalHostModel.kind,
              },
              namespace: MACHINE_API_NAMESPACE,
              isList: true,
              optional: true,
            }
          : (null as any),
      [maybeHCI]
    );
    const [bmhs, bmhsLoaded, bmhsError] =
      useK8sWatchResource<K8sResourceCommon[]>(bmhResource);

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
    const [autoCreateDone, setAutoCreateDone] = React.useState(false);
    const lvsTriggeredRef = React.useRef(false);
    const {
      isLoading: hciIsLoading,
      error: hciError,
      discoveryNodes,
      createHCILocalVolumeSet,
    } = hciResults;

    React.useEffect(() => {
      if (!isHCIEnabled || lvsTriggeredRef.current) return;

      if (hciIsLoading || !lsoCsvLoaded || !(bmhsLoaded || !!bmhsError)) return;

      if (!isLSOInstalled || hciError || !discoveryNodes.length) {
        setAutoCreateDone(true);
        return;
      }

      lvsTriggeredRef.current = true;
      if (discoveryNodes.some((node) => isOcsLabeledNode(node))) {
        createHCILocalVolumeSet()
          .catch(() => {
            // Error is captured in hciResults.error via state
          })
          .finally(() => setAutoCreateDone(true));
      } else {
        setAutoCreateDone(true);
      }
    }, [
      isHCIEnabled,
      isLSOInstalled,
      bmhsLoaded,
      bmhsError,
      hciIsLoading,
      hciError,
      lsoCsvLoaded,
      discoveryNodes,
      createHCILocalVolumeSet,
    ]);

    const hciLoading =
      isHCIEnabled === undefined ||
      (isHCIEnabled &&
        (!detectionDone || hciResults.isLoading || !autoCreateDone));

    return {
      isHCIEnabled,
      hciLoading,
      hciResults,
      diskProfile,
    };
  };
