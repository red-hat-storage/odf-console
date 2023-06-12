import * as React from 'react';
import { ArgoApplicationSetModel } from '@odf/mco/models';
import { ArgoApplicationSetKind } from '@odf/mco/types';
import { getGVKofResource, referenceForModel } from '@odf/shared/utils';
import { ApplicationSetParser } from './parsers/application-set-parser';

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
          application={resource}
          isOpen={isOpen}
          close={close}
        />
      )}
    </>
  );
};

export type ACMActionCallbackProps = {
  isOpen: boolean;
  resource: ArgoApplicationSetKind;
  close: () => void;
};
