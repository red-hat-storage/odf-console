import * as React from 'react';
import { StatusBox } from '@odf/shared/generic/status-box';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { TFunction } from 'i18next';
import { Modal, ModalVariant } from '@patternfly/react-core';
import { AssignPolicyView } from './assign-policy-view';
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
import {
  ApplicationInfoType,
  ApplicationType,
  DataPolicyType,
} from './utils/types';

const getModalTitle = (modalViewContext: ModalViewContext, t: TFunction) => {
  if (modalViewContext === ModalViewContext.ASSIGN_POLICY_VIEW) {
    return {
      title: t('Assign data policy'),
      description: t(
        'Secure your application by assigning a policy from the available policy templates.'
      ),
    };
  } else {
    return {
      title: t('Manage data policy'),
      description: t(
        'Assign a policy to protect the application and to ensure a quick recovery.'
      ),
    };
  }
};

export const ModalContextViewer: React.FC<ModalContextViewerProps> = ({
  applicaitonInfo,
  state,
  matchingPolicies,
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
      {state.modalViewContext === ModalViewContext.ASSIGN_POLICY_VIEW && (
        <AssignPolicyView
          applicaitonInfo={applicaitonInfo}
          matchingPolicies={matchingPolicies}
          state={state.assignPolicyView}
          dispatch={dispatch}
          setModalContext={setModalContext}
          setModalActionContext={setModalActionContext}
          setMessage={setMessage}
        />
      )}
    </>
  );
};

export const AppManagePoliciesModal: React.FC<AppManagePoliciesModalProps> = ({
  applicaitonInfo,
  matchingPolicies,
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
  const modalTitle = getModalTitle(state.modalViewContext, t);

  return (
    <Modal
      title={modalTitle.title}
      description={modalTitle.description}
      variant={ModalVariant.large}
      isOpen={isOpen}
      aria-label="Manage policy modal"
      aria-describedby="manage-policy-modal"
      onClose={close}
    >
      {loaded && !loadError ? (
        <ModalContextViewer
          applicaitonInfo={applicaitonInfo as ApplicationType}
          matchingPolicies={matchingPolicies}
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
  matchingPolicies: DataPolicyType[];
  loaded: boolean;
  loadError: any;
  isOpen: boolean;
  close?: () => void;
};

type ModalContextViewerProps = {
  state: ManagePolicyState;
  applicaitonInfo: ApplicationType;
  matchingPolicies: DataPolicyType[];
  dispatch: React.Dispatch<ManagePolicyStateAction>;
};
