import * as React from 'react';
import { ArgoApplicationSetModel, VirtualMachineModel } from '@odf/shared';
import { ApplicationModel } from '@odf/shared/models';
import { getGVKofResource, referenceForModel } from '@odf/shared/utils';
import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk';
import {
  ApplicationSetParser,
  SubscriptionParser,
  VirtualMachineParser,
} from './parsers';
import { ModalViewContext } from './utils/reducer';

const ComponentMap = {
  [referenceForModel(ArgoApplicationSetModel)]: ApplicationSetParser,
  [referenceForModel(ApplicationModel)]: SubscriptionParser,
  [referenceForModel(VirtualMachineModel)]: VirtualMachineParser,
};

// Memoizing the component to prevent unnecessary re-renders.
// Problem: Without React.memo, the component re-renders even if props haven't changed.
// Fix: React.memo ensures the component only re-renders when `application`, `cluster`, or `setCurrentModalContext` changes.
export const AppManagePoliciesModalBody: React.FC<AppManagePoliciesModalBodyProps> =
  React.memo(({ application, cluster, setCurrentModalContext }) => {
    const gvk = getGVKofResource(application);
    const SelectedComponent = ComponentMap[gvk];

    return SelectedComponent ? (
      <SelectedComponent
        application={application as any}
        cluster={cluster}
        setCurrentModalContext={setCurrentModalContext}
      />
    ) : null;
  });

type AppManagePoliciesModalBodyProps = {
  application: K8sResourceCommon;
  cluster?: string;
  setCurrentModalContext: React.Dispatch<
    React.SetStateAction<ModalViewContext>
  >;
};
