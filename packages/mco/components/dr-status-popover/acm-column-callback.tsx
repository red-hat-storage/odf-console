import * as React from 'react';
import { ArgoApplicationSetModel } from '@odf/mco/models';
import { ACMApplicationKind, ArgoApplicationSetKind } from '@odf/mco/types';
import { getGVKFromK8Resource } from '@odf/mco/utils';
import { ApplicationModel } from '@odf/shared/models';
import { ApplicationKind } from '@odf/shared/types';
import { referenceForModel } from '@odf/shared/utils';
import ApplicationSetParser from './parsers/applicationset-parser';
import SubscriptionParser from './parsers/subscription-parser';

const DataPoliciesStatus: React.FC<DataPoliciesStatusProps> = ({
  resource,
}) => {
  const gvk = getGVKFromK8Resource(resource);

  return (
    <>
      {gvk === referenceForModel(ArgoApplicationSetModel) && (
        <ApplicationSetParser
          application={resource as ArgoApplicationSetKind}
        />
      )}
      {gvk === referenceForModel(ApplicationModel) && (
        <SubscriptionParser application={resource as ApplicationKind} />
      )}
    </>
  );
};

type DataPoliciesStatusProps = {
  resource: ACMApplicationKind;
};

export default DataPoliciesStatus;
