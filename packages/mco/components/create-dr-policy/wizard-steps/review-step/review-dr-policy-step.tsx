import * as React from 'react';
import {
  GlobalnetStatus,
  PrePairCheckId,
  REPLICATION_DISPLAY_TEXT,
  ReplicationMode,
  ReplicationType,
  S3Mode,
  SubmarinerStatus,
  SYNC_SCHEDULE_DISPLAY_TEXT,
} from '@odf/mco/constants';
import type { PrePairNetworkValidationState } from '@odf/mco/hooks';
import { parseSyncInterval } from '@odf/mco/utils';
import {
  getDescriptorById,
  getStorageVendorLabel,
  type PrePairCheckResult,
} from '@odf/mco/utils/storage-vendor-registry';
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

type ReviewDRPolicyStepProps = {
  state: DRPolicyState;
  prePairCheckResults?: Map<string, PrePairCheckResult>;
};

const requiresSubmarinerAcknowledgement = (status: SubmarinerStatus): boolean =>
  status === SubmarinerStatus.NotInstalled ||
  status === SubmarinerStatus.Unknown;

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
  prePairCheckResults,
}) => {
  const { t } = useCustomTranslation();
  const clusterNames = state.clusters.selectedClusters.map(getName).join(', ');
  const descriptor = state.provider.storageVendor
    ? getDescriptorById(state.provider.storageVendor)
    : null;
  const storageBackendLabel = descriptor
    ? getStorageVendorLabel(descriptor.id, t)
    : '';
  const replicationLabel = state.policy.replicationType
    ? REPLICATION_DISPLAY_TEXT(t)[state.policy.replicationType]
    : '';
  const [unitVal, interval] = parseSyncInterval(state.policy.syncIntervalTime);
  const showInterval =
    descriptor?.replication.mode === ReplicationMode.Async ||
    (descriptor?.replication.mode === ReplicationMode.Derived &&
      state.policy.replicationType === ReplicationType.ASYNC);
  const syncSchedule = showInterval
    ? `${interval} ${SYNC_SCHEDULE_DISPLAY_TEXT(t)[unitVal]}`
    : '';
  const showS3Details = descriptor?.s3 === S3Mode.External;

  const submarinerCheckResult = prePairCheckResults?.get(
    PrePairCheckId.Submariner
  );
  const validation = submarinerCheckResult?.data as
    PrePairNetworkValidationState | undefined;

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
        {showS3Details && (
          <ReviewAndCreationGroup title={t('Replication site')}>
            <ReviewAndCreationItem label={t('S3 bucket (cluster 1)')}>
              {state.configure.cluster1S3Details.bucketName}
            </ReviewAndCreationItem>
            <ReviewAndCreationItem label={t('S3 endpoint (cluster 1)')}>
              {state.configure.cluster1S3Details.endpoint}
            </ReviewAndCreationItem>
            <ReviewAndCreationItem label={t('S3 bucket (cluster 2)')}>
              {state.configure.cluster2S3Details.bucketName}
            </ReviewAndCreationItem>
            <ReviewAndCreationItem label={t('S3 endpoint (cluster 2)')}>
              {state.configure.cluster2S3Details.endpoint}
            </ReviewAndCreationItem>
          </ReviewAndCreationGroup>
        )}
      </ReviewAndCreateStep>
    </div>
  );
};
