import * as React from 'react';
import {
  DISCOVERED_APP_NS,
  HUB_CLUSTER_NAME,
  K8S_RESOURCE_SELECTOR_LABEL_KEY,
  KUBE_INSTANCE_LABEL,
} from '@odf/mco/constants';
import {
  getApplicationResourceObj,
  getApplicationSetResourceObj,
  getDRPlacementControlResourceObj,
  useACMSafeFetch,
} from '@odf/mco/hooks';
import { ACMSubscriptionModel, ArgoApplicationSetModel } from '@odf/mco/models';
import {
  ArgoApplicationSetKind,
  DRPlacementControlKind,
  SearchResultItemType,
} from '@odf/mco/types';
import {
  getLabelsFromSearchResult,
  queryManagedApplicationResourcesForVM,
} from '@odf/mco/utils';
import { ApplicationKind, getLabel, getName, getNamespace } from '@odf/shared';
import {
  K8sResourceCommon,
  useK8sWatchResource,
} from '@openshift-console/dynamic-plugin-sdk';
import {
  ApplicationSetParser,
  SubscriptionParser,
  DiscoveredParser,
} from '../parsers';

const ApplicationSetHelper: React.FC<any> = ({ name, namespace }) => {
  const [resource, loaded, loadError] =
    useK8sWatchResource<ArgoApplicationSetKind>(
      getApplicationSetResourceObj({ name, namespace })
    );

  return loaded && !loadError ? (
    <ApplicationSetParser application={resource} />
  ) : null;
};

const SubscriptionHelper: React.FC<any> = (name, namespace) => {
  const [resource, loaded, loadError] = useK8sWatchResource<ApplicationKind>(
    getApplicationResourceObj({ name, namespace })
  );

  return loaded && !loadError ? (
    <SubscriptionParser application={resource} />
  ) : null;
};

const DiscoveredHelper: React.FC<any> = ({ protectionName }) => {
  const [drpc, loaded, loadError] = useK8sWatchResource<DRPlacementControlKind>(
    getDRPlacementControlResourceObj({
      namespace: DISCOVERED_APP_NS,
      name: protectionName + '-drpc',
    })
  );

  return loaded && !loadError ? <DiscoveredParser application={drpc} /> : null;
};

export const VirtualMachineParser: React.FC<VirtualMachineParserProps> = ({
  application: virtualMachine,
}) => {
  const vmName = getName(virtualMachine);
  const vmNamespace = getNamespace(virtualMachine);
  const clusterName = virtualMachine?.['status']?.cluster;
  const applicationSetName = getLabel(virtualMachine, KUBE_INSTANCE_LABEL);
  const protectionName = getLabel(
    virtualMachine,
    K8S_RESOURCE_SELECTOR_LABEL_KEY
  );

  // ACM search API call to find managed application resource
  const searchQuery = React.useMemo(
    () =>
      queryManagedApplicationResourcesForVM(
        [vmName, applicationSetName],
        vmNamespace,
        clusterName
      ),
    [vmName, vmNamespace, clusterName, applicationSetName]
  );

  const [searchResult] = useACMSafeFetch(searchQuery);

  // Extract managed application CR (Application / ApplicationSet)
  const managedApplication: SearchResultItemType =
    searchResult?.data?.searchResult?.[0]?.related?.[0]?.items?.find(
      (item) => item.cluster === HUB_CLUSTER_NAME
    );

  const { name, namespace, kind } = managedApplication || {};

  // Conditional rendering based on the kind of managedApplication
  if (kind === ArgoApplicationSetModel.kind) {
    return <ApplicationSetHelper name={name} namespace={namespace} />;
  }

  if (kind === ACMSubscriptionModel.kind) {
    return (
      <SubscriptionHelper
        name={getLabelsFromSearchResult(managedApplication)?.app?.[0]}
        namespace={namespace}
      />
    );
  }

  return <DiscoveredHelper protectionName={protectionName} />;
};

type VirtualMachineParserProps = {
  application: K8sResourceCommon;
};

export default VirtualMachineParser;
