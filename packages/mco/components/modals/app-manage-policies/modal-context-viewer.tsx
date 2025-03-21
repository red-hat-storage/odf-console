import * as React from 'react';
import { AssignPolicyView } from './assign-policy-view';
import { ManagePolicyView } from './manage-policy-view';
import {
  initialPolicyState,
  managePolicyStateReducer,
  ManagePolicyStateType,
  ModalActionContext,
  ModalViewContext,
} from './utils/reducer';
import {
  ApplicationInfoType,
  ApplicationType,
  DRInfoType,
  DRPolicyType,
  ModalType,
} from './utils/types';

export const ModalContextViewer: React.FC<ModalContextViewerProps> = ({
  applicationInfo,
  matchingPolicies,
  loaded,
  loadError,
  setCurrentModalContext,
  modalType,
}) => {
  const [state, dispatch] = React.useReducer(
    managePolicyStateReducer,
    initialPolicyState
  );

  const setModalContext = React.useCallback(
    (modalViewContext: ModalViewContext) => {
      dispatch({
        type: ManagePolicyStateType.SET_MODAL_VIEW_CONTEXT,
        payload: modalViewContext,
      });
      setCurrentModalContext(modalViewContext);
    },
    [setCurrentModalContext]
  );

  const setModalActionContext = React.useCallback(
    (modalActionContext: ModalActionContext) =>
      dispatch({
        type: ManagePolicyStateType.SET_MODAL_ACTION_CONTEXT,
        payload: modalActionContext,
      }),
    []
  );

  const application = applicationInfo as ApplicationType;

  const renderView = () => {
    if (state.modalViewContext === ModalViewContext.MANAGE_POLICY_VIEW) {
      return (
        <ManagePolicyView
          drInfo={application?.drInfo as DRInfoType}
          workloadNamespace={application?.workloadNamespace}
          eligiblePolicies={matchingPolicies}
          appType={application?.type}
          unprotectedPlacementCount={application?.placements?.length}
          dispatch={dispatch}
          setModalContext={setModalContext}
          setModalActionContext={setModalActionContext}
          loaded={loaded}
          loadError={loadError}
          modalActionContext={state.modalActionContext}
          modalType={modalType}
        />
      );
    }
    if (state.modalViewContext === ModalViewContext.ASSIGN_POLICY_VIEW) {
      return (
        <AssignPolicyView
          applicationInfo={application}
          matchingPolicies={matchingPolicies}
          state={state.assignPolicyView}
          modalActionContext={state.modalActionContext}
          dispatch={dispatch}
          setModalContext={setModalContext}
          setModalActionContext={setModalActionContext}
          modalType={modalType}
        />
      );
    }
    return null;
  };

  return <>{renderView()}</>;
};

type ModalContextViewerProps = {
  applicationInfo: ApplicationInfoType;
  matchingPolicies: DRPolicyType[];
  loaded: boolean;
  loadError: any;
  setCurrentModalContext: React.Dispatch<
    React.SetStateAction<ModalViewContext>
  >;
  modalType: ModalType;
};
