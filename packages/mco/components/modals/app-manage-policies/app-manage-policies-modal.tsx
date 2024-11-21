import * as React from 'react';
import { DRApplication } from '@odf/mco/constants';
import { getName, getNamespace } from '@odf/shared/selectors';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { Trans } from 'react-i18next';
import { Modal, ModalVariant } from '@patternfly/react-core';
import { AssignPolicyView } from './assign-policy-view';
import { ManagePolicyView } from './manage-policy-view';
import {
  ManagePolicyStateAction,
  ManagePolicyStateType,
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
    (modalActionContext: ModalActionContext) =>
      dispatch({
        type: ManagePolicyStateType.SET_MODAL_ACTION_CONTEXT,
        payload: modalActionContext,
      }),
    [dispatch]
  );

  return (
    <>
      {state.modalViewContext === ModalViewContext.MANAGE_POLICY_VIEW && (
        <ManagePolicyView
          drInfo={applicaitonInfo?.drInfo as DRInfoType}
          workloadNamespace={applicaitonInfo?.workloadNamespace}
          eligiblePolicies={matchingPolicies}
          isSubscriptionAppType={
            applicaitonInfo?.type === DRApplication.SUBSCRIPTION
          }
          unProtectedPlacementCount={applicaitonInfo?.placements?.length}
          dispatch={dispatch}
          setModalContext={setModalContext}
          setModalActionContext={setModalActionContext}
          loaded={loaded}
          loadError={loadError}
          modalActionContext={state.modalActionContext}
        />
      )}
      {state.modalViewContext === ModalViewContext.ASSIGN_POLICY_VIEW && (
        <AssignPolicyView
          applicaitonInfo={applicaitonInfo}
          matchingPolicies={matchingPolicies}
          state={state.assignPolicyView}
          modalActionContext={state.modalActionContext}
          dispatch={dispatch}
          setModalContext={setModalContext}
          setModalActionContext={setModalActionContext}
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
