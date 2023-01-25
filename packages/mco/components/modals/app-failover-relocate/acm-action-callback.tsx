import * as React from 'react';
import { ApplicationModel } from '@odf/shared/models';
import { ApplicationKind } from '@odf/shared/types';
import { referenceForModel } from '@odf/shared/utils';
import { DRActionType } from '../../../constants';
import { ArgoApplicationSetModel } from '../../../models';
import { ACMApplicationKind, ArgoApplicationSetKind } from '../../../types';
import { getGVKFromK8Resource } from '../../../utils';
import { ArogoApplicationSetModal } from './argo-application-set';
import { SubscriptionFailoverRelocateModal } from './subscriptions/failover-relocate-modal';

export const ApplicationFailover = (props: ModalProps) => {
  const { resource, close, isOpen } = props;
  const gvk = getGVKFromK8Resource(resource);

  return (
    <>
      {gvk === referenceForModel(ArgoApplicationSetModel) && (
        <ArogoApplicationSetModal
          action={DRActionType.FAILOVER}
          application={resource as ArgoApplicationSetKind}
          isOpen={isOpen}
          close={close}
        />
      )}
      {gvk === referenceForModel(ApplicationModel) && (
        <SubscriptionFailoverRelocateModal
          action={DRActionType.FAILOVER}
          resource={resource as ApplicationKind}
          isOpen={isOpen}
          close={close}
        />
      )}
    </>
  );
};

export const ApplicationRelocate = (props: ModalProps) => {
  const { resource, close, isOpen } = props;
  const gvk = getGVKFromK8Resource(resource);

  return (
    <>
      {gvk === referenceForModel(ArgoApplicationSetModel) && (
        <ArogoApplicationSetModal
          action={DRActionType.RELOCATE}
          application={resource as ArgoApplicationSetKind}
          isOpen={isOpen}
          close={close}
        />
      )}
      {gvk === referenceForModel(ApplicationModel) && (
        <SubscriptionFailoverRelocateModal
          action={DRActionType.RELOCATE}
          resource={resource as ApplicationKind}
          isOpen={isOpen}
          close={close}
        />
      )}
    </>
  );
};

// ACM application action props
type ModalProps = {
  isOpen: boolean;
  resource: ACMApplicationKind;
  close: () => void;
};
