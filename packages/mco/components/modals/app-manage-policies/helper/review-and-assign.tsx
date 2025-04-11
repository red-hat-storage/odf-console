import * as React from 'react';
import {
  DRApplication,
  REPLICATION_DISPLAY_TEXT,
  SYNC_SCHEDULE_DISPLAY_TEXT,
} from '@odf/mco/constants';
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
import { DRPolicyType, ModalType, VMProtectionType } from '../utils/types';
import '../style.scss';

const getLabels = (pvcSelectors: PVCSelectorType[]): string[] =>
  pvcSelectors.reduce((acc, selectors) => [...acc, ...selectors.labels], []);

const ProtectionTypeReview: React.FC<{
  protectionTypeState: AssignPolicyViewState['protectionType'];
  appType: DRApplication;
}> = ({ protectionTypeState: { protectionName, protectionType }, appType }) => {
  const { t } = useCustomTranslation();
  const showProtectionName =
    protectionType === VMProtectionType.STANDALONE &&
    appType === DRApplication.DISCOVERED;
  const protectionDisplayType =
    protectionType === VMProtectionType.STANDALONE
      ? t('Standalone')
      : t('Shared');

  return (
    <ReviewAndCreationGroup title={t('Protection type')}>
      <ReviewAndCreationItem label={t('Protection type:')}>
        {protectionDisplayType}
      </ReviewAndCreationItem>
      {showProtectionName && (
        <ReviewAndCreationItem label={t('Protection name:')}>
          {protectionName}
        </ReviewAndCreationItem>
      )}
    </ReviewAndCreationGroup>
  );
};

const ReplicationReview: React.FC<{
  replication: AssignPolicyViewState['replication'];
}> = ({ replication: { policy, k8sSyncInterval } }) => {
  const { t } = useCustomTranslation();
  const replicationType =
    policy.schedulingInterval === '0m'
      ? REPLICATION_DISPLAY_TEXT(t).sync
      : REPLICATION_DISPLAY_TEXT(t).async;
  const [unitVal, interval] = parseSyncInterval(k8sSyncInterval);

  return (
    <ReviewAndCreationGroup title={t('Replication')}>
      <>
        <ReviewAndCreationItem label={t('Volume replication:')}>
          {t('{{policyName}}, {{replicationType}}, Interval: {{interval}}', {
            policyName: getName(policy),
            replicationType,
            interval: policy.schedulingInterval,
          })}
        </ReviewAndCreationItem>
        <ReviewAndCreationItem label={t('Kubernetes object replication:')}>
          {`${interval} ${SYNC_SCHEDULE_DISPLAY_TEXT(t)[unitVal]}`}
        </ReviewAndCreationItem>
      </>
    </ReviewAndCreationGroup>
  );
};

const PolicyReview: React.FC<{ policy: DRPolicyType }> = ({ policy }) => {
  const { t } = useCustomTranslation();
  const { drClusters, replicationType, schedulingInterval } = policy;
  const [unit, interval] = parseSyncInterval(schedulingInterval);

  return (
    <ReviewAndCreationGroup title={t('Policy')}>
      <ReviewAndCreationItem label={t('Policy name:')}>
        {getName(policy)}
      </ReviewAndCreationItem>
      <ReviewAndCreationItem label={t('Clusters:')}>
        {drClusters.join(', ')}
      </ReviewAndCreationItem>
      <ReviewAndCreationItem label={t('Replication type:')}>
        {REPLICATION_DISPLAY_TEXT(t)[replicationType]}
      </ReviewAndCreationItem>
      <ReviewAndCreationItem label={t('Sync interval:')}>
        {`${interval} ${SYNC_SCHEDULE_DISPLAY_TEXT(t)[unit]}`}
      </ReviewAndCreationItem>
    </ReviewAndCreationGroup>
  );
};

const PVCDetailsReview: React.FC<{
  persistentVolumeClaim: AssignPolicyViewState['persistentVolumeClaim'];
}> = ({ persistentVolumeClaim }) => {
  const { t } = useCustomTranslation();
  const { pvcSelectors } = persistentVolumeClaim;
  const labels = getLabels(pvcSelectors);
  const selectorCount = pvcSelectors.length;
  const appResourceText =
    selectorCount > 1
      ? t('{{count}} placements', { count: selectorCount })
      : pvcSelectors[0].placementName;

  return (
    <ReviewAndCreationGroup title={t('PVC details')}>
      <ReviewAndCreationItem label={t('Application resource:')}>
        {appResourceText}
      </ReviewAndCreationItem>
      <ReviewAndCreationItem label={t('PVC label selector:')}>
        <Labels numLabels={5} labels={labels} />
      </ReviewAndCreationItem>
    </ReviewAndCreationGroup>
  );
};

export const ReviewAndAssign: React.FC<ReviewAndAssignProps> = ({
  state,
  modalType,
  appType,
}) => (
  <ReviewAndCreateStep>
    {modalType === ModalType.VirtualMachine && (
      <ProtectionTypeReview
        protectionTypeState={state.protectionType}
        appType={appType}
      />
    )}

    {appType === DRApplication.DISCOVERED ? (
      <ReplicationReview replication={state.replication} />
    ) : (
      <>
        <PolicyReview policy={state.policy} />
        <PVCDetailsReview persistentVolumeClaim={state.persistentVolumeClaim} />
      </>
    )}
  </ReviewAndCreateStep>
);

type ReviewAndAssignProps = {
  state: AssignPolicyViewState;
  modalType: ModalType;
  appType: DRApplication;
};
