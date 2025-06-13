import * as React from 'react';
import {
  REPLICATION_DISPLAY_TEXT,
  SYNC_SCHEDULE_DISPLAY_TEXT,
} from '@odf/mco/constants';
import { parseSyncInterval } from '@odf/mco/utils';
import { matchExpressionSummary } from '@odf/shared/label-expression-selector';
import {
  ReviewAndCreateStep,
  ReviewAndCreationGroup,
  ReviewAndCreationItem,
} from '@odf/shared/review-and-create-step';
import { getName } from '@odf/shared/selectors';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import * as _ from 'lodash-es';
import {
  EnrollDiscoveredApplicationState,
  ProtectionMethodType,
} from '../../utils/reducer';

const convertRecipeParamsToString = (params: Record<string, string>): string =>
  Object.entries(params || {})
    .map(([key, value]) => `${key}: ${value}`)
    .join('; ');

export const Review: React.FC<ReviewProps> = ({ state }) => {
  const { t } = useCustomTranslation();

  const { namespace, configuration, replication } = state;
  const { clusterName, namespaces, name } = namespace;
  const { protectionMethod, recipe, resourceLabels } = configuration;
  const { recipeName, recipeNamespace, recipeParameters } = recipe;
  const { k8sResourceLabelExpressions, pvcLabelExpressions } = resourceLabels;
  const { drPolicy, k8sResourceReplicationInterval } = replication;

  const k8sResourceExpressions = k8sResourceLabelExpressions.map((expression) =>
    matchExpressionSummary(t, expression)
  );
  const pvcSelectorExpressions = pvcLabelExpressions.map((expression) =>
    matchExpressionSummary(t, expression)
  );
  const replicationType =
    drPolicy.spec.schedulingInterval === '0m'
      ? REPLICATION_DISPLAY_TEXT(t).sync
      : REPLICATION_DISPLAY_TEXT(t).async;
  const convertedRecipeParams: string =
    convertRecipeParamsToString(recipeParameters);
  const [unitVal, interval] = parseSyncInterval(k8sResourceReplicationInterval);

  return (
    <ReviewAndCreateStep>
      <ReviewAndCreationGroup title={t('Namespace')}>
        <ReviewAndCreationItem label={t('Cluster:')}>
          {clusterName}
        </ReviewAndCreationItem>
        <ReviewAndCreationItem label={t('Namespace:')}>
          {namespaces.map(getName).join(', ')}
        </ReviewAndCreationItem>
        <ReviewAndCreationItem label={t('Name:')}>{name}</ReviewAndCreationItem>
      </ReviewAndCreationGroup>
      <ReviewAndCreationGroup title={t('Configuration')}>
        {protectionMethod === ProtectionMethodType.RECIPE && (
          <>
            <ReviewAndCreationItem label={t('Type:')}>
              {t('Recipe')}
            </ReviewAndCreationItem>
            <ReviewAndCreationItem label={t('Recipe name:')}>
              {recipeName}
            </ReviewAndCreationItem>
            <ReviewAndCreationItem label={t('Recipe namespace:')}>
              {recipeNamespace}
            </ReviewAndCreationItem>
            {!_.isEmpty(recipeParameters) && (
              <ReviewAndCreationItem label={t('Recipe Parameters:')}>
                {convertedRecipeParams}
              </ReviewAndCreationItem>
            )}
          </>
        )}
        {protectionMethod === ProtectionMethodType.RESOURCE_LABEL && (
          <>
            <ReviewAndCreationItem label={t('Type:')}>
              {t('Resource label')}
            </ReviewAndCreationItem>
            <ReviewAndCreationItem label={t('Label expressions:')}>
              {k8sResourceExpressions.join(', ')}
            </ReviewAndCreationItem>
            <ReviewAndCreationItem label={t('PVC label selectors:')}>
              {pvcSelectorExpressions.join(', ')}
            </ReviewAndCreationItem>
          </>
        )}
      </ReviewAndCreationGroup>
      <ReviewAndCreationGroup title={t('Replication')}>
        <>
          <ReviewAndCreationItem label={t('Volume replication:')}>
            {t('{{policyName}}, {{replicationType}}, Interval: {{interval}}', {
              policyName: getName(drPolicy),
              replicationType,
              interval: drPolicy.spec.schedulingInterval,
            })}
          </ReviewAndCreationItem>
          <ReviewAndCreationItem label={t('Kubernetes object replication:')}>
            {`${interval} ${SYNC_SCHEDULE_DISPLAY_TEXT(t)[unitVal]}`}
          </ReviewAndCreationItem>
        </>
      </ReviewAndCreationGroup>
    </ReviewAndCreateStep>
  );
};

type ReviewProps = {
  state: EnrollDiscoveredApplicationState;
};
