import * as React from 'react';
import { getPlacementKindObj } from '@odf/mco/components/discovered-application-wizard/utils/k8s-utils';
import { DISCOVERED_APP_NS, DRApplication } from '@odf/mco/constants';
import {
  getDRPlacementControlResourceObj,
  getDRPolicyResourceObj,
  useACMSafeFetch,
} from '@odf/mco/hooks';
import { DRPlacementControlKind, DRPolicyKind } from '@odf/mco/types';
import {
  findDRPolicyUsingDRPC,
  getSearchResultItems,
  queryAppWorkloadPVCs,
} from '@odf/mco/utils';
import { getName, getNamespace } from '@odf/shared';
import {
  K8sResourceCommon,
  useK8sWatchResource,
} from '@openshift-console/dynamic-plugin-sdk';
import { ModalContextViewer } from '../modal-context-viewer';
import {
  findDRPCUsingVM,
  generateApplicationInfo,
  generateDRInfo,
  generateDRPlacementControlInfo,
  generatePlacementInfo,
  getMatchingDRPolicies,
} from '../utils/parser-utils';
import { ModalViewContext } from '../utils/reducer';
import {
  ApplicationInfoType,
  ApplicationType,
  DRPolicyType,
  ModalType,
  PVCQueryFilter,
} from '../utils/types';

export const DiscoveredVMParser: React.FC<DiscoveredVMParserProps> = ({
  virtualMachine,
  cluster,
  pvcQueryFilter,
  setCurrentModalContext,
}) => {
  // The ACM Virtual Machine list page isn't a live watcher.
  // Optimizing the DRPC search via the VM CR isn't feasible,
  // After DR protection, K8S_RESOURCE_SELECTOR_LABEL_KEY changes on the VM CR won't reflect here.
  const [drpcs, drpcsLoaded, drpcsLoadError] = useK8sWatchResource<
    DRPlacementControlKind[]
  >(
    getDRPlacementControlResourceObj({
      namespace: DISCOVERED_APP_NS,
    })
  );

  const [drPolicies, drPoliciesLoaded, drPoliciesLoadError] =
    useK8sWatchResource<DRPolicyKind[]>(getDRPolicyResourceObj());

  // ACM search proxy API call
  const searchQuery = React.useMemo(
    () => queryAppWorkloadPVCs(pvcQueryFilter),
    [pvcQueryFilter]
  );
  const [searchResult, searchLoadError, searchLoaded] =
    useACMSafeFetch(searchQuery);

  // VM Persistent Volume Claims (PVCs)
  const discoveredVMPVCs = React.useMemo(() => {
    if (searchLoaded && !searchLoadError) {
      return getSearchResultItems(searchResult).map((vm) => vm.name);
    }
    return [];
  }, [searchResult, searchLoadError, searchLoaded]);

  const vmNamespace = getNamespace(virtualMachine);
  const vmName = getName(virtualMachine);

  // Compute loading states
  const isLoaded = drpcsLoaded && drPoliciesLoaded && searchLoaded;
  const loadError = drPoliciesLoadError || drpcsLoadError || searchLoadError;
  const isLoadedWOError = isLoaded && !loadError;

  const applicationInfo: ApplicationInfoType = React.useMemo(() => {
    if (!isLoadedWOError) return {};

    const drpc = findDRPCUsingVM(drpcs, vmName, vmNamespace, cluster);
    const drPolicy = drpc && findDRPolicyUsingDRPC(drpc, drPolicies);
    const placementName =
      drpc?.spec.placementRef?.name ?? `${vmName}-placement-1`;
    const placementInfo = generatePlacementInfo(
      getPlacementKindObj(placementName),
      [cluster]
    );
    const drpcInfo = generateDRPlacementControlInfo(drpc, placementInfo);

    return generateApplicationInfo(
      DRApplication.DISCOVERED,
      virtualMachine,
      vmNamespace,
      drpcInfo.length ? [] : [placementInfo], // Skip placement if DRPC exists
      generateDRInfo(drPolicy, drpcInfo),
      pvcQueryFilter,
      discoveredVMPVCs
    );
  }, [
    vmName,
    vmNamespace,
    virtualMachine,
    cluster,
    drpcs,
    drPolicies,
    isLoadedWOError,
    pvcQueryFilter,
    discoveredVMPVCs,
  ]);

  const matchingPolicies: DRPolicyType[] = React.useMemo(() => {
    return Object.keys(applicationInfo).length
      ? getMatchingDRPolicies(applicationInfo as ApplicationType, drPolicies)
      : [];
  }, [applicationInfo, drPolicies]);

  const sharedVMGroups = React.useMemo(() => {
    return drpcs?.length
      ? drpcs
          .filter((drpc) =>
            drpc.spec?.protectedNamespaces?.includes(vmNamespace)
          )
          .flatMap((drpc) => generateDRPlacementControlInfo(drpc, undefined))
      : [];
  }, [drpcs, vmNamespace]);

  return (
    <ModalContextViewer
      applicationInfo={applicationInfo}
      matchingPolicies={matchingPolicies}
      sharedVMGroups={sharedVMGroups}
      loaded={isLoaded}
      loadError={loadError}
      setCurrentModalContext={setCurrentModalContext}
      modalType={ModalType.VirtualMachine}
    />
  );
};

type DiscoveredVMParserProps = {
  virtualMachine: K8sResourceCommon;
  cluster: string;
  setCurrentModalContext: React.Dispatch<
    React.SetStateAction<ModalViewContext>
  >;
  pvcQueryFilter?: PVCQueryFilter;
};
