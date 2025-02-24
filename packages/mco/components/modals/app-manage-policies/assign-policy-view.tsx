import * as React from 'react';
import {
  DRApplication,
  AssignPolicySteps,
  AssignPolicyStepsNames,
} from '@odf/mco/constants';
import { ModalBody } from '@odf/shared/modals';
import { getName } from '@odf/shared/selectors';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { getErrorMessage } from '@odf/shared/utils';
import { Wizard, WizardStep } from '@patternfly/react-core/deprecated';
import { TFunction } from 'i18next';
import { AssignPolicyViewFooter } from './helper/assign-policy-view-footer';
import { PVCDetailsWizardContent } from './helper/pvc-details-wizard-content';
import { ReviewAndAssign } from './helper/review-and-assign';
import { SelectPolicyWizardContent } from './helper/select-policy-wizard-content';
import { assignPromises } from './utils/k8s-utils';
import {
  AssignPolicyViewState,
  ManagePolicyStateAction,
  ManagePolicyStateType,
  ModalActionContext,
  ModalViewContext,
  PVCSelectorType,
} from './utils/reducer';
import {
  ApplicationType,
  DRInfoType,
  DRPolicyType,
  PlacementType,
} from './utils/types';

export const createSteps = (
  appType: DRApplication,
  workloadNamespace: string,
  unProtectedPlacements: PlacementType[],
  matchingPolicies: DRPolicyType[],
  state: AssignPolicyViewState,
  stepIdReached: number,
  isValidationEnabled: boolean,
  t: TFunction,
  dispatch: React.Dispatch<ManagePolicyStateAction>,
  protectedPVCSelectors: PVCSelectorType[],
  isEditMode?: boolean
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
          protectedPVCSelectors={protectedPVCSelectors}
        />
      ),
    },
    reviewAndAssign: {
      name: AssignPolicyStepsNames(t)[AssignPolicySteps.ReviewAndAssign],
      component: <ReviewAndAssign state={state} />,
    },
  };

  switch (appType) {
    case DRApplication.APPSET:
    case DRApplication.SUBSCRIPTION:
      return isEditMode
        ? [
            {
              id: 1,
              ...commonSteps.persistentVolumeClaim,
              canJumpTo: stepIdReached >= 1,
            },
            {
              id: 2,
              ...commonSteps.reviewAndAssign,
              canJumpTo: stepIdReached >= 2,
            },
          ]
        : [
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
  applicationInfo,
  matchingPolicies,
  modalActionContext,
  setModalContext,
  setModalActionContext,
  dispatch,
}) => {
  const { t } = useCustomTranslation();
  const isEditMode =
    modalActionContext === ModalActionContext.EDIT_DR_PROTECTION;
  const [stepIdReached, setStepIdReached] = React.useState(1);
  const [isValidationEnabled, setIsValidationEnabled] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState('');

  const {
    type: appType,
    workloadNamespace,
    placements: unProtectedPlacements,
    drInfo,
  } = applicationInfo;

  const protectedPVCSelectors: PVCSelectorType[] = isEditMode
    ? (drInfo as DRInfoType)?.placementControlInfo?.map((drpc) => ({
        placementName: getName(drpc.placementInfo),
        labels: drpc.pvcSelector,
      }))
    : [];

  const resetAssignState = () =>
    dispatch({
      type: ManagePolicyStateType.RESET_ASSIGN_POLICY_STATE,
      context: ModalViewContext.ASSIGN_POLICY_VIEW,
    });

  const onSubmit = async () => {
    // assign DRPolicy
    const promises = assignPromises(state, applicationInfo.placements);
    await Promise.all(promises)
      .then(() => {
        setModalActionContext(
          ModalActionContext.ENABLE_DR_PROTECTION_SUCCEEDED
        );
        // Switch to manage policy view
        setModalContext(ModalViewContext.MANAGE_POLICY_VIEW);
        // Reset info
        resetAssignState();
      })
      .catch((error) => {
        setErrorMessage(getErrorMessage(error) || error);
      });
  };

  const onClose = () => {
    setModalContext(ModalViewContext.MANAGE_POLICY_VIEW);
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
          unProtectedPlacements,
          matchingPolicies,
          state,
          stepIdReached,
          isValidationEnabled,
          t,
          dispatch,
          protectedPVCSelectors,
          isEditMode
        )}
        footer={
          <AssignPolicyViewFooter
            state={state}
            appType={appType}
            stepIdReached={stepIdReached}
            isValidationEnabled={isValidationEnabled}
            errorMessage={errorMessage}
            modalActionContext={modalActionContext}
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
  applicationInfo: ApplicationType;
  matchingPolicies: DRPolicyType[];
  modalActionContext: ModalActionContext;
  dispatch: React.Dispatch<ManagePolicyStateAction>;
  setModalContext: (modalViewContext: ModalViewContext) => void;
  setModalActionContext: (
    modalActionContext: ModalActionContext,
    modalViewContext?: ModalViewContext
  ) => void;
};
