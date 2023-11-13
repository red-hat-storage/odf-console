import * as React from 'react';
import { AssignPolicySteps, AssignPolicyStepsNames } from '@odf/mco/constants';
import { isLabelOnlyOperator } from '@odf/shared/label-expression-selector';
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
import {
  AssignPolicyViewState,
  PVCSelectorType,
  DynamicObjectType,
  ObjectProtectionMethod,
} from '../utils/reducer';
import { DRPolicyType } from '../utils/types';
import '../../../../style.scss';
import '../style.scss';

const isPVCSelectorFound = (pvcSelectors: PVCSelectorType[]) =>
  !!pvcSelectors.length &&
  !!pvcSelectors.every((pvcSelector) => !!pvcSelector?.labels?.length);

const isDRPolicySelected = (dataPolicy: DRPolicyType) => !!getName(dataPolicy);

const isValidKubeObjectProtection = ({
  captureInterval,
  objectProtectionMethod,
  recipeInfo,
  appResourceSelector,
}: DynamicObjectType) =>
  !!captureInterval && objectProtectionMethod === ObjectProtectionMethod.Recipe
    ? !!recipeInfo
    : appResourceSelector.every((selector) =>
        isLabelOnlyOperator(selector.operator)
          ? !!selector.key
          : !!selector.key && !!selector.values.length
      );

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
    case AssignPolicyStepsNames(t)[AssignPolicySteps.PolicyRule]:
      return !!state.policyRule;
    case AssignPolicyStepsNames(t)[AssignPolicySteps.DynamicObjects]:
      return isValidKubeObjectProtection(state.dynamicObjects);
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
  const assignPolicyStepsNames = AssignPolicyStepsNames(t);

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
      case assignPolicyStepsNames[AssignPolicySteps.ReviewAndAssign]:
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
          assignPolicyStepsNames[AssignPolicySteps.ReviewAndAssign]
            ? t('Assign')
            : t('Next')}
        </Button>
        {/* Disabling the back button for the first step (Policy) in wizard */}
        <Button
          variant="secondary"
          onClick={onBack}
          isDisabled={stepId === 1 || requestInProgress}
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
  stepIdReached: number;
  isValidationEnabled: boolean;
  setStepIdReached: React.Dispatch<React.SetStateAction<number>>;
  onSubmit: () => Promise<void>;
  onCancel: () => void;
  setIsValidationEnabled: React.Dispatch<React.SetStateAction<boolean>>;
};
