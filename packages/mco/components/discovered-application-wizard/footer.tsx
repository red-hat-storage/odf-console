import * as React from 'react';
import {
  EnrollDiscoveredApplicationStepNames,
  EnrollDiscoveredApplicationSteps,
} from '@odf/mco/constants';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { TFunction } from 'i18next';
import {
  Button,
  ButtonVariant,
  ButtonType,
  WizardContextType,
  WizardContext,
  WizardFooter,
  Alert,
  AlertVariant,
} from '@patternfly/react-core';
import { EnrollDiscoveredApplicationState } from './utils/reducer';

const validateNamespaceStep = (state: EnrollDiscoveredApplicationState) =>
  !!state.namespace.clusterName && !!state.namespace.namespaces.length;

const canJumpToNextStep = (
  state: EnrollDiscoveredApplicationState,
  stepName: string,
  t: TFunction
) => {
  switch (stepName) {
    case EnrollDiscoveredApplicationStepNames(t)[
      EnrollDiscoveredApplicationSteps.Namespace
    ]:
      return validateNamespaceStep(state);
    case EnrollDiscoveredApplicationStepNames(t)[
      EnrollDiscoveredApplicationSteps.Configure
    ]:
      return true;
    case EnrollDiscoveredApplicationStepNames(t)[
      EnrollDiscoveredApplicationSteps.Replication
    ]:
      return true;
    default:
      return false;
  }
};

export const EnrollDiscoveredApplicationFooter: React.FC<EnrollDiscoveredApplicationFooterProps> =
  ({
    state,
    stepIdReached,
    isValidationEnabled,
    setStepIdReached,
    setIsValidationEnabled,
    onSubmit,
    onCancel,
  }) => {
    const { t } = useCustomTranslation();
    const [requestInProgress, setRequestInProgress] = React.useState(false);
    const { activeStep, onNext, onBack } =
      React.useContext<WizardContextType>(WizardContext);

    const stepId = activeStep.id as number;
    const stepName = activeStep.name as string;

    const canJumpToNext = canJumpToNextStep(state, stepName, t);
    const validationError = isValidationEnabled && !canJumpToNext;
    const enrollDiscoveredApplicationStepNames =
      EnrollDiscoveredApplicationStepNames(t);

    const moveToNextStep = () => {
      if (canJumpToNext) {
        setStepIdReached(stepIdReached <= stepId ? stepId + 1 : stepIdReached);
        setIsValidationEnabled(false);
        onNext();
      } else {
        setIsValidationEnabled(true);
      }
    };

    const handleNext = async () => {
      switch (stepName) {
        case enrollDiscoveredApplicationStepNames[
          EnrollDiscoveredApplicationSteps.Review
        ]:
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
          />
        )}
        <WizardFooter>
          <Button
            isLoading={requestInProgress}
            isDisabled={requestInProgress}
            variant={ButtonVariant.primary}
            type={ButtonType.submit}
            onClick={handleNext}
          >
            {stepName ===
            enrollDiscoveredApplicationStepNames[
              EnrollDiscoveredApplicationSteps.Review
            ]
              ? t('Assign')
              : t('Next')}
          </Button>
          {/* Disabling the back button for the first step in wizard */}
          <Button
            variant={ButtonVariant.secondary}
            onClick={onBack}
            isDisabled={stepId === 1 || requestInProgress}
          >
            {t('Back')}
          </Button>
          <Button
            variant={ButtonVariant.link}
            onClick={onCancel}
            isDisabled={requestInProgress}
          >
            {t('Cancel')}
          </Button>
        </WizardFooter>
      </>
    );
  };

type EnrollDiscoveredApplicationFooterProps = {
  state: EnrollDiscoveredApplicationState;
  stepIdReached: number;
  isValidationEnabled: boolean;
  setStepIdReached: React.Dispatch<React.SetStateAction<number>>;
  setIsValidationEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  onSubmit: () => Promise<void>;
  onCancel: () => void;
};
