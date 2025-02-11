import * as React from 'react';
import { getName, getNamespace } from '@odf/shared/selectors';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk';
import { Trans } from 'react-i18next';
import { Modal, ModalVariant } from '@patternfly/react-core';
import { AppManagePoliciesModalBody } from './app-manage-policies-modal-body';
import { ModalViewContext } from './utils/reducer';

export const AppManagePoliciesModal: React.FC<AppManagePoliciesModalProps> = ({
  resource: application,
  cluster,
  isOpen,
  close,
}) => {
  const { t } = useCustomTranslation();
  const [currentModalContext, setCurrentModalContext] = React.useState(
    ModalViewContext.MANAGE_POLICY_VIEW
  );

  const applicationName = getName(application) ?? application?.['name'];
  const applicationNamespace =
    getNamespace(application) ?? application?.['namespace'];

  const title =
    currentModalContext === ModalViewContext.ASSIGN_POLICY_VIEW
      ? t('Enroll managed application')
      : t('Manage disaster recovery');

  const description = (
    <Trans t={t}>
      <strong>Application:</strong> {applicationName} (Namespace:{' '}
      {applicationNamespace})
    </Trans>
  );

  return (
    <Modal
      title={title}
      description={description}
      variant={ModalVariant.large}
      isOpen={isOpen}
      aria-label="Manage policy modal"
      aria-describedby="manage-policy-modal"
      onClose={close}
    >
      <AppManagePoliciesModalBody
        application={application}
        cluster={cluster}
        setCurrentModalContext={setCurrentModalContext}
      />
    </Modal>
  );
};

type AppManagePoliciesModalProps = {
  resource: K8sResourceCommon;
  isOpen: boolean;
  close: () => void;
  // ACM search API compatibile field
  cluster?: string;
};

export default AppManagePoliciesModal;
