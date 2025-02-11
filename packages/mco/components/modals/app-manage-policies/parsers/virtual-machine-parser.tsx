import * as React from 'react';
import { HUB_CLUSTER_NAME, KUBE_INSTANCE_LABEL } from '@odf/mco/constants';
import { useACMSafeFetch } from '@odf/mco/hooks';
import {
  ACMSubscriptionModel,
  ArgoApplicationSetModel,
  VirtualMachineModel,
} from '@odf/mco/models';
import { SearchResultItemType } from '@odf/mco/types';
import {
  getLabelsFromSearchResult,
  queryManagedApplicationResourcesForVM,
} from '@odf/mco/utils';
import {
  ApplicationModel,
  getLabel,
  getName,
  getNamespace,
  StatusBox,
} from '@odf/shared';
import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk';
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

export const VirtualMachineParser: React.FC<VirtualMachineParserProps> = ({
  application: virtualMachine,
  cluster,
  setCurrentModalContext,
}) => {
  const vmName = getName(virtualMachine);
  const vmNamespace = getNamespace(virtualMachine);
  const clusterName = virtualMachine?.['status']?.cluster || cluster;
  const applicationSetName = getLabel(virtualMachine, KUBE_INSTANCE_LABEL);
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

  if (!searchLoaded || searchError) {
    return <StatusBox loaded={searchLoaded} loadError={searchError} />;
  }

  // Extract managed application CR (Application / ApplicationSet)
  const managedApplication: SearchResultItemType =
    searchResult?.data?.searchResult?.[0]?.related?.[0]?.items?.find(
      (item) => item.cluster === HUB_CLUSTER_NAME
    );

  const { name, namespace, kind, apigroup } = managedApplication || {};

  if (kind === ArgoApplicationSetModel.kind) {
    return (
      <ApplicationSetParser
        application={{
          apiVersion: `${ArgoApplicationSetModel.apiGroup}/${ArgoApplicationSetModel.apiVersion}`,
          kind,
          metadata: { name, namespace },
          spec: {},
        }}
        setCurrentModalContext={setCurrentModalContext}
        isWatchApplication
        pvcQueryFilter={pvcQueryFilter}
      />
    );
  }

  if (kind === ACMSubscriptionModel.kind) {
    return (
      <SubscriptionParser
        application={{
          apiVersion: `${ApplicationModel.apiGroup}/${ApplicationModel.apiVersion}`,
          kind: ApplicationModel.kind,
          metadata: {
            name: getLabelsFromSearchResult(managedApplication)?.app?.[0],
            namespace,
          },
          spec: { componentKinds: [{ group: apigroup, kind }] },
        }}
        subscriptionName={name}
        isWatchApplication
        setCurrentModalContext={setCurrentModalContext}
        pvcQueryFilter={pvcQueryFilter}
      />
    );
  }

  // TODO: Add support for discovered application type
  return null;
};

type VirtualMachineParserProps = {
  application: K8sResourceCommon;
  cluster?: string;
  setCurrentModalContext: React.Dispatch<
    React.SetStateAction<ModalViewContext>
  >;
};
