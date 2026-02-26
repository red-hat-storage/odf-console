import * as React from 'react';
import { CREATE_SS_PAGE_URL, FLASH_STORAGE_CLASS } from '@odf/core/constants';
import { StartingPoint } from '@odf/core/types/install-ui';
import { useCustomTranslation } from '@odf/shared';
import { GreenCheckCircleIcon } from '@openshift-console/dynamic-plugin-sdk';
import { ModalComponent } from '@openshift-console/dynamic-plugin-sdk/lib/app/modal-support/ModalProvider';
import { Modal, ModalVariant } from '@patternfly/react-core/deprecated';
import { Trans } from 'react-i18next';
import { useNavigate } from 'react-router-dom-v5-compat';
import {
  EmptyState,
  EmptyStateActions,
  EmptyStateBody,
  EmptyStateFooter,
  EmptyStateVariant,
  Button,
  ButtonVariant,
} from '@patternfly/react-core';

export const DeployDataFoundationModal: ModalComponent = ({ closeModal }) => {
  const { t } = useCustomTranslation();
  const navigate = useNavigate();

  const onDeploy = () => {
    const urlParams = new URLSearchParams({
      mode: StartingPoint.STORAGE_CLUSTER,
      storageClass: FLASH_STORAGE_CLASS,
    });
    navigate(`${CREATE_SS_PAGE_URL}?${urlParams.toString()}`);
    closeModal();
  };

  return (
    <Modal
      title={t('Deploy Data Foundation')}
      isOpen={true}
      onClose={closeModal}
      variant={ModalVariant.small}
    >
      <EmptyState
        headingLevel="h4"
        icon={GreenCheckCircleIcon}
        titleText={t('Deploy Data Foundation on IBM FlashSystem')}
        variant={EmptyStateVariant.sm}
      >
        <EmptyStateBody>
          <Trans t={t}>
            Your IBM FlashSystem has been successfully configured. To enable
            persistent storage for your OpenShift workloads, deploy Data
            Foundation using the available FlashSystem storage class. Click
            Deploy Data Foundation to begin installation and configure storage
            resources using IBM FlashSystem.
          </Trans>
        </EmptyStateBody>
        <EmptyStateFooter>
          <EmptyStateActions>
            <Button variant={ButtonVariant.primary} onClick={onDeploy}>
              {t('Deploy Data Foundation')}
            </Button>
          </EmptyStateActions>
        </EmptyStateFooter>
      </EmptyState>
    </Modal>
  );
};
