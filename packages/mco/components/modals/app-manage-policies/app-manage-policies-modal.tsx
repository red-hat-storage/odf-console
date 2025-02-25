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
  applicationInfo,
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
          drInfo={applicationInfo?.drInfo as DRInfoType}
          workloadNamespace={applicationInfo?.workloadNamespace}
          eligiblePolicies={matchingPolicies}
          isSubscriptionAppType={
            applicationInfo?.type === DRApplication.SUBSCRIPTION
          }
          unProtectedPlacementCount={applicationInfo?.placements?.length}
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
          applicationInfo={applicationInfo}
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
  applicationInfo,
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
            <strong>Application:</strong> {getName(applicationInfo)} (Namespace:{' '}
            {getNamespace(applicationInfo)})
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
        applicationInfo={applicationInfo}
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
  applicationInfo: ApplicationType;
  matchingPolicies: DRPolicyType[];
  loaded: boolean;
  loadError: any;
  isOpen: boolean;
  close?: () => void;
};

type ModalContextViewerProps = {
  state: ManagePolicyState;
  applicationInfo: ApplicationType;
  matchingPolicies: DRPolicyType[];
  dispatch: React.Dispatch<ManagePolicyStateAction>;
  loaded: boolean;
  loadError: any;
};
