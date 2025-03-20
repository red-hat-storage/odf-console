import * as React from 'react';
import { getPlacementKindObj } from '@odf/mco/components/discovered-application-wizard/utils/k8s-utils';
import {
  DISCOVERED_APP_NS,
  DRApplication,
  ODF_RESOURCE_TYPE_LABEL,
} from '@odf/mco/constants';
import {
  getDRPlacementControlResourceObj,
  getDRPolicyResourceObj,
} from '@odf/mco/hooks';
import { DRPlacementControlKind, DRPolicyKind } from '@odf/mco/types';
import { findDRPolicyUsingDRPC } from '@odf/mco/utils';
import { getName, getNamespace, VirtualMachineModel } from '@odf/shared';
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
  const [drpcs, drpcsLoaded, drpcsLoadError] = useK8sWatchResource<
    DRPlacementControlKind[]
  >(
    getDRPlacementControlResourceObj({
      namespace: DISCOVERED_APP_NS,
      selector: {
        matchLabels: {
          // To optimize the VM DRPC watch
          [ODF_RESOURCE_TYPE_LABEL]: VirtualMachineModel.kind.toLowerCase(),
        },
      },
    })
  );

  const [drPolicies, drPoliciesLoaded, drPoliciesLoadError] =
    useK8sWatchResource<DRPolicyKind[]>(getDRPolicyResourceObj());

  // Compute loading states
  const isLoaded = drpcsLoaded && drPoliciesLoaded;
  const loadError = drPoliciesLoadError || drpcsLoadError;
  const isLoadedWOError = isLoaded && !loadError;

  const applicationInfo: ApplicationInfoType = React.useMemo(() => {
    if (!isLoadedWOError) return {};

    const vmName = getName(virtualMachine);
    const vmNamespace = getNamespace(virtualMachine);
    const drpc = findDRPCUsingVM(drpcs, vmName, vmNamespace);
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
      pvcQueryFilter
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
