import * as React from 'react';
import {
  BackendType,
  GlobalnetStatus,
  REPLICATION_DISPLAY_TEXT,
  ReplicationType,
  SubmarinerStatus,
  SYNC_SCHEDULE_DISPLAY_TEXT,
} from '@odf/mco/constants';
import { PrePairNetworkValidationState } from '@odf/mco/hooks';
import { parseSyncInterval } from '@odf/mco/utils';
import {
  ReviewAndCreateStep,
  ReviewAndCreationGroup,
  ReviewAndCreationItem,
} from '@odf/shared/review-and-create-step';
import { GreenCheckCircleIcon } from '@odf/shared/status';
import StatusIconAndText from '@odf/shared/status/StatusIconAndText';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { TFunction } from 'i18next';
import { Content, ContentVariants, Title } from '@patternfly/react-core';
import { getSubmarinerStatusDescription } from './pre-pair-status-copy';
import { DRPolicyState } from './utils/reducer';

type ReviewDRPolicyStepProps = {
  state: DRPolicyState;
  validation?: PrePairNetworkValidationState;
};

const getClusterPairDescription = (
  status: SubmarinerStatus,
  globalnetStatus: GlobalnetStatus,
  t: TFunction
): string => {
  if (
    status === SubmarinerStatus.Healthy &&
    (globalnetStatus === GlobalnetStatus.Enabled ||
      globalnetStatus === GlobalnetStatus.EnabledWithOverlap)
  ) {
    return t('Submariner and Globalnet is enabled');
  }
  // Review only receives validation when Configure already passed (canProceed),
  // so status is Healthy | NotInstalled | UpstreamDetected — all have copy.
  return getSubmarinerStatusDescription(status, t)!;
};

export const ReviewDRPolicyStep: React.FC<ReviewDRPolicyStepProps> = ({
  state,
  validation,
}) => {
  const { t } = useCustomTranslation();
  const replicationLabel = state.replicationType
    ? REPLICATION_DISPLAY_TEXT(t)[state.replicationType]
    : '';
  const [unitVal, interval] = parseSyncInterval(state.syncIntervalTime);
  const syncSchedule =
    state.replicationType === ReplicationType.ASYNC
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
            icon={<GreenCheckCircleIcon />}
            className="pf-v6-u-mb-xs"
          />
          <Content>
            <Content component={ContentVariants.small}>
              {getClusterPairDescription(
                validation.status,
                validation.globalnetStatus,
                t
              )}
            </Content>
          </Content>
        </div>
      )}
      <ReviewAndCreateStep>
        <ReviewAndCreationGroup title={t('Policy')}>
          <ReviewAndCreationItem label={t('Policy name')}>
            {state.policyName}
          </ReviewAndCreationItem>
          <ReviewAndCreationItem label={t('Replication type')}>
            {replicationLabel}
          </ReviewAndCreationItem>
          {!!syncSchedule && (
            <ReviewAndCreationItem label={t('Sync interval')}>
              {syncSchedule}
            </ReviewAndCreationItem>
          )}
        </ReviewAndCreationGroup>
        {state.replicationBackend === BackendType.ThirdParty && (
          <ReviewAndCreationGroup title={t('Replication site')}>
            <ReviewAndCreationItem label={t('S3 profile (cluster 1)')}>
              {state.cluster1S3Details.s3ProfileName}
            </ReviewAndCreationItem>
            <ReviewAndCreationItem label={t('S3 profile (cluster 2)')}>
              {state.useSameS3Connection
                ? state.cluster1S3Details.s3ProfileName
                : state.cluster2S3Details.s3ProfileName}
            </ReviewAndCreationItem>
          </ReviewAndCreationGroup>
        )}
      </ReviewAndCreateStep>
    </div>
  );
};
