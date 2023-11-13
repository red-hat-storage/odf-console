import * as React from 'react';
import {
  APPLICATION_TYPE,
  AssignPolicySteps,
  AssignPolicyStepsNames,
} from '@odf/mco/constants';
import { getName } from '@odf/shared/selectors';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { TFunction } from 'i18next';
import {
  Button,
  WizardContextType,
  WizardContext,
  WizardFooter,
  Alert,
  AlertVariant,
} from '@patternfly/react-core';
import { AssignPolicyViewState, PVCSelectorType } from '../utils/reducer';
import { DRPolicyType } from '../utils/types';
import '../../../../style.scss';
import '../style.scss';

const isPVCSelectorFound = (pvcSelectors: PVCSelectorType[]) =>
  !!pvcSelectors.length &&
  !!pvcSelectors.every((pvcSelector) => !!pvcSelector?.labels?.length);

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

export const AssignPolicyViewFooter: React.FC<AssignPolicyViewFooterProps> = ({
  state,
  stepIdReached,
  isValidationEnabled,
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
      {validationError && (
        <Alert
          title={t(
            '1 or more mandatory fields are empty. To proceed, fill in the required information.'
          )}
          variant={AlertVariant.danger}
          isInline
          className="odf-alert mco-manage-policies__alert--margin-left"
        />
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
            requestInProgress
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
  setStepIdReached: React.Dispatch<React.SetStateAction<number>>;
  onSubmit: () => Promise<void>;
  onCancel: () => void;
  setIsValidationEnabled: React.Dispatch<React.SetStateAction<boolean>>;
};
