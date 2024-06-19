import * as React from 'react';
import { APPLICATION_TYPE } from '@odf/mco/constants';
import { getName, getNamespace } from '@odf/shared/selectors';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { Trans } from 'react-i18next';
import { Modal, ModalVariant } from '@patternfly/react-core';
import { AssignPolicyView } from './assign-policy-view';
import { ManagePolicyView } from './manage-policy-view';
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
import { ApplicationType, DRInfoType, DRPolicyType } from './utils/types';

export const ModalContextViewer: React.FC<ModalContextViewerProps> = ({
  applicaitonInfo,
  state,
  matchingPolicies,
  dispatch,
  loaded,
  loadError,
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
      {state.modalViewContext === ModalViewContext.MANAGE_POLICY_VIEW && (
        <ManagePolicyView
          drInfo={applicaitonInfo?.drInfo as DRInfoType}
          workloadNamespace={applicaitonInfo?.workloadNamespace}
          eligiblePolicies={matchingPolicies}
          isSubscriptionAppType={
            applicaitonInfo?.type === APPLICATION_TYPE.SUBSCRIPTION
          }
          unProtectedPlacementCount={applicaitonInfo?.placements?.length}
          state={state.managePolicyView}
          dispatch={dispatch}
          setModalContext={setModalContext}
          setModalActionContext={setModalActionContext}
          setMessage={setMessage}
          loaded={loaded}
          loadError={loadError}
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

  return (
    <Modal
      title={
        state.modalViewContext === ModalViewContext.ASSIGN_POLICY_VIEW
          ? t('Enroll managed application')
          : t('Manage disaster recovery')
      }
      description={
        loaded &&
        !loadError && (
          <Trans t={t}>
            <strong>Application:</strong> {getName(applicaitonInfo)} (Namespace:{' '}
            {getNamespace(applicaitonInfo)})
          </Trans>
        )
      }
      variant={ModalVariant.large}
      isOpen={isOpen}
      aria-label="Manage policy modal"
      aria-describedby="manage-policy-modal"
      onClose={close}
    >
      <ModalContextViewer
        applicaitonInfo={applicaitonInfo}
        matchingPolicies={matchingPolicies}
        state={state}
        dispatch={dispatch}
        loaded={loaded}
        loadError={loadError}
      />
    </Modal>
  );
};

type AppManagePoliciesModalProps = {
  applicaitonInfo: ApplicationType;
  matchingPolicies: DRPolicyType[];
  loaded: boolean;
  loadError: any;
  isOpen: boolean;
  close?: () => void;
};

type ModalContextViewerProps = {
  state: ManagePolicyState;
  applicaitonInfo: ApplicationType;
  matchingPolicies: DRPolicyType[];
  dispatch: React.Dispatch<ManagePolicyStateAction>;
  loaded: boolean;
  loadError: any;
};
