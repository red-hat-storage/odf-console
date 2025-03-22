import * as React from 'react';
import { ArgoApplicationSetKind } from '@odf/mco/types';
import { getGVKFromK8Resource } from '@odf/mco/utils';
import { ArgoApplicationSetModel } from '@odf/shared';
import { ApplicationModel } from '@odf/shared/models';
import { ApplicationKind } from '@odf/shared/types';
import { referenceForModel } from '@odf/shared/utils';
import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk';
import { ApplicationSetParser, SubscriptionParser } from './parsers';

const DRStatus: React.FC<DRStatusProps> = ({ resource }) => {
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

type DRStatusProps = {
  resource: K8sResourceCommon;
};

export default DRStatus;
