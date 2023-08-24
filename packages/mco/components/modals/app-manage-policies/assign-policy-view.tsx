import * as React from 'react';
import { createRefFromK8Resource } from '@odf/mco/utils';
import { ModalBody } from '@odf/shared/modals/Modal';
import { getName } from '@odf/shared/selectors';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { getErrorMessage } from '@odf/shared/utils';
import { TFunction } from 'i18next';
import { Wizard, WizardStep, AlertVariant } from '@patternfly/react-core';
import { PolicyConfigViewer } from './helper/policy-config-viewer';
import { PVCDetailsWizardContent } from './helper/pvc-details-wizard-content';
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
  DRPlacementControlType,
  DRPolicyType,
  DataPolicyType,
  PlacementType,
} from './utils/types';

export const createSteps = (
  workloadNamespace: string,
  unProtectedPlacements: PlacementType[],
  matchingPolicies: DRPolicyType[],
  state: AssignPolicyViewState,
  stepIdReached: number,
  isAssignDisabled: boolean,
  t: TFunction,
  setPolicy: (policy?: DataPolicyType) => void,
  setDRPlacementControls: (
    drPlacementControls: DRPlacementControlType[]
  ) => void
): WizardStep[] => [
  {
    id: 1,
    name: t('Policy'),
    component: (
      <SelectPolicyWizardContent
        matchingPolicies={matchingPolicies}
        policy={state.policy}
        setPolicy={setPolicy}
      />
    ),
    enableNext: !!getName(state.policy),
  },
  {
    id: 2,
    name: t('PersistentVolumeClaim'),
    component: (
      <PVCDetailsWizardContent
        placementControInfo={state.policy?.placementControlInfo}
        unProtectedPlacements={unProtectedPlacements}
        policyRef={createRefFromK8Resource(state.policy)}
        workloadNamespace={workloadNamespace}
        setDRPlacementControls={setDRPlacementControls}
      />
    ),
    canJumpTo: stepIdReached >= 2,
    enableNext: !!state.policy?.placementControlInfo?.length,
  },
  {
    id: 3,
    name: t('Review and assign'),
    component: <PolicyConfigViewer policy={state.policy} hideSelector={true} />,
    nextButtonText: t('Assign'),
    canJumpTo: stepIdReached >= 3,
    enableNext: !isAssignDisabled,
    hideBackButton: isAssignDisabled,
    hideCancelButton: isAssignDisabled,
  },
];

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
  const [isAssignDisabled, setAssignDisabled] = React.useState(false);

  const onNext = ({ id }: WizardStep) => {
    if (id) {
      if (typeof id === 'string') {
        id = parseInt(id, 10);
      }
      setStepIdReached(stepIdReached < id ? id : stepIdReached);
    }
  };

  const setPolicy = (policy: DataPolicyType = null) =>
    dispatch({
      type: ManagePolicyStateType.SET_SELECTED_POLICY,
      context: ModalViewContext.ASSIGN_POLICY_VIEW,
      payload: policy,
    });

  const setDRPlacementControls = (
    drPlacementControls: DRPlacementControlType[]
  ) =>
    dispatch({
      type: ManagePolicyStateType.SET_PLACEMENT_CONTROLS,
      context: ModalViewContext.ASSIGN_POLICY_VIEW,
      payload: drPlacementControls,
    });

  const assignPolicy = () => {
    setAssignDisabled(true);
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
      // reset policy info
      setPolicy();
    };
    // assign DRPolicy
    const promises = assignPromises(state.policy);
    Promise.all(promises)
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

  return (
    <ModalBody>
      <Wizard
        cancelButtonText={t('Cancel')}
        nextButtonText={t('Next')}
        backButtonText={t('Back')}
        navAriaLabel={t('Assign policy nav')}
        mainAriaLabel={t('Assign policy content')}
        onSave={assignPolicy}
        onClose={() => {
          setModalContext(ModalViewContext.POLICY_LIST_VIEW);
          // reset policy info
          setPolicy();
        }}
        steps={createSteps(
          applicaitonInfo.workloadNamespace,
          applicaitonInfo.placements,
          matchingPolicies,
          state,
          stepIdReached,
          isAssignDisabled,
          t,
          setPolicy,
          setDRPlacementControls
        )}
        onNext={onNext}
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
