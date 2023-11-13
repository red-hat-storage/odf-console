import * as React from 'react';
import {
  APPLICATION_TYPE,
  SYNC_SCHEDULE_DISPLAY_TEXT,
} from '@odf/mco/constants';
import { parseSyncInterval } from '@odf/mco/utils';
import { matchExpressionSummary } from '@odf/shared/label-expression-selector';
import { Labels } from '@odf/shared/labels';
import {
  ReviewAndCreateStep,
  ReviewAndCreationGroup,
  ReviewAndCreationItem,
} from '@odf/shared/review-and-create-step';
import { getName } from '@odf/shared/selectors';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  AssignPolicyViewState,
  ObjectProtectionMethod,
  PVCSelectorType,
} from '../utils/reducer';

const getLabels = (pvcSelectors: PVCSelectorType[]): string[] =>
  pvcSelectors.reduce((acc, selectors) => [...acc, ...selectors.labels], []);

export const ReviewAndAssign: React.FC<ReviewAndAssignProps> = ({
  state,
  appType,
  workloadNamespace,
}) => {
  const { t } = useCustomTranslation();
  const { policy, persistentVolumeClaim, policyRule, dynamicObjects } = state;
  const { drClusters, replicationType, schedulingInterval } = policy;
  const { pvcSelectors } = persistentVolumeClaim;
  const {
    captureInterval,
    objectProtectionMethod,
    recipeInfo,
    appResourceSelector,
  } = dynamicObjects;
  const labels = React.useMemo(() => getLabels(pvcSelectors), [pvcSelectors]);
  const expressions = React.useMemo(
    () =>
      appResourceSelector.map((expression) =>
        matchExpressionSummary(t, expression)
      ),
    [appResourceSelector, t]
  );
  const selectorCount = pvcSelectors.length;
  const appResourceText =
    selectorCount > 1
      ? t('{{count}} placements', { count: selectorCount })
      : pvcSelectors[0].placementName;
  const [unit, interval] = parseSyncInterval(schedulingInterval);
  const isOpenshiftApp = appType === APPLICATION_TYPE.OPENSHIFT;
  const isRecipeMethod =
    objectProtectionMethod === ObjectProtectionMethod.Recipe;

  return (
    <ReviewAndCreateStep>
      {isOpenshiftApp && (
        <ReviewAndCreationGroup title={t('Policy rule')}>
          <ReviewAndCreationItem label={t('Policy assignment rule:')}>
            {policyRule}
          </ReviewAndCreationItem>
          <ReviewAndCreationItem label={t('Namesapce:')}>
            {workloadNamespace}
          </ReviewAndCreationItem>
        </ReviewAndCreationGroup>
      )}
      <ReviewAndCreationGroup title={t('Data policy')}>
        <ReviewAndCreationItem label={t('Policy name:')}>
          {getName(policy)}
        </ReviewAndCreationItem>
        <ReviewAndCreationItem label={t('Clusters:')}>
          {drClusters.join(', ')}
        </ReviewAndCreationItem>
        <ReviewAndCreationItem label={t('Replication type:')}>
          {replicationType}
        </ReviewAndCreationItem>
        <ReviewAndCreationItem label={t('Sync interval:')}>
          {`${interval} ${SYNC_SCHEDULE_DISPLAY_TEXT(t)[unit]}`}
        </ReviewAndCreationItem>
      </ReviewAndCreationGroup>
      <ReviewAndCreationGroup title={t('PVC details')}>
        <ReviewAndCreationItem label={t('Application resource:')}>
          {appResourceText}
        </ReviewAndCreationItem>
        <ReviewAndCreationItem label={t('PVC label selector:')}>
          <Labels numLabels={5} labels={labels} />
        </ReviewAndCreationItem>
      </ReviewAndCreationGroup>
      {isOpenshiftApp && (
        <ReviewAndCreationGroup title={t('Dynamic objects')}>
          <ReviewAndCreationItem label={t('Protection method:')}>
            {isRecipeMethod ? t('Recipe') : t('Resource label selector')}
          </ReviewAndCreationItem>
          {isRecipeMethod ? (
            <>
              <ReviewAndCreationItem label={t('Recipe name:')}>
                {recipeInfo.name}
              </ReviewAndCreationItem>
              <ReviewAndCreationItem label={t('Recipe namespace:')}>
                {recipeInfo.namespace}
              </ReviewAndCreationItem>
            </>
          ) : (
            <ReviewAndCreationItem label={t('Resource label selector:')}>
              {expressions.join(', ')}
            </ReviewAndCreationItem>
          )}
          <ReviewAndCreationItem label={t('Replication interval:')}>
            {captureInterval}
          </ReviewAndCreationItem>
        </ReviewAndCreationGroup>
      )}
    </ReviewAndCreateStep>
  );
};

type ReviewAndAssignProps = {
  state: AssignPolicyViewState;
  workloadNamespace: string;
  appType: APPLICATION_TYPE;
};
