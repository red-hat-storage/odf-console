import * as React from 'react';
import { StatusBox } from '@odf/shared/generic/status-box';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { Modal, ModalVariant } from '@patternfly/react-core';
import { PolicyConfigView } from './policy-config-view';
import { PolicyListView } from './policy-list-view';
import {
  ManagePolicyStateAction,
  ManagePolicyStateType,
  MessageType,
  ModalActionContext,
  ModalViewContext,
  initialPolicyState,
  managePolicyStateReducer,
  ManagePolicyState,
} from './utils/reducer';
import { ApplicationInfoType, ApplicationType } from './utils/types';

export const ModalContextViewer: React.FC<ModalContextViewerProps> = ({
  applicaitonInfo,
  state,
  dispatch,
}) => {
  const setModalContext = React.useCallback(
    (modalViewContext: ModalViewContext) =>
      dispatch({
        type: ManagePolicyStateType.SET_MODAL_VIEW_CONTEXT,
        payload: modalViewContext,
      }),
    [dispatch]
  );

  const setModalActionContext = React.useCallback(
    (
      modalActionContext: ModalActionContext,
      modalViewContext?: ModalViewContext
    ) =>
      dispatch({
        type: ManagePolicyStateType.SET_MODAL_ACTION_CONTEXT,
        context: modalViewContext || state.modalViewContext,
        payload: modalActionContext,
      }),
    [dispatch, state.modalViewContext]
  );

  const setMessage = React.useCallback(
    (message: MessageType, modalViewContext?: ModalViewContext) =>
      dispatch({
        type: ManagePolicyStateType.SET_MESSAGE,
        context: modalViewContext || state.modalViewContext,
        payload: message,
      }),
    [dispatch, state.modalViewContext]
  );

  return (
    <>
      {state.modalViewContext === ModalViewContext.POLICY_LIST_VIEW && (
        <PolicyListView
          dataPolicyInfo={applicaitonInfo?.dataPolicies}
          state={state.policyListView}
          dispatch={dispatch}
          setModalContext={setModalContext}
          setModalActionContext={setModalActionContext}
          setMessage={setMessage}
        />
      )}
      {state.modalViewContext === ModalViewContext.POLICY_CONFIGURATON_VIEW && (
        <PolicyConfigView
          state={state.policyConfigurationView}
          setModalContext={setModalContext}
        />
      )}
    </>
  );
};

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

  return (
    <Modal
      title={t('Manage data policy')}
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
        <ModalContextViewer
          applicaitonInfo={applicaitonInfo as ApplicationType}
          state={state}
          dispatch={dispatch}
        />
      ) : (
        <StatusBox loadError={loadError} loaded={loaded} />
      )}
    </Modal>
  );
};

type AppManagePoliciesModalProps = {
  applicaitonInfo: ApplicationInfoType;
  loaded: boolean;
  loadError: any;
  isOpen: boolean;
  close?: () => void;
};

type ModalContextViewerProps = {
  state: ManagePolicyState;
  applicaitonInfo: ApplicationType;
  dispatch: React.Dispatch<ManagePolicyStateAction>;
};
