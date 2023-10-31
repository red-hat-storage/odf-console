import * as React from 'react';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { ReviewStepContent, ReviewStepContentItem } from '@odf/shared/review-step-content';
import { AssignPolicyViewState } from '../utils/reducer';
import { getName } from '@odf/shared/selectors';

export const ReviewAndAssignWizardContent: React.FC<ReviewAndAssignWizardContentProps> =
  ({ state }) => {
    const { t } = useCustomTranslation();
    const {policy} = state;
    return (
        <>
            <ReviewStepContent title={t("Data policy")}>
                <ReviewStepContentItem>
                    {t('Policy name: {{policyName}}', {
                        policyName: getName(policy),
                    })}
                </ReviewStepContentItem>
                <ReviewStepContentItem>
                    {t('Clusters: {{clusters}}', {
                        clusters: policy.drClusters.join(", "),
                    })}
                </ReviewStepContentItem>
                <ReviewStepContentItem>
                    {t('Replication type: {{replicationType}}', {
                        replicationType: policy.replicationType,
                    })}
                </ReviewStepContentItem>
                <ReviewStepContentItem>
                    {t('Sync interval: {{syncInterval}}', {
                        syncInterval: policy.schedulingInterval,
                    })}
                </ReviewStepContentItem>
            </ReviewStepContent>
            <ReviewStepContent title={t("PVC details")}>
                <ReviewStepContentItem>
                    {t('Application resource: {{appResource}}', {
                        appResource: getName(policy),
                    })}
                </ReviewStepContentItem>
                <ReviewStepContentItem>
                    {t('Clusters: {{clusters}}', {
                        clusters: policy.drClusters.join(", "),
                    })}
                </ReviewStepContentItem>
            </ReviewStepContent>
        </>
        
    );
  };

type ReviewAndAssignWizardContentProps = {
    state: AssignPolicyViewState
};
