import * as React from 'react';
import { KUBE_INSTANCE_LABEL } from '@odf/mco/constants';
import { useACMSafeFetch } from '@odf/mco/hooks';
import { ArgoApplicationSetKind, SearchResultItemType } from '@odf/mco/types';
import {
  getLabelsFromSearchResult,
  querySubscriptionResourcesForVM,
  queryApplicationSetResourcesForVM,
  getVMClusterName,
} from '@odf/mco/utils';
import {
  ApplicationKind,
  ACMSubscriptionModel,
  ArgoApplicationSetModel,
  VirtualMachineModel,
} from '@odf/shared';
import {
  ApplicationModel,
  getLabel,
  getName,
  getNamespace,
  StatusBox,
} from '@odf/shared';
import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk';
import { ModalViewContext } from '../utils/reducer';
import { ModalType, PVCQueryFilter } from '../utils/types';
import { ApplicationSetParser } from './application-set-parser';
import { DiscoveredVMParser } from './discovered-vm-parser';
import { SubscriptionParser } from './subscription-parser';

const createApplicationSetObj = (
  name: string,
  namespace: string
): ArgoApplicationSetKind => ({
  apiVersion: `${ArgoApplicationSetModel.apiGroup}/${ArgoApplicationSetModel.apiVersion}`,
  kind: ArgoApplicationSetModel.kind,
  metadata: { name, namespace },
  spec: {},
});

const createApplicationObj = (
  name: string,
  namespace: string
): ApplicationKind => ({
  apiVersion: `${ApplicationModel.apiGroup}/${ApplicationModel.apiVersion}`,
  kind: ApplicationModel.kind,
  metadata: {
    name: name,
    namespace,
  },
  spec: {
    componentKinds: [
      { group: ACMSubscriptionModel.apiGroup, kind: ACMSubscriptionModel.kind },
    ],
  },
});

const getPVCQueryFilter = (
  name: string,
  namespace: string,
  cluster: string
): PVCQueryFilter => [
  { property: 'name', values: name },
  { property: 'kind', values: VirtualMachineModel.kind },
  { property: 'apigroup', values: VirtualMachineModel.apiGroup },
  { property: 'namespace', values: namespace },
  { property: 'cluster', values: cluster },
];

export const VirtualMachineParser: React.FC<VirtualMachineParserProps> = ({
  application: virtualMachine,
  cluster,
  setCurrentModalContext,
}) => {
  const vmName = getName(virtualMachine);
  const vmNamespace = getNamespace(virtualMachine);
  const clusterName = getVMClusterName(virtualMachine) || cluster;
  const argoApplicationName = getLabel(virtualMachine, KUBE_INSTANCE_LABEL);
  const pvcQueryFilter = getPVCQueryFilter(vmName, vmNamespace, clusterName);

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
    return <StatusBox loaded={searchLoaded} loadError={searchError} />;
  }

  // Extract managed application CR (Application / ApplicationSet)
  const managedApplication: SearchResultItemType =
    searchResult?.data?.searchResult?.[0]?.related?.[0]?.items?.[0];

  const { name, namespace, kind } = managedApplication || {};

  if (kind === ArgoApplicationSetModel.kind) {
    return (
      <ApplicationSetParser
        application={createApplicationSetObj(name, namespace)}
        setCurrentModalContext={setCurrentModalContext}
        isWatchApplication
        pvcQueryFilter={pvcQueryFilter}
        modalType={ModalType.VirtualMachine}
      />
    );
  }

  if (kind === ACMSubscriptionModel.kind) {
    return (
      <SubscriptionParser
        application={createApplicationObj(
          getLabelsFromSearchResult(managedApplication)?.app?.[0],
          namespace
        )}
        subscriptionName={name}
        isWatchApplication
        setCurrentModalContext={setCurrentModalContext}
        pvcQueryFilter={pvcQueryFilter}
        modalType={ModalType.VirtualMachine}
      />
    );
  }

  return (
    <DiscoveredVMParser
      virtualMachine={virtualMachine}
      setCurrentModalContext={setCurrentModalContext}
      pvcQueryFilter={pvcQueryFilter}
      cluster={clusterName}
    />
  );
};

type VirtualMachineParserProps = {
  application: K8sResourceCommon;
  cluster?: string;
  setCurrentModalContext: React.Dispatch<
    React.SetStateAction<ModalViewContext>
  >;
};
