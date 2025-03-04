import * as React from 'react';
import { getPlacementKindObj } from '@odf/mco/components/discovered-application-wizard/utils/k8s-utils';
import { DISCOVERED_APP_NS, DRApplication } from '@odf/mco/constants';
import {
  getDRPlacementControlResourceObj,
  getDRPolicyResourceObj,
} from '@odf/mco/hooks';
import { DRPlacementControlKind, DRPolicyKind } from '@odf/mco/types';
import { findDRPolicyUsingDRPC } from '@odf/mco/utils';
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
  // Fetch resources
  const [drpcs, drpcsLoaded, drpcsLoadError] = useK8sWatchResource<
    DRPlacementControlKind[]
  >(getDRPlacementControlResourceObj({ namespace: DISCOVERED_APP_NS }));

  const [drPolicies, drPoliciesLoaded, drPoliciesLoadError] =
    useK8sWatchResource<DRPolicyKind[]>(getDRPolicyResourceObj());

  // Compute loading states
  const isLoaded = drpcsLoaded && drPoliciesLoaded;
  const loadError = drpcsLoadError || drPoliciesLoadError;
  const isLoadedWOError = isLoaded && !loadError;

  const applicationInfo: ApplicationInfoType = React.useMemo(() => {
    if (!isLoadedWOError) return {};

    const vmName = getName(virtualMachine);
    const vmNamespace = getNamespace(virtualMachine);
    const drpc = findDRPCUsingVM(drpcs, vmName, vmNamespace);
    const drPolicy = findDRPolicyUsingDRPC(drpc, drPolicies);
    const placementName =
      drpc?.spec.placementRef?.name ?? `${vmName}-placement-1`;
    const placementInfo = generatePlacementInfo(
      getPlacementKindObj(placementName),
      [cluster]
    );
    const drpcInfo = generateDRPlacementControlInfo(drpc, placementInfo);
    const existingProtectionNames = drpcs?.map(getName) ?? [];

    return generateApplicationInfo(
      DRApplication.DISCOVERED,
      virtualMachine,
      vmNamespace,
      drpcInfo.length ? [] : [placementInfo], // Skip placement if DRPC exists
      generateDRInfo(drPolicy, drpcInfo),
      pvcQueryFilter,
      existingProtectionNames
    );
  }, [
    virtualMachine,
    cluster,
    drpcs,
    drPolicies,
    isLoadedWOError,
    pvcQueryFilter,
  ]);

  const matchingPolicies: DRPolicyType[] = React.useMemo(() => {
    return Object.keys(applicationInfo).length
      ? getMatchingDRPolicies(applicationInfo as ApplicationType, drPolicies)
      : [];
  }, [applicationInfo, drPolicies]);

  return (
    <ModalContextViewer
      applicationInfo={applicationInfo}
      matchingPolicies={matchingPolicies}
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
