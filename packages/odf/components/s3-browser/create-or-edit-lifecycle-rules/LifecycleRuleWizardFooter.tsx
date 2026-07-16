import * as React from 'react';
import { GetBucketLifecycleConfigurationCommandOutput } from '@aws-sdk/client-s3';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { useNavigate } from 'react-router-dom-v5-compat';
import {
  useWizardContext,
  WizardFooterWrapper,
  Button,
  Alert,
  AlertActionCloseButton,
} from '@patternfly/react-core';
import { LifecycleRuleStep } from './lifecycleRuleSteps';
import { RuleState, RuleActionType, RuleAction } from './reducer';
import {
  isInvalidName,
  areInvalidFilters,
  areInvalidObjectTags,
  isInvalidObjectSize,
  isInvalidActionsCount,
  areInvalidActions,
} from './validations';
import './create-lifecycle-rules.scss';

type LifecycleRuleWizardFooterProps = {
  state: RuleState;
  dispatch: React.Dispatch<RuleAction>;
  existingRules: GetBucketLifecycleConfigurationCommandOutput;
  isEdit?: boolean;
  editingRuleName?: string;
  onSave: () => Promise<void>;
};

const canProceedFromStep = (
  stepId: string,
  state: RuleState,
  existingRules: GetBucketLifecycleConfigurationCommandOutput,
  isEdit: boolean,
  editingRuleName: string
): boolean => {
  switch (stepId) {
    case LifecycleRuleStep.GENERAL:
      return !isInvalidName(state, existingRules, isEdit, editingRuleName)[0];
    case LifecycleRuleStep.FILTERS:
      return (
        !areInvalidFilters(state) &&
        !areInvalidObjectTags(state) &&
        !isInvalidObjectSize(state)[0]
      );
    case LifecycleRuleStep.ACTIONS:
      return !isInvalidActionsCount(state)[0] && !areInvalidActions(state);
    case LifecycleRuleStep.REVIEW:
      return true;
    default:
      return false;
  }
};

export const LifecycleRuleWizardFooter: React.FC<
  LifecycleRuleWizardFooterProps
> = ({ state, dispatch, existingRules, isEdit, editingRuleName, onSave }) => {
  const { t } = useCustomTranslation();
  const navigate = useNavigate();
  const { activeStep, goToNextStep, goToPrevStep } = useWizardContext();

  const [requestInProgress, setRequestInProgress] = React.useState(false);
  const [requestError, setRequestError] = React.useState('');
  const [showErrorAlert, setShowErrorAlert] = React.useState(false);

  const stepId = activeStep.id as string;
  const isFirstStep = stepId === LifecycleRuleStep.GENERAL;
  const isLastStep = stepId === LifecycleRuleStep.REVIEW;

  const canProceed = canProceedFromStep(
    stepId,
    state,
    existingRules,
    isEdit,
    editingRuleName
  );

  const handleError = (errorMessage: string, showError: boolean) => {
    setRequestError(errorMessage);
    setShowErrorAlert(showError);
  };

  const handleNext = async () => {
    // Trigger validations for the current step
    dispatch({
      type: RuleActionType.TRIGGER_INLINE_VALIDATIONS,
      payload: true,
    });

    if (!canProceed) {
      return;
    }

    if (isLastStep) {
      setRequestInProgress(true);
      try {
        await onSave();
      } catch (err) {
        handleError(err.message || JSON.stringify(err), true);
      } finally {
        setRequestInProgress(false);
      }
    } else {
      // Reset validation trigger when moving to next step
      dispatch({
        type: RuleActionType.TRIGGER_INLINE_VALIDATIONS,
        payload: false,
      });
      goToNextStep();
    }
  };

  const handleBack = () => {
    // Reset validation trigger when going back
    dispatch({
      type: RuleActionType.TRIGGER_INLINE_VALIDATIONS,
      payload: false,
    });
    goToPrevStep();
  };

  return (
    <>
      {showErrorAlert && (
        <Alert
          className="pf-v6-u-mb-md"
          variant="danger"
          isInline
          actionClose={
            <AlertActionCloseButton onClose={() => handleError('', false)} />
          }
          title={t('An error has occurred')}
        >
          {requestError}
        </Alert>
      )}
      <WizardFooterWrapper>
        <Button
          isLoading={requestInProgress || null}
          isDisabled={!canProceed || requestInProgress}
          variant="primary"
          onClick={handleNext}
          className="pf-v6-u-mr-sm"
        >
          {isLastStep ? (isEdit ? t('Save') : t('Create')) : t('Next')}
        </Button>
        <Button
          variant="secondary"
          onClick={handleBack}
          isDisabled={isFirstStep || requestInProgress}
          className="pf-v6-u-mr-sm"
        >
          {t('Back')}
        </Button>
        <Button
          variant="link"
          onClick={() => navigate(-1)}
          isDisabled={requestInProgress}
        >
          {t('Cancel')}
        </Button>
      </WizardFooterWrapper>
    </>
  );
};
