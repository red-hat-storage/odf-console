import * as React from 'react';
import { DISCOVERED_APP_NS, KUBE_INSTANCE_LABEL } from '@odf/mco/constants';
import {
  getApplicationResourceObj,
  getApplicationSetResourceObj,
  getDRPlacementControlResourceObj,
  useACMSafeFetch,
} from '@odf/mco/hooks';
import {
  ArgoApplicationSetKind,
  DRPlacementControlKind,
  SearchResultItemType,
} from '@odf/mco/types';
import {
  getLabelsFromSearchResult,
  queryApplicationSetResourcesForVM,
  querySubscriptionResourcesForVM,
  getVMClusterName,
  findDRPCByNsClusterAndVMName,
} from '@odf/mco/utils';
import {
  ACMSubscriptionModel,
  ApplicationKind,
  ArgoApplicationSetModel,
  getLabel,
  getLabels,
  getName,
  getNamespace,
} from '@odf/shared';
import {
  K8sResourceCommon,
  useK8sWatchResource,
} from '@openshift-console/dynamic-plugin-sdk';
import {
  ApplicationSetParser,
  SubscriptionParser,
  DiscoveredParser,
} from '../parsers';

const useGetVMDRPC = (
  virtualMachine: K8sResourceCommon
): DRPlacementControlKind | undefined => {
  const vmName = getName(virtualMachine);
  const vmNamespace = getNamespace(virtualMachine);
  const vmCluster = getVMClusterName(virtualMachine);
  const vmLabels = getLabels(virtualMachine);

  const [drpcs, loaded, loadError] = useK8sWatchResource<
    DRPlacementControlKind[]
  >(getDRPlacementControlResourceObj({ namespace: DISCOVERED_APP_NS }));

  if (!loaded || loadError) return undefined;

  return findDRPCByNsClusterAndVMName(
    drpcs,
    vmNamespace,
    vmCluster,
    vmName,
    vmLabels
  );
};

const ApplicationSetHelper: React.FC<ParserHelperProps> = ({
  vmName,
  vmNamespace,
}) => {
  const [resource, loaded, loadError] =
    useK8sWatchResource<ArgoApplicationSetKind>(
      getApplicationSetResourceObj({ name: vmName, namespace: vmNamespace })
    );

  if (!loaded || loadError) return null;
  return <ApplicationSetParser application={resource} />;
};

const SubscriptionHelper: React.FC<ParserHelperProps> = ({
  vmName,
  vmNamespace,
}) => {
  const [resource, loaded, loadError] = useK8sWatchResource<ApplicationKind>(
    getApplicationResourceObj({ name: vmName, namespace: vmNamespace })
  );

  if (!loaded || loadError) return null;
  return <SubscriptionParser application={resource} />;
};

const DiscoveredHelper: React.FC<DiscoveredHelperProps> = ({ application }) => {
  if (!application) return null;
  return <DiscoveredParser application={application} />;
};

export const VirtualMachineParser: React.FC<VirtualMachineParserProps> = ({
  virtualMachine,
}) => {
  const vmName = getName(virtualMachine);
  const vmNamespace = getNamespace(virtualMachine);
  const clusterName = getVMClusterName(virtualMachine);
  const argoApplicationName = getLabel(virtualMachine, KUBE_INSTANCE_LABEL);

  const vmDRPC = useGetVMDRPC(virtualMachine);

  // ACM search API call to find managed application resource
  const searchQuery = React.useMemo(
    () =>
      argoApplicationName
        ? queryApplicationSetResourcesForVM(argoApplicationName)
        : querySubscriptionResourcesForVM(vmName, vmNamespace, clusterName),
    [vmName, vmNamespace, clusterName, argoApplicationName]
  );

  const [searchResult, searchError, searchLoaded] =
    useACMSafeFetch(searchQuery);

  if (!searchLoaded || searchError) {
    return null;
  }

  // Extract managed application CR (Application / ApplicationSet)
  const managedApplication: SearchResultItemType =
    searchResult?.data?.searchResult?.[0]?.related?.[0]?.items?.[0];

  const { name, namespace, kind } = managedApplication || {};

  if (kind === ArgoApplicationSetModel.kind) {
    return <ApplicationSetHelper vmName={name} vmNamespace={namespace} />;
  }

  if (kind === ACMSubscriptionModel.kind) {
    return (
      <SubscriptionHelper
        vmName={getLabelsFromSearchResult(managedApplication)?.app?.[0]}
        vmNamespace={namespace}
      />
    );
  }

  return <DiscoveredHelper application={vmDRPC} />;
};

type VirtualMachineParserProps = {
  virtualMachine: K8sResourceCommon;
};

type ParserHelperProps = {
  vmName: string;
  vmNamespace: string;
};

type DiscoveredHelperProps = {
  application: DRPlacementControlKind | undefined;
};

export default VirtualMachineParser;
