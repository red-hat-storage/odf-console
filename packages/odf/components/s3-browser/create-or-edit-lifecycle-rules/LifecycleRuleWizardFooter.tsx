import * as React from 'react';
import { GetBucketLifecycleConfigurationCommandOutput } from '@aws-sdk/client-s3';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { useNavigate } from 'react-router';
import {
  useWizardContext,
  WizardFooterWrapper,
  Button,
  Alert,
  AlertActionCloseButton,
} from '@patternfly/react-core';
import { RuleState, LifecycleRuleStep } from './reducer';
import {
  isInvalidName,
  areInvalidFilters,
  areInvalidObjectTags,
  isInvalidObjectSize,
  isInvalidActionsCount,
  areInvalidActions,
  isInvalidLifecycleRule,
} from './validations';
import './create-lifecycle-rules.scss';

type LifecycleRuleWizardFooterProps = {
  state: RuleState;
  existingRules: GetBucketLifecycleConfigurationCommandOutput;
  isEdit?: boolean;
  editingRuleName?: string;
  isDeepArchiveEnabled?: boolean;
  onSave: () => Promise<void>;
};

const canProceedFromStep = (
  stepId: string,
  state: RuleState,
  existingRules: GetBucketLifecycleConfigurationCommandOutput,
  isEdit: boolean,
  editingRuleName: string,
  isDeepArchiveEnabled: boolean
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
      return (
        !isInvalidActionsCount(state, isDeepArchiveEnabled)[0] &&
        !areInvalidActions(state, isDeepArchiveEnabled)
      );
    case LifecycleRuleStep.REVIEW:
      return !isInvalidLifecycleRule(
        state,
        existingRules,
        isEdit,
        editingRuleName,
        isDeepArchiveEnabled
      );
    default:
      return false;
  }
};

export const LifecycleRuleWizardFooter: React.FC<
  LifecycleRuleWizardFooterProps
> = ({
  state,
  existingRules,
  isEdit,
  editingRuleName,
  isDeepArchiveEnabled,
  onSave,
}) => {
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
    editingRuleName,
    isDeepArchiveEnabled
  );

  const handleError = (errorMessage: string, showError: boolean) => {
    setRequestError(errorMessage);
    setShowErrorAlert(showError);
  };

  const handleNext = async () => {
    if (isLastStep) {
      setRequestInProgress(true);
      try {
        await onSave();
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : JSON.stringify(err);
        handleError(errorMessage, true);
      } finally {
        setRequestInProgress(false);
      }
    } else {
      goToNextStep();
    }
  };

  const handleBack = () => {
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
