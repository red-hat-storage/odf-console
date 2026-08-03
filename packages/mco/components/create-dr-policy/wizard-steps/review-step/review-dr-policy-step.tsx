import * as React from 'react';
import {
  BackendType,
  GlobalnetStatus,
  REPLICATION_DISPLAY_TEXT,
  ReplicationType,
  SubmarinerStatus,
  SYNC_SCHEDULE_DISPLAY_TEXT,
} from '@odf/mco/constants';
import type { PrePairNetworkValidationState } from '@odf/mco/hooks';
import { parseSyncInterval } from '@odf/mco/utils';
import {
  ReviewAndCreateStep,
  ReviewAndCreationGroup,
  ReviewAndCreationItem,
} from '@odf/shared/review-and-create-step';
import { getName } from '@odf/shared/selectors';
import {
  GreenCheckCircleIcon,
  YellowExclamationTriangleIcon,
} from '@odf/shared/status';
import StatusIconAndText from '@odf/shared/status/StatusIconAndText';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import type { TFunction } from 'i18next';
import { Content, ContentVariants, Title } from '@patternfly/react-core';
import type { DRPolicyState } from '../../utils/reducer';
import { requiresSubmarinerAcknowledgement } from '../../utils/step-validation';

type ReviewDRPolicyStepProps = {
  state: DRPolicyState;
  validation?: PrePairNetworkValidationState;
};

const getClusterPairDescription = (
  { status, globalnetStatus }: PrePairNetworkValidationState,
  t: TFunction
): string => {
  if (status === SubmarinerStatus.NotInstalled) {
    return t(
      'ACM-managed Submariner was not detected on the selected clusters. You chose to continue.'
    );
  }
  if (status === SubmarinerStatus.Unknown) {
    return t(
      'Submariner status could not be verified on the selected clusters. You chose to continue.'
    );
  }
  if (
    globalnetStatus === GlobalnetStatus.Enabled ||
    globalnetStatus === GlobalnetStatus.EnabledWithOverlap
  ) {
    return t('Submariner and Globalnet are enabled');
  }
  return t('Submariner enabled');
};

export const ReviewDRPolicyStep: React.FC<ReviewDRPolicyStepProps> = ({
  state,
  validation,
}) => {
  const { t } = useCustomTranslation();
  const clusterNames = state.clusters.selectedClusters.map(getName).join(', ');
  const storageBackendLabel =
    state.configure.replicationBackend === BackendType.ThirdParty
      ? t('Third-party storage')
      : t('Data Foundation');
  const replicationLabel = state.policy.replicationType
    ? REPLICATION_DISPLAY_TEXT(t)[state.policy.replicationType]
    : '';
  const [unitVal, interval] = parseSyncInterval(state.policy.syncIntervalTime);
  const syncSchedule =
    state.policy.replicationType === ReplicationType.ASYNC
      ? `${interval} ${SYNC_SCHEDULE_DISPLAY_TEXT(t)[unitVal]}`
      : '';

  return (
    <div className="mco-create-data-policy__body">
      <Title headingLevel="h2" size="lg" className="pf-v6-u-mb-md">
        {t('Review')}
      </Title>
      {!!validation && (
        <div className="pf-v6-u-mb-lg">
          <StatusIconAndText
            title={t('Cluster pair - Configured')}
            icon={
              requiresSubmarinerAcknowledgement(validation.status) ? (
                <YellowExclamationTriangleIcon />
              ) : (
                <GreenCheckCircleIcon />
              )
            }
            className="pf-v6-u-mb-xs"
          />
          <Content>
            <Content component={ContentVariants.small}>
              {getClusterPairDescription(validation, t)}
            </Content>
          </Content>
        </div>
      )}
      <ReviewAndCreateStep>
        <ReviewAndCreationGroup title={t('Clusters')}>
          <ReviewAndCreationItem label={t('Clusters')}>
            {clusterNames}
          </ReviewAndCreationItem>
          <ReviewAndCreationItem label={t('Storage backend')}>
            {storageBackendLabel}
          </ReviewAndCreationItem>
        </ReviewAndCreationGroup>
        <ReviewAndCreationGroup title={t('Policy')}>
          <ReviewAndCreationItem label={t('Policy name')}>
            {state.policy.policyName}
          </ReviewAndCreationItem>
          <ReviewAndCreationItem label={t('Retention policy')}>
            {replicationLabel}
          </ReviewAndCreationItem>
          {!!syncSchedule && (
            <ReviewAndCreationItem label={t('Replication interval')}>
              {syncSchedule}
            </ReviewAndCreationItem>
          )}
        </ReviewAndCreationGroup>
        {state.configure.replicationBackend === BackendType.ThirdParty && (
          <ReviewAndCreationGroup title={t('Replication site')}>
            <ReviewAndCreationItem label={t('S3 profile (cluster 1)')}>
              {state.configure.cluster1S3Details.s3ProfileName}
            </ReviewAndCreationItem>
            <ReviewAndCreationItem label={t('S3 profile (cluster 2)')}>
              {state.configure.cluster2S3Details.s3ProfileName}
            </ReviewAndCreationItem>
          </ReviewAndCreationGroup>
        )}
      </ReviewAndCreateStep>
    </div>
  );
};
