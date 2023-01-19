import * as React from 'react';
import { referenceForModel } from '@odf/shared/utils';
import { DRActionType } from '../../../constants';
import { ArgoApplicationSetModel } from '../../../models';
import { ACMApplicationKind } from '../../../types';
import { getGVKFromK8Resource } from '../../../utils';
import { ArogoApplicationSetModal } from './argo-application-set';

export const ApplicationFailover = (props: ModalProps) => {
  const { resource, close, isOpen } = props;
  const gvk = getGVKFromK8Resource(resource);

  return (
    gvk === referenceForModel(ArgoApplicationSetModel) && (
      <ArogoApplicationSetModal
        action={DRActionType.FAILOVER}
        application={resource}
        isOpen={isOpen}
        close={close}
      />
    )
  );
};

export const ApplicationRelocate = (props: ModalProps) => {
  const { resource, close, isOpen } = props;
  const gvk = getGVKFromK8Resource(resource);

  return (
    gvk === referenceForModel(ArgoApplicationSetModel) && (
      <ArogoApplicationSetModal
        action={DRActionType.RELOCATE}
        application={resource}
        isOpen={isOpen}
        close={close}
      />
    )
  );
};

// ACM application action props
type ModalProps = {
  isOpen: boolean;
  resource: ACMApplicationKind;
  close: () => void;
};
