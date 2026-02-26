import * as React from 'react';
import { StepsCountBadge } from '@odf/shared/badges';
import {
  CommonModalProps,
  ModalBody,
  ModalHeader,
  ModalFooter,
} from '@odf/shared/modals/Modal';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { Modal, ModalVariant } from '@patternfly/react-core/deprecated';
import { Trans } from 'react-i18next';
import { useNavigate } from 'react-router-dom-v5-compat';
import { Button, ButtonVariant, Icon } from '@patternfly/react-core';
import { ArrowRightIcon } from '@patternfly/react-icons';

const ManagedApplicationsModal: React.FC<CommonModalProps> = (props) => {
  const { t } = useCustomTranslation();
  const navigate = useNavigate();

  const { isOpen, closeModal } = props;

  const headerText = t('Enroll ACM managed application');
  const Header = <ModalHeader>{headerText}</ModalHeader>;
  return (
    <Modal
      isOpen={isOpen}
      variant={ModalVariant.medium}
      header={Header}
      onClose={closeModal}
      aria-label={headerText}
    >
      <ModalBody>
        <p className="co-break-word pf-v5-u-mb-md">
          {t(
            'Follow the below steps to enroll your managed applications to disaster recovery:'
          )}
        </p>
        <Trans t={t}>
          <p className="co-break-word pf-v5-u-mb-md">
            <span className="pf-v5-u-mr-sm">
              <StepsCountBadge stepCount={1} />
            </span>{' '}
            Navigate to{' '}
            <span className="pf-v5-u-font-weight-bold">Applications</span>{' '}
            section and locate your application.
          </p>

          <p className="co-break-word pf-v5-u-mb-md">
            <span className="pf-v5-u-mr-sm">
              <StepsCountBadge stepCount={2} />
            </span>{' '}
            Select{' '}
            <span className="pf-v5-u-font-weight-bold">
              Manage disaster recovery
            </span>{' '}
            from inline actions.
          </p>

          <p className="co-break-word">
            <span className="pf-v5-u-mr-sm">
              <StepsCountBadge stepCount={3} />
            </span>{' '}
            In the Manage disaster recovery modal, click on{' '}
            <span className="pf-v5-u-font-weight-bold">Enroll application</span>{' '}
            to start the wizard process.
          </p>
        </Trans>
      </ModalBody>
      <ModalFooter>
        <Button
          icon={
            <Icon size="sm">
              <ArrowRightIcon className="pf-v5-u-ml-sm" />
            </Icon>
          }
          variant={ButtonVariant.link}
          onClick={() => {
            closeModal();
            navigate('/multicloud/applications');
          }}
          isInline
        >
          {t('Continue to Applications page')}
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default ManagedApplicationsModal;
