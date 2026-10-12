import * as React from 'react';
import { ApplicationType, DRActionType } from '@odf/mco/constants';
import { useApplicationFromPAV } from '@odf/mco/hooks/use-application-pav';
import { ArgoApplicationSetKind } from '@odf/mco/types';
import { ProtectedApplicationViewKind } from '@odf/mco/types/pav';
import { ApplicationKind, useCustomTranslation } from '@odf/shared';
import { CommonModalProps } from '@odf/shared/modals';
import { Modal, ModalVariant } from '@patternfly/react-core/deprecated';
import { Bullseye, Spinner, Alert } from '@patternfly/react-core';
import { ArogoApplicationSetParser } from '../app-failover-relocate/parser/argo-application-set-parser';
import { SubscriptionFailoverRelocateModal } from '../app-failover-relocate/subscriptions/failover-relocate-modal';

export type ApplicationActionModalProps = {
  pav: ProtectedApplicationViewKind;
  action: DRActionType.FAILOVER | DRActionType.RELOCATE;
  isTestFailover?: boolean;
};

export const ApplicationActionModal: React.FC<
  CommonModalProps<ApplicationActionModalProps>
> = ({ isOpen, closeModal, extraProps: { pav, action, isTestFailover } }) => {
  const { application, loaded, error, appInfo } = useApplicationFromPAV(pav);
  const { t } = useCustomTranslation();

  if (!loaded || error || !application) {
    return (
      <Modal
        variant={ModalVariant.small}
        isOpen={isOpen}
        onClose={closeModal}
        title={isTestFailover ? t('Test Disaster Recovery (DR)') : action}
      >
        {!loaded ? (
          <Bullseye>
            <Spinner size="lg" />
          </Bullseye>
        ) : (
          <Alert variant="danger" title={t('Failed to fetch application')}>
            {error?.message}
          </Alert>
        )}
      </Modal>
    );
  }

  return appInfo?.type === ApplicationType.ApplicationSet ? (
    <ArogoApplicationSetParser
      action={action}
      application={application as ArgoApplicationSetKind}
      isOpen={isOpen}
      close={closeModal}
      isTestFailover={isTestFailover}
    />
  ) : (
    <SubscriptionFailoverRelocateModal
      action={action}
      resource={application as ApplicationKind}
      isOpen={isOpen}
      close={closeModal}
      isTestFailover={isTestFailover}
    />
  );
};
