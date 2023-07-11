import * as React from 'react';
import { ArgoApplicationSetModel } from '@odf/mco/models';
import { ACMApplicationKind, ArgoApplicationSetKind } from '@odf/mco/types';
import { ApplicationModel } from '@odf/shared/models';
import { ApplicationKind } from '@odf/shared/types';
import { getGVKofResource, referenceForModel } from '@odf/shared/utils';
import { ApplicationSetParser } from './parsers/application-set-parser';
import { SubscriptionParser } from './parsers/subscription-parser';

export const AppManageDataPolicy: React.FC<ACMActionCallbackProps> = ({
  resource,
  close,
  isOpen,
}) => {
  const gvk = getGVKofResource(resource);
  return (
    <>
      {gvk === referenceForModel(ArgoApplicationSetModel) && (
        <ApplicationSetParser
          application={resource as ArgoApplicationSetKind}
          isOpen={isOpen}
          close={close}
        />
      )}
      {gvk === referenceForModel(ApplicationModel) && (
        <SubscriptionParser
          application={resource as ApplicationKind}
          isOpen={isOpen}
          close={close}
        />
      )}
    </>
  );
};

export type ACMActionCallbackProps = {
  isOpen: boolean;
  resource: ACMApplicationKind;
  close: () => void;
};
