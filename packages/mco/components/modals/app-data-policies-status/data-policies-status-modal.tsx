import * as React from 'react';
import { CommonModalProps } from '@odf/shared/modals/common';
import { ModalBody, ModalFooter } from '@odf/shared/modals/Modal';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { Modal, Button, Nav, NavList, NavItem } from '@patternfly/react-core';
import { DRPolicyMap, getDRPoliciesCount } from '../../../utils';
import { DRPoliciesStatusTable } from './dr-status-table';
import './data-policies-status-modal.scss';

const DataPoliciesStatusModal: React.FC<CommonModalProps> = ({
  isOpen,
  extraProps,
  closeModal,
}) => {
  const dataPoliciesStatus = extraProps as DataPoliciesStatusType;
  const { t } = useCustomTranslation();
  const policiesCount = getDRPoliciesCount(dataPoliciesStatus?.drPolicies);

  return (
    <>
      <Modal
        title={t('Data Policies ({{count}})', { count: policiesCount })}
        variant="medium"
        isOpen={isOpen}
        onClose={closeModal}
      >
        <ModalBody>
          <Nav
            variant="tertiary"
            className="mco-data-policies-status-modal__nav"
          >
            <NavList>
              <NavItem
                key="disaster_recover"
                isActive={true}
                data-test="dr-tab"
              >
                {t('Disaster Recovery ({{count}})', { count: policiesCount })}
              </NavItem>
            </NavList>
          </Nav>
          <div className="mco-data-policies-status-modal__body">
            <DRPoliciesStatusTable
              drPolicies={dataPoliciesStatus?.drPolicies}
            />
          </div>
        </ModalBody>
        <ModalFooter>
          <Button key="close" variant="primary" onClick={closeModal}>
            {t('Close')}
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
};

export type DataPoliciesStatusType = {
  drPolicies: DRPolicyMap;
};

export default DataPoliciesStatusModal;
