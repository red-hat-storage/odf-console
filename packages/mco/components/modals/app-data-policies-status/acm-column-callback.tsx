import * as React from 'react';
import { ApplicationModel } from '@odf/shared/models';
import { ApplicationKind } from '@odf/shared/types';
import { referenceForModel } from '@odf/shared/utils';
import { ArgoApplicationSetModel } from '../../../models';
import { ACMApplicationKind, ArgoApplicationSetKind } from '../../../types';
import { getGVKFromK8Resource } from '../../../utils';
import ArgoApplicationDRStatusPopover from '../../dr-status-popover/application-set-parser';
import SubscriptionDRStatusPopover from '../../dr-status-popover/subscription-application-parser';
// import { ArogoApplicationSetStatus } from './argo-application-set';
// import { DataPoliciesStatusPopover as SubscriptionStatusPopover } from './subscriptions/data-policies-status-popover';

const DataPoliciesStatus: React.FC<DataPoliciesStatusProps> = ({
  resource,
}) => {
  const gvk = getGVKFromK8Resource(resource);

  return (
    <>
      {gvk === referenceForModel(ArgoApplicationSetModel) && (
        <ArgoApplicationDRStatusPopover
          application={resource as ArgoApplicationSetKind}
        />
      )}
      {gvk === referenceForModel(ApplicationModel) && (
        <SubscriptionDRStatusPopover
          application={resource as ApplicationKind}
        />
      )}
    </>
  );
};

type DataPoliciesStatusProps = {
  resource: ACMApplicationKind;
};

export default DataPoliciesStatus;
