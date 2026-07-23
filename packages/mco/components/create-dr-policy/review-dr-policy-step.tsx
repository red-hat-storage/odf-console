import * as React from 'react';
import {
  BackendType,
  REPLICATION_DISPLAY_TEXT,
  ReplicationType,
  SYNC_SCHEDULE_DISPLAY_TEXT,
} from '@odf/mco/constants';
import { parseSyncInterval } from '@odf/mco/utils';
import {
  ReviewAndCreateStep,
  ReviewAndCreationGroup,
  ReviewAndCreationItem,
} from '@odf/shared/review-and-create-step';
import { getName } from '@odf/shared/selectors';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { Content, ContentVariants, Title } from '@patternfly/react-core';
import { DRPolicyState } from './utils/reducer';

type ReviewDRPolicyStepProps = {
  state: DRPolicyState;
};

export const ReviewDRPolicyStep: React.FC<ReviewDRPolicyStepProps> = ({
  state,
}) => {
  const { t } = useCustomTranslation();
  const clusterNames = state.selectedClusters.map(getName).join(', ');
  const replicationLabel = state.replicationType
    ? REPLICATION_DISPLAY_TEXT(t)[state.replicationType]
    : '';
  const [unitVal, interval] = parseSyncInterval(state.syncIntervalTime);
  const syncSchedule =
    state.replicationType === ReplicationType.ASYNC
      ? `${interval} ${SYNC_SCHEDULE_DISPLAY_TEXT(t)[unitVal]}`
      : t('N/A');

  return (
    <div className="mco-create-data-policy__body">
      <Title headingLevel="h2" size="lg" className="pf-v6-u-mb-md">
        {t('Review and create')}
      </Title>
      <Content className="pf-v6-u-mb-lg">
        <Content component={ContentVariants.small}>
          {t(
            'Confirm the disaster recovery policy details before creating the policy.'
          )}
        </Content>
      </Content>
      <ReviewAndCreateStep>
        <ReviewAndCreationGroup title={t('Policy')}>
          <ReviewAndCreationItem label={t('Policy name:')}>
            {state.policyName}
          </ReviewAndCreationItem>
        </ReviewAndCreationGroup>
        <ReviewAndCreationGroup title={t('Clusters')}>
          <ReviewAndCreationItem label={t('Clusters:')}>
            {clusterNames}
          </ReviewAndCreationItem>
        </ReviewAndCreationGroup>
        <ReviewAndCreationGroup title={t('Replication')}>
          <ReviewAndCreationItem label={t('Replication type:')}>
            {replicationLabel}
          </ReviewAndCreationItem>
          {state.replicationType === ReplicationType.ASYNC && (
            <ReviewAndCreationItem label={t('Sync interval:')}>
              {syncSchedule}
            </ReviewAndCreationItem>
          )}
        </ReviewAndCreationGroup>
        {state.replicationBackend === BackendType.ThirdParty && (
          <ReviewAndCreationGroup title={t('Replication site')}>
            <ReviewAndCreationItem label={t('S3 profile (cluster 1):')}>
              {state.cluster1S3Details.s3ProfileName}
            </ReviewAndCreationItem>
            <ReviewAndCreationItem label={t('S3 profile (cluster 2):')}>
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
