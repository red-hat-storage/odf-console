import * as React from 'react';
import { KUBE_INSTANCE_LABEL } from '@odf/mco/constants';
import { useACMSafeFetch } from '@odf/mco/hooks';
import {
  ACMSubscriptionModel,
  ArgoApplicationSetModel,
  VirtualMachineModel,
} from '@odf/mco/models';
import { SearchResultItemType, VirtualMachineKind } from '@odf/mco/types';
import {
  getLabelsFromSearchResult,
  queryManagedApplicationResourcesForVM,
} from '@odf/mco/utils';
import { ApplicationModel, getLabel, getName, getNamespace } from '@odf/shared';
import { ModalContextViewer } from '../modal-context-viewer';
import { ModalViewContext } from '../utils/reducer';
import { PVCQueryFilter } from '../utils/types';
import { ApplicationSetParser } from './application-set-parser';
import { SubscriptionParser } from './subscription-parser';

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

const getApplicationSetName = (vm: VirtualMachineKind) =>
  getLabel(
    vm,
    KUBE_INSTANCE_LABEL,
    getLabelsFromSearchResult(vm, true)?.[KUBE_INSTANCE_LABEL]?.[0]
  );

export const VirtualMachineParser: React.FC<VirtualMachineParserProps> = ({
  application: virtualMachine,
  cluster,
  setCurrentModalContext,
}) => {
  const vmName = getName(virtualMachine) || virtualMachine?.name;
  const vmNamespace = getNamespace(virtualMachine) || virtualMachine?.namespace;
  const clusterName = cluster || virtualMachine.cluster;
  const applicationSetName = getApplicationSetName(virtualMachine);
  const pvcQueryFilter = getPVCQueryFilter(vmName, vmNamespace, clusterName);

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

  const [searchResult, searchError, searchLoaded] =
    useACMSafeFetch(searchQuery);

  // Extract managed application
  const managedApplication: SearchResultItemType = React.useMemo(() => {
    if (searchLoaded && !searchError) {
      return searchResult?.data?.searchResult?.[0]?.related?.[0]?.items?.find(
        (item) =>
          !item?.['localPlacement'] || item?.['localPlacement'] === 'false'
      );
    }
  }, [searchResult, searchError, searchLoaded]);

  if (!searchLoaded || searchError) {
    return (
      <ModalContextViewer
        applicationInfo={{}}
        loadError={searchError}
        loaded={searchLoaded}
        matchingPolicies={[]}
        setCurrentModalContext={setCurrentModalContext}
      />
    );
  }

  if (managedApplication?.kind === ArgoApplicationSetModel.kind) {
    return (
      <ApplicationSetParser
        application={{
          apiVersion: `${ArgoApplicationSetModel.apiGroup}/${ArgoApplicationSetModel.apiVersion}`,
          kind: ArgoApplicationSetModel.kind,
          metadata: {
            name: managedApplication.name,
            namespace: managedApplication.namespace,
          },
          spec: {},
        }}
        setCurrentModalContext={setCurrentModalContext}
        watchApplication
        pvcQueryFilter={pvcQueryFilter}
      />
    );
  }

  if (managedApplication?.kind === ACMSubscriptionModel.kind) {
    return (
      <SubscriptionParser
        application={{
          apiVersion: `${ApplicationModel.apiGroup}/${ApplicationModel.apiVersion}`,
          kind: ApplicationModel.kind,
          metadata: {
            name: getLabelsFromSearchResult(managedApplication)?.app?.[0],
            namespace: managedApplication.namespace,
          },
          spec: {
            componentKinds: [
              {
                group: managedApplication.apigroup,
                kind: managedApplication.kind,
              },
            ],
          },
        }}
        subscriptionName={managedApplication.name}
        watchApplication
        setCurrentModalContext={setCurrentModalContext}
        pvcQueryFilter={pvcQueryFilter}
      />
    );
  }
  // TODO: Add support for discovered application type
  return null;
};

type VirtualMachineParserProps = {
  application: VirtualMachineKind;
  cluster?: string;
  setCurrentModalContext: React.Dispatch<
    React.SetStateAction<ModalViewContext>
  >;
};
