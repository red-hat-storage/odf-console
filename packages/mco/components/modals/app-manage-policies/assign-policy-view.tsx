import * as React from 'react';
import {
  AssignPolicySteps,
  AssignPolicyStepsNames,
  DRApplication,
} from '@odf/mco/constants';
import { ModalBody } from '@odf/shared/modals';
import { getName } from '@odf/shared/selectors';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { getErrorMessage } from '@odf/shared/utils';
import { TFunction } from 'react-i18next';
import { Wizard, WizardStep, WizardStepProps } from '@patternfly/react-core';
import { AssignPolicyViewFooter } from './helper/assign-policy-view-footer';
import ProtectionTypeWizardContent from './helper/protection-type-wizard-content';
import { PVCDetailsWizardContent } from './helper/pvc-details-wizard-content';
import { ReplicationTypeWizardContent } from './helper/replication-wizard-content';
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
  DRPlacementControlType,
  DRPolicyType,
  ModalType,
  PlacementType,
  PVCQueryFilter,
  VMProtectionType,
} from './utils/types';

export const createSteps = ({
  appType,
  unProtectedPlacements,
  matchingPolicies,
  state,
  isValidationEnabled,
  t,
  dispatch,
  protectedPVCSelectors,
  pvcQueryFilter,
  modalType,
  isEditMode,
  sharedVMGroups,
}: CreateStepsParams): (Pick<WizardStepProps, 'id' | 'name'> & {
  component: React.ReactElement;
})[] => {
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
          isValidationEnabled={isValidationEnabled}
          dispatch={dispatch}
          protectedPVCSelectors={protectedPVCSelectors}
          pvcQueryFilter={pvcQueryFilter}
        />
      ),
    },
    reviewAndAssign: {
      name: AssignPolicyStepsNames(t)[AssignPolicySteps.ReviewAndAssign],
      component: (
        <ReviewAndAssign
          state={state}
          modalType={modalType}
          appType={appType}
        />
      ),
    },
  };

  const vmSteps = {
    protectionType: {
      name: AssignPolicyStepsNames(t)[AssignPolicySteps.ProtectionType],
      component: (
        <ProtectionTypeWizardContent
          protectionType={state.protectionType.protectionType}
          protectionName={state.protectionType.protectionName}
          appType={appType}
          matchingPolicies={matchingPolicies}
          sharedVMGroups={sharedVMGroups}
          dispatch={dispatch}
        />
      ),
    },
    replication: {
      name: AssignPolicyStepsNames(t)[AssignPolicySteps.Replication],
      component: (
        <ReplicationTypeWizardContent
          matchingPolicies={matchingPolicies}
          policy={state.replication.policy}
          k8sResourceSyncInterval={state.replication.k8sSyncInterval}
          isValidationEnabled={isValidationEnabled}
          dispatch={dispatch}
          isSharedVMProtection={
            state.protectionType.protectionType === VMProtectionType.SHARED
          }
        />
      ),
    },
  };

  switch (modalType) {
    case ModalType.Application:
      return isEditMode
        ? [
            {
              id: 1,
              ...commonSteps.persistentVolumeClaim,
            },
            {
              id: 2,
              ...commonSteps.reviewAndAssign,
            },
          ]
        : [
            {
              id: 1,
              ...commonSteps.policy,
            },
            {
              id: 2,
              ...commonSteps.persistentVolumeClaim,
            },
            {
              id: 3,
              ...commonSteps.reviewAndAssign,
            },
          ];
    case ModalType.VirtualMachine:
      return appType === DRApplication.DISCOVERED
        ? [
            {
              id: 1,
              ...vmSteps.protectionType,
            },
            {
              id: 2,
              ...vmSteps.replication,
            },
            {
              id: 3,
              ...commonSteps.reviewAndAssign,
            },
          ]
        : [
            {
              id: 1,
              ...vmSteps.protectionType,
            },
            {
              id: 2,
              ...commonSteps.policy,
            },
            {
              id: 3,
              ...commonSteps.persistentVolumeClaim,
            },
            {
              id: 4,
              ...commonSteps.reviewAndAssign,
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
  modalType,
  sharedVMGroups,
}) => {
  const { t } = useCustomTranslation();
  const isEditMode =
    modalActionContext === ModalActionContext.EDIT_DR_PROTECTION;
  const [isValidationEnabled, setIsValidationEnabled] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState('');

  const {
    type: appType,
    placements: unProtectedPlacements,
    drInfo,
    pvcQueryFilter,
    workloadNamespace,
    discoveredVMPVCs,
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
    try {
      // Assign DRPolicy
      await assignPromises(
        state,
        applicationInfo.placements,
        appType,
        workloadNamespace,
        getName(applicationInfo),
        t,
        discoveredVMPVCs
      );

      // Success actions
      setModalActionContext(ModalActionContext.ENABLE_DR_PROTECTION_SUCCEEDED);
      setModalContext(ModalViewContext.MANAGE_POLICY_VIEW);
      resetAssignState();
    } catch (error) {
      // Centralized error handling
      setErrorMessage(getErrorMessage(error) || error);
    }
  };

  const onClose = () => {
    setModalContext(ModalViewContext.MANAGE_POLICY_VIEW);
    // reset info
    resetAssignState();
  };

  const steps = createSteps({
    appType,
    unProtectedPlacements,
    matchingPolicies,
    state,
    isValidationEnabled,
    t,
    dispatch,
    protectedPVCSelectors,
    pvcQueryFilter,
    modalType,
    isEditMode,
    sharedVMGroups,
  });

  return (
    <ModalBody>
      <Wizard
        navAriaLabel={t('Assign policy nav')}
        isVisitRequired
        footer={
          <AssignPolicyViewFooter
            state={state}
            appType={appType}
            isValidationEnabled={isValidationEnabled}
            errorMessage={errorMessage}
            onSubmit={onSubmit}
            onCancel={onClose}
            setIsValidationEnabled={setIsValidationEnabled}
          />
        }
        height={450}
      >
        {steps.map((step) => (
          <WizardStep key={step.id} id={step.id} name={step.name}>
            {step.component}
          </WizardStep>
        ))}
      </Wizard>
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
  modalType: ModalType;
  sharedVMGroups?: DRPlacementControlType[];
};

type CreateStepsParams = {
  appType: DRApplication;
  unProtectedPlacements: PlacementType[];
  matchingPolicies: DRPolicyType[];
  state: AssignPolicyViewState;
  isValidationEnabled: boolean;
  t: TFunction;
  dispatch: React.Dispatch<ManagePolicyStateAction>;
  protectedPVCSelectors: PVCSelectorType[];
  pvcQueryFilter: PVCQueryFilter;
  modalType: ModalType;
  isEditMode?: boolean;
  sharedVMGroups?: DRPlacementControlType[];
};
