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
} from '@odf/mco/utils';
import {
  ACMSubscriptionModel,
  ApplicationKind,
  ArgoApplicationSetModel,
  getLabel,
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

const findDRPCByNamespaceAndCluster = (
  drpcs: DRPlacementControlKind[],
  namespace: string,
  cluster: string
): DRPlacementControlKind | undefined =>
  drpcs.find(
    (drpc) =>
      drpc?.spec?.protectedNamespaces?.includes(namespace) &&
      drpc?.spec?.preferredCluster === cluster
  );

const useMatchingDRPC = (
  namespace: string,
  cluster: string
): DRPlacementControlKind | undefined => {
  const drpcWatchResource = React.useMemo(
    () => getDRPlacementControlResourceObj({ namespace: DISCOVERED_APP_NS }),
    []
  );

  const [drpcs, loaded, loadError] =
    useK8sWatchResource<DRPlacementControlKind[]>(drpcWatchResource);

  if (!loaded || loadError) return undefined;

  return findDRPCByNamespaceAndCluster(drpcs, namespace, cluster);
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
  const clusterName = virtualMachine?.['status']?.cluster;
  const argoApplicationName = getLabel(virtualMachine, KUBE_INSTANCE_LABEL);

  // ACM search API call to find managed application resource
  const searchQuery = React.useMemo(
    () =>
      argoApplicationName
        ? queryApplicationSetResourcesForVM(argoApplicationName)
        : querySubscriptionResourcesForVM(vmName, vmNamespace, clusterName),
    [vmName, vmNamespace, clusterName, argoApplicationName]
  );
  const [searchResult] = useACMSafeFetch(searchQuery);
  const matchedDRPC = useMatchingDRPC(vmNamespace, clusterName);

  if (matchedDRPC && matchedDRPC.spec && matchedDRPC.metadata?.name) {
    return <DiscoveredHelper application={matchedDRPC} />;
  }

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

  return null;
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
