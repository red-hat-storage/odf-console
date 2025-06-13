import * as React from 'react';
import {
  DISCOVERED_APP_NS,
  KUBE_INSTANCE_LABEL,
  ODF_RESOURCE_TYPE_LABEL,
} from '@odf/mco/constants';
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
  VirtualMachineModel,
} from '@odf/shared';
import {
  K8sResourceCommon,
  useK8sWatchResource,
} from '@openshift-console/dynamic-plugin-sdk';
import { findDRPCUsingVM } from '../../modals/app-manage-policies/utils/parser-utils';
import {
  ApplicationSetParser,
  SubscriptionParser,
  DiscoveredParser,
} from '../parsers';

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

const DiscoveredHelper: React.FC<ParserHelperProps> = ({
  vmName,
  vmNamespace,
  clusterName,
}) => {
  const [drpcs, loaded, loadError] = useK8sWatchResource<
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

  const drpc = React.useMemo(
    () => findDRPCUsingVM(drpcs, vmName, vmNamespace, clusterName),
    [vmName, vmNamespace, drpcs, clusterName]
  );

  if (!loaded || loadError || !drpc) return null;
  return <DiscoveredParser application={drpc} />;
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

  return (
    <DiscoveredHelper
      vmName={vmName}
      vmNamespace={vmNamespace}
      clusterName={clusterName}
    />
  );
};

type VirtualMachineParserProps = {
  virtualMachine: K8sResourceCommon;
};

type ParserHelperProps = {
  vmName: string;
  vmNamespace: string;
  clusterName?: string;
};

export default VirtualMachineParser;
