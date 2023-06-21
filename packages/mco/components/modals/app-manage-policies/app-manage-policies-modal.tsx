import * as React from 'react';
import { StatusBox } from '@odf/shared/generic/status-box';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { Modal, ModalVariant } from '@patternfly/react-core';
import { PolicyListView } from './policy-list-view';
import {
  ManagePolicyStateType,
  ModalActionContext,
  ModalViewContext,
  initialPolicyState,
  managePolicyStateReducer,
} from './utils/reducer';
import { ApplicationType } from './utils/types';

export const AppManagePoliciesModal: React.FC<AppManagePoliciesModalProps> = ({
  applicaitonInfo,
  loaded,
  loadError,
  isOpen,
  close,
}) => {
  const [state, dispatch] = React.useReducer(
    managePolicyStateReducer,
    initialPolicyState
  );
  const { t } = useCustomTranslation();

  const setModalContext = (modalViewContext: ModalViewContext) => {
    dispatch({
      type: ManagePolicyStateType.SET_MODAL_VIEW_CONTEXT,
      payload: modalViewContext,
    });
  };

  const setModalActionContext = (modalViewContext: ModalActionContext) =>
    dispatch({
      type: ManagePolicyStateType.SET_MODAL_ACTION_CONTEXT,
      context: state.modalViewContext,
      payload: modalViewContext,
    });

  const setError = (error: string) =>
    dispatch({
      type: ManagePolicyStateType.SET_ERROR,
      context: state.modalViewContext,
      payload: error,
    });

  return (
    <Modal
      title={t('Manage Policy')}
      description={t(
        'Assign policy to protect the application and ensure quick recovery. Unassign policy from an application when they no longer require to be managed.'
      )}
      variant={ModalVariant.large}
      isOpen={isOpen}
      aria-label="Manage policy modal"
      aria-describedby="manage-policy-modal"
      onClose={close}
    >
      {loaded && !loadError ? (
        state.modalViewContext === ModalViewContext.POLICY_LIST_VIEW && (
          <PolicyListView
            dataPolicyInfo={applicaitonInfo?.dataPolicies}
            state={state.policyListView}
            dispatch={dispatch}
            setModalContext={setModalContext}
            setModalActionContext={setModalActionContext}
            setError={setError}
          />
        )
      ) : (
        <StatusBox loadError={loadError} loaded={loaded} />
      )}
    </Modal>
  );
};

export type AppManagePoliciesModalProps = {
  applicaitonInfo: ApplicationType;
  loaded: boolean;
  loadError: any;
  isOpen: boolean;
  close?: () => void;
};
