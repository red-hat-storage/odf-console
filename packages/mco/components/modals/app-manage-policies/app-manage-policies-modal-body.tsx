import * as React from 'react';
import { ArgoApplicationSetModel, VirtualMachineModel } from '@odf/mco/models';
import { ApplicationModel } from '@odf/shared/models';
import {
  getGVKofResource,
  referenceFor,
  referenceForModel,
} from '@odf/shared/utils';
import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk';
import {
  ApplicationSetParser,
  SubscriptionParser,
  VirtualMachineParser,
} from './parsers';
import { ModalViewContext } from './utils/reducer';

const getGVK = (resource: K8sResourceCommon) =>
  resource?.['apigroup']
    ? // ACM search API compatibile fields
      referenceFor(resource['apigroup'])(resource['apiversion'])(resource.kind)
    : getGVKofResource(resource);

const ComponentMap = {
  [referenceForModel(ArgoApplicationSetModel)]: ApplicationSetParser,
  [referenceForModel(ApplicationModel)]: SubscriptionParser,
  [referenceForModel(VirtualMachineModel)]: VirtualMachineParser,
};

export const AppManagePoliciesModalBody: React.FC<AppManagePoliciesModalBodyProps> =
  ({ application, cluster, setCurrentModalContext }) => {
    const gvk = getGVK(application);

    const SelectedComponent = ComponentMap[gvk];

    return SelectedComponent ? (
      <SelectedComponent
        application={application as any}
        cluster={cluster}
        setCurrentModalContext={setCurrentModalContext}
      />
    ) : null;
  };

type AppManagePoliciesModalBodyProps = {
  application: K8sResourceCommon;
  // ACM search API compatibile field
  cluster?: string;
  setCurrentModalContext: React.Dispatch<
    React.SetStateAction<ModalViewContext>
  >;
};
