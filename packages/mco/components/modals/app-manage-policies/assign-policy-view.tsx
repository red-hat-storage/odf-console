import * as React from 'react';
import {
  APPLICATION_TYPE,
  AssignPolicySteps,
  AssignPolicyStepsNames,
} from '@odf/mco/constants';
import { ModalBody } from '@odf/shared/modals';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { getErrorMessage } from '@odf/shared/utils';
import { Wizard, WizardStep } from '@patternfly/react-core/deprecated';
import { TFunction } from 'i18next';
import { AlertVariant } from '@patternfly/react-core';
import { AssignPolicyViewFooter } from './helper/assign-policy-view-footer';
import { PVCDetailsWizardContent } from './helper/pvc-details-wizard-content';
import { ReviewAndAssign } from './helper/review-and-assign';
import { SelectPolicyWizardContent } from './helper/select-policy-wizard-content';
import { assignPromises } from './utils/k8s-utils';
import {
  AssignPolicyViewState,
  ManagePolicyStateAction,
  ManagePolicyStateType,
  MessageType,
  ModalActionContext,
  ModalViewContext,
} from './utils/reducer';
import {
  ApplicationType,
  DRPolicyType,
  DataPolicyType,
  PlacementType,
} from './utils/types';

export const createSteps = (
  appType: APPLICATION_TYPE,
  workloadNamespace: string,
  unProtectedPlacements: PlacementType[],
  matchingPolicies: DRPolicyType[],
  state: AssignPolicyViewState,
  stepIdReached: number,
  isValidationEnabled: boolean,
  t: TFunction,
  dispatch: React.Dispatch<ManagePolicyStateAction>
): WizardStep[] => {
  const commonSteps = {
    policy: {
      name: AssignPolicyStepsNames(t)[AssignPolicySteps.Policy],
      component: (
        <SelectPolicyWizardContent
          matchingPolicies={matchingPolicies}
          policy={state.policy}
          isValidationEnabled={isValidationEnabled}
          dispatch={dispatch}
        />
      ),
    },
    persistentVolumeClaim: {
      name: AssignPolicyStepsNames(t)[AssignPolicySteps.PersistentVolumeClaim],
      component: (
        <PVCDetailsWizardContent
          pvcSelectors={state.persistentVolumeClaim.pvcSelectors}
          unProtectedPlacements={unProtectedPlacements}
          workloadNamespace={workloadNamespace}
          isValidationEnabled={isValidationEnabled}
          dispatch={dispatch}
        />
      ),
    },
    reviewAndAssign: {
      name: AssignPolicyStepsNames(t)[AssignPolicySteps.ReviewAndAssign],
      component: <ReviewAndAssign state={state} />,
    },
  };

  switch (appType) {
    case APPLICATION_TYPE.APPSET:
    case APPLICATION_TYPE.SUBSCRIPTION:
      return [
        {
          id: 1,
          ...commonSteps.policy,
          canJumpTo: stepIdReached >= 1,
        },
        {
          id: 2,
          ...commonSteps.persistentVolumeClaim,
          canJumpTo: stepIdReached >= 2,
        },
        {
          id: 3,
          ...commonSteps.reviewAndAssign,
          canJumpTo: stepIdReached >= 3,
        },
      ];
    default:
      return [];
  }
};

export const AssignPolicyView: React.FC<AssignPolicyViewProps> = ({
  state,
  applicaitonInfo,
  matchingPolicies,
  setModalContext,
  setModalActionContext,
  setMessage,
  dispatch,
}) => {
  const { t } = useCustomTranslation();
  const [stepIdReached, setStepIdReached] = React.useState(1);
  const [isValidationEnabled, setIsValidationEnabled] = React.useState(false);

  const { type: appType, workloadNamespace, placements } = applicaitonInfo;

  const resetAssignState = () =>
    dispatch({
      type: ManagePolicyStateType.RESET_ASSIGN_POLICY_STATE,
      context: ModalViewContext.ASSIGN_POLICY_VIEW,
    });

  const onSubmit = async () => {
    const updateContext = (
      title: string,
      description: string,
      variant: AlertVariant,
      actionContext: ModalActionContext
    ) => {
      // inject a message into list view
      setMessage(
        {
          title,
          description,
          variant,
        },
        ModalViewContext.POLICY_LIST_VIEW
      );
      setModalActionContext(actionContext, ModalViewContext.POLICY_LIST_VIEW);
      // switch to list policy view
      setModalContext(ModalViewContext.POLICY_LIST_VIEW);
      // reset info
      resetAssignState();
    };
    // assign DRPolicy
    const promises = assignPromises(state, applicaitonInfo.placements);
    await Promise.all(promises)
      .then(() => {
        updateContext(
          t('New policy assigned to application.'),
          '',
          AlertVariant.success,
          ModalActionContext.ASSIGN_POLICY_SUCCEEDED
        );
      })
      .catch((error) => {
        updateContext(
          t('Unable to assign policy to application.'),
          getErrorMessage(error),
          AlertVariant.danger,
          ModalActionContext.ASSIGN_POLICY_FAILED
        );
      });
  };

  const onClose = () => {
    setModalContext(ModalViewContext.POLICY_LIST_VIEW);
    // reset info
    resetAssignState();
  };

  return (
    <ModalBody>
      <Wizard
        navAriaLabel={t('Assign policy nav')}
        mainAriaLabel={t('Assign policy content')}
        steps={createSteps(
          appType,
          workloadNamespace,
          placements,
          matchingPolicies,
          state,
          stepIdReached,
          isValidationEnabled,
          t,
          dispatch
        )}
        footer={
          <AssignPolicyViewFooter
            state={state}
            appType={appType}
            stepIdReached={stepIdReached}
            isValidationEnabled={isValidationEnabled}
            setStepIdReached={setStepIdReached}
            onSubmit={onSubmit}
            onCancel={onClose}
            setIsValidationEnabled={setIsValidationEnabled}
          />
        }
        height={450}
      />
    </ModalBody>
  );
};

type AssignPolicyViewProps = {
  state: AssignPolicyViewState;
  applicaitonInfo: ApplicationType;
  matchingPolicies: DataPolicyType[];
  dispatch: React.Dispatch<ManagePolicyStateAction>;
  setModalContext: (modalViewContext: ModalViewContext) => void;
  setModalActionContext: (
    modalActionContext: ModalActionContext,
    modalViewContext?: ModalViewContext
  ) => void;
  setMessage: (error: MessageType, modalViewContext?: ModalViewContext) => void;
};
