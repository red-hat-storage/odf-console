import * as React from 'react';
import {
  APPLICATION_TYPE,
  AssignPolicySteps,
  AssignPolicyStepsNames,
} from '@odf/mco/constants';
import { requirementFromString } from '@odf/shared/modals';
import { getLabelValidationMessage } from '@odf/shared/modals/EditLabelModal';
import { getName } from '@odf/shared/selectors';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  WizardContextType,
  WizardContext,
  WizardFooter,
} from '@patternfly/react-core/deprecated';
import { TFunction } from 'i18next';
import {
  Button,
  Alert,
  AlertVariant,
  AlertProps,
} from '@patternfly/react-core';
import {
  AssignPolicyViewState,
  ModalActionContext,
  PVCSelectorType,
} from '../utils/reducer';
import { DRPolicyType } from '../utils/types';
import '../../../../style.scss';
import '../style.scss';

export const isValidLabelInput = (
  labels: string[],
  // Flag to Skip labels length validation
  defaultValue: boolean
): boolean =>
  labels?.length
    ? labels.every((label) => {
        const requirement = requirementFromString(label);
        // "key" or "key=value" is supported
        return (
          !!requirement && ['Equals', 'Exists'].includes(requirement?.operator)
        );
      })
    : defaultValue;

const isPVCSelectorFound = (pvcSelectors: PVCSelectorType[]) =>
  !!pvcSelectors.length &&
  !!pvcSelectors.every(
    (pvcSelector) =>
      !!pvcSelector.placementName &&
      isValidLabelInput(pvcSelector.labels, false)
  );

const isDRPolicySelected = (dataPolicy: DRPolicyType) => !!getName(dataPolicy);

const canJumpToNextStep = (
  stepName: string,
  state: AssignPolicyViewState,
  t: TFunction
) => {
  switch (stepName) {
    case AssignPolicyStepsNames(t)[AssignPolicySteps.Policy]:
      return isDRPolicySelected(state.policy);
    case AssignPolicyStepsNames(t)[AssignPolicySteps.PersistentVolumeClaim]:
      return isPVCSelectorFound(state.persistentVolumeClaim.pvcSelectors);
    default:
      return false;
  }
};

const getErrorMessage = (
  state: AssignPolicyViewState,
  stepName: string,
  errorMessage: string,
  t: TFunction
): AlertProps => {
  const defualtMessage = {
    title: t(
      '1 or more mandatory fields are empty. To proceed, fill in the required information.'
    ),
    variant: AlertVariant.danger,
  };
  switch (stepName) {
    case AssignPolicyStepsNames(t)[AssignPolicySteps.ReviewAndAssign]:
      return {
        title: errorMessage,
        variant: AlertVariant.danger,
      };
    case AssignPolicyStepsNames(t)[AssignPolicySteps.PersistentVolumeClaim]: {
      const isValidPVCSelector = state.persistentVolumeClaim.pvcSelectors.every(
        (pvcSelector) => isValidLabelInput(pvcSelector.labels, true)
      );
      return !isValidPVCSelector
        ? {
            title: t('Invalid label selector'),
            children: t(
              "The selected PVC label selector doesn't meet the label requirements. Choose a valid label selector or create one with the following requirements: {{ message }}",
              { message: getLabelValidationMessage(t) }
            ),
            variant: AlertVariant.danger,
          }
        : defualtMessage;
    }
    default:
      return defualtMessage;
  }
};

export const AssignPolicyViewFooter: React.FC<AssignPolicyViewFooterProps> = ({
  state,
  stepIdReached,
  isValidationEnabled,
  errorMessage,
  modalActionContext,
  setStepIdReached,
  onSubmit,
  onCancel,
  setIsValidationEnabled,
}) => {
  const { t } = useCustomTranslation();
  const [requestInProgress, setRequestInProgress] = React.useState(false);
  const { activeStep, onNext, onBack } =
    React.useContext<WizardContextType>(WizardContext);

  const stepId = activeStep.id as number;
  const stepName = activeStep.name as string;

  const canJumpToNext = canJumpToNextStep(stepName, state, t);
  const validationError = isValidationEnabled && !canJumpToNext;
  const message =
    (validationError || !!errorMessage) &&
    getErrorMessage(state, stepName, errorMessage, t);

  const moveToNextStep = () => {
    if (canJumpToNext) {
      setStepIdReached(stepIdReached <= stepId ? stepId + 1 : stepIdReached);
      onNext();
      setIsValidationEnabled(false);
    } else {
      setIsValidationEnabled(true);
    }
  };

  const handleNext = async () => {
    switch (stepName) {
      case AssignPolicyStepsNames(t)[AssignPolicySteps.ReviewAndAssign]:
        setRequestInProgress(true);
        await onSubmit();
        setRequestInProgress(false);
        break;
      default:
        moveToNextStep();
    }
  };

  return (
    <>
      {!!message && (
        <Alert
          title={message.title}
          variant={message.variant}
          isInline
          className="odf-alert mco-manage-policies__alert--margin-left"
        >
          {message?.children}
        </Alert>
      )}
      <WizardFooter>
        <Button
          isLoading={requestInProgress}
          isDisabled={requestInProgress || validationError}
          variant="primary"
          type="submit"
          onClick={handleNext}
        >
          {stepName ===
          AssignPolicyStepsNames(t)[AssignPolicySteps.ReviewAndAssign]
            ? t('Assign')
            : t('Next')}
        </Button>
        {/* Disabling the back button for the first step (Policy) in wizard */}
        <Button
          variant="secondary"
          onClick={onBack}
          isDisabled={
            stepName === AssignPolicyStepsNames(t)[AssignPolicySteps.Policy] ||
            requestInProgress ||
            (stepName ===
              AssignPolicyStepsNames(t)[
                AssignPolicySteps.PersistentVolumeClaim
              ] &&
              modalActionContext === ModalActionContext.EDIT_DR_PROTECTION)
          }
        >
          {t('Back')}
        </Button>
        <Button
          variant="link"
          onClick={onCancel}
          isDisabled={requestInProgress}
        >
          {t('Cancel')}
        </Button>
      </WizardFooter>
    </>
  );
};

type AssignPolicyViewFooterProps = {
  state: AssignPolicyViewState;
  appType: APPLICATION_TYPE;
  stepIdReached: number;
  isValidationEnabled: boolean;
  errorMessage: string;
  modalActionContext: ModalActionContext;
  setStepIdReached: React.Dispatch<React.SetStateAction<number>>;
  onSubmit: () => Promise<void>;
  onCancel: () => void;
  setIsValidationEnabled: React.Dispatch<React.SetStateAction<boolean>>;
};
