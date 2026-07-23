import * as React from 'react';
import { CreateDRPolicyWizardSteps } from '@odf/mco/constants';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  Alert,
  AlertVariant,
  Button,
  ButtonVariant,
  useWizardContext,
  WizardFooterWrapper,
} from '@patternfly/react-core';

export const CreateDRPolicyWizardFooter: React.FC<
  CreateDRPolicyWizardFooterProps
> = ({ stepValidity, isLoading, errorMessage, onCreate, onCancel }) => {
  const { t } = useCustomTranslation();
  const { activeStep, goToNextStep, goToPrevStep } = useWizardContext();

  const isClustersStep = activeStep.id === CreateDRPolicyWizardSteps.Clusters;
  const isReviewStep = activeStep.id === CreateDRPolicyWizardSteps.Review;

  return (
    <>
      {!!errorMessage && isReviewStep && (
        <Alert
          title={t('An error occurred')}
          variant={AlertVariant.danger}
          isInline
        >
          {errorMessage}
        </Alert>
      )}
      <WizardFooterWrapper>
        <Button
          data-test={isReviewStep ? 'create-button' : 'next-button'}
          variant={ButtonVariant.primary}
          onClick={isReviewStep ? onCreate : goToNextStep}
          isDisabled={
            !stepValidity[activeStep.id as CreateDRPolicyWizardSteps] ||
            isLoading
          }
          isLoading={isReviewStep && isLoading}
        >
          {isReviewStep ? t('Create') : t('Next')}
        </Button>
        <Button
          data-test="back-button"
          variant={ButtonVariant.secondary}
          onClick={goToPrevStep}
          isDisabled={isClustersStep || isLoading}
        >
          {t('Back')}
        </Button>
        <Button
          data-test="cancel-button"
          variant={ButtonVariant.link}
          onClick={onCancel}
          isDisabled={isLoading}
        >
          {t('Cancel')}
        </Button>
      </WizardFooterWrapper>
    </>
  );
};

type CreateDRPolicyWizardFooterProps = {
  stepValidity: Record<CreateDRPolicyWizardSteps, boolean>;
  isLoading: boolean;
  errorMessage: string;
  onCreate: () => void;
  onCancel: () => void;
};
