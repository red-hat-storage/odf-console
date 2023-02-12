import * as React from 'react';
import { ApplicationModel } from '@odf/shared/models';
import { ApplicationKind } from '@odf/shared/types';
import { referenceForModel } from '@odf/shared/utils';
import { ArgoApplicationSetModel } from '../../../models';
import { ACMApplicationKind, ArgoApplicationSetKind } from '../../../types';
import { getGVKFromK8Resource } from '../../../utils';
import { ArogoApplicationSetStatus } from './argo-application-set';
import { DataPoliciesStatusPopover as SubscriptionStatusPopover } from './subscriptions/data-policies-status-popover';

const DataPoliciesStatus: React.FC<DataPoliciesStatusProps> = ({
  resource,
}) => {
  const gvk = getGVKFromK8Resource(resource);

  return (
    <>
      {gvk === referenceForModel(ArgoApplicationSetModel) && (
        <ArogoApplicationSetStatus
          application={resource as ArgoApplicationSetKind}
        />
      )}
      {gvk === referenceForModel(ApplicationModel) && (
        <SubscriptionStatusPopover application={resource as ApplicationKind} />
      )}
    </>
  );
};

type DataPoliciesStatusProps = {
  resource: ACMApplicationKind;
};

export default DataPoliciesStatus;
