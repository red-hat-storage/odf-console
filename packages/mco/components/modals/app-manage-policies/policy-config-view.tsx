import * as React from 'react';
import { ModalBody, ModalFooter } from '@odf/shared/modals/Modal';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { Button, ButtonVariant } from '@patternfly/react-core';
import { PolicyConfigViewer } from './helper/policy-config-viewer';
import { ModalViewContext, PolicyConfigViewState } from './utils/reducer';

export const PolicyConfigView: React.FC<PolicyConfigViewProps> = ({
  state,
  setModalContext,
}) => {
  const { t } = useCustomTranslation();

  return (
    <>
      <ModalBody>
        <PolicyConfigViewer policy={state.policy} />
      </ModalBody>
      <ModalFooter>
        <Button
          id="modal-back-action"
          variant={ButtonVariant.secondary}
          onClick={() => setModalContext(ModalViewContext.POLICY_LIST_VIEW)}
        >
          {t('Back')}
        </Button>
      </ModalFooter>
    </>
  );
};

type PolicyConfigViewProps = {
  state: PolicyConfigViewState;
  setModalContext: (modalViewContext: ModalViewContext) => void;
};
