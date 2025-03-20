import * as React from 'react';
import { ArgoApplicationSetKind } from '@odf/mco/types';
import { convertSearchResult, getGVKFromK8Resource } from '@odf/mco/utils';
import { ArgoApplicationSetModel, VirtualMachineModel } from '@odf/shared';
import { ApplicationModel } from '@odf/shared/models';
import { ApplicationKind } from '@odf/shared/types';
import { referenceForModel } from '@odf/shared/utils';
import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk';
import { ApplicationSetParser, SubscriptionParser } from './parsers';
import VirtualMachineParser from './parsers/virtualmachine-parser';

const DRStatus: React.FC<DRStatusProps> = ({ resource }) => {
  const application =
    'apigroup' in resource ? convertSearchResult(resource as any) : resource;
  const gvk = getGVKFromK8Resource(application);

  return (
    <>
      {gvk === referenceForModel(ArgoApplicationSetModel) && (
        <ApplicationSetParser
          application={application as ArgoApplicationSetKind}
        />
      )}
      {gvk === referenceForModel(ApplicationModel) && (
        <SubscriptionParser application={application as ApplicationKind} />
      )}
      {gvk === referenceForModel(VirtualMachineModel) && (
        <VirtualMachineParser virtualMachine={application as any} />
      )}
    </>
  );
};

type DRStatusProps = {
  resource: K8sResourceCommon;
};

export default DRStatus;
