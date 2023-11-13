import * as React from 'react';
import { SYNC_SCHEDULE_DISPLAY_TEXT } from '@odf/mco/constants';
import { parseSyncInterval } from '@odf/mco/utils';
import { Labels } from '@odf/shared/labels';
import {
  ReviewAndCreateStep,
  ReviewAndCreationGroup,
  ReviewAndCreationItem,
} from '@odf/shared/review-and-create-step';
import { getName } from '@odf/shared/selectors';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { AssignPolicyViewState, PVCSelectorType } from '../utils/reducer';
import '../style.scss';

const getLabels = (pvcSelectors: PVCSelectorType[]): string[] =>
  pvcSelectors.reduce((acc, selectors) => [...acc, ...selectors.labels], []);

export const ReviewAndAssign: React.FC<ReviewAndAssignProps> = ({ state }) => {
  const { t } = useCustomTranslation();
  const { policy, persistentVolumeClaim } = state;
  const { drClusters, replicationType, schedulingInterval } = policy;
  const { pvcSelectors } = persistentVolumeClaim;
  const selectorCount = pvcSelectors.length;
  const appResourceText =
    selectorCount > 1
      ? t('{{count}} placements', { count: selectorCount })
      : pvcSelectors[0].placementName;

  const labels = React.useMemo(() => getLabels(pvcSelectors), [pvcSelectors]);

  const [unit, interval] = parseSyncInterval(schedulingInterval);

  return (
    <ReviewAndCreateStep>
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
    </ReviewAndCreateStep>
  );
};

type ReviewAndAssignProps = {
  state: AssignPolicyViewState;
};
