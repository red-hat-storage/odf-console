import * as React from 'react';
import { REPLICATION_TYPE, DRPC_STATUS } from '@odf/mco/constants';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { StatusIconAndText } from '@openshift-console/dynamic-plugin-sdk';
import {
  Flex,
  FlexItem,
  HelperText,
  HelperTextItem,
} from '@patternfly/react-core';
import { getDRStatus } from '../../../utils';

const failOverStatus = [DRPC_STATUS.FailedOver, DRPC_STATUS.FailingOver];
const relocateStatus = [DRPC_STATUS.Relocating, DRPC_STATUS.Relocated];

export const DRCurrentActivity: React.FC<DRStatusProps> = (props) => {
  const { status, dataLastSyncedOn, targetCluster, replicationType } = props;
  const { t } = useCustomTranslation();
  const customText: string = [
    DRPC_STATUS.FailedOver,
    DRPC_STATUS.Relocated,
  ].includes(status)
    ? t('Completed')
    : t('In Progress');
  const statusAndText = getDRStatus({ currentStatus: status, customText, t });
  return (
    <Flex
      direction={{ default: 'column' }}
      spaceItems={{ default: 'spaceItemsSm' }}
    >
      <FlexItem>
        {
          <StatusIconAndText
            title={statusAndText?.text}
            icon={statusAndText?.icon}
          />
        }
      </FlexItem>
      <FlexItem>
        {t('Target cluster: {{targetCluster}}', {
          targetCluster: targetCluster,
        })}
      </FlexItem>
      {replicationType === REPLICATION_TYPE.ASYNC && (
        <FlexItem>
          {t('Last sync: {{lastSync}}', { lastSync: dataLastSyncedOn })}
        </FlexItem>
      )}
    </Flex>
  );
};

export const DRStatus: React.FC<DRStatusProps[]> = (disasterRecoveryStatus) => {
  const { t } = useCustomTranslation();
  const drStatus = disasterRecoveryStatus?.[0];
  return (
    <Flex
      direction={{ default: 'column' }}
      spaceItems={{ default: 'spaceItemsSm' }}
    >
      <Flex>
        <FlexItem>
          <strong> {t('Disaster recovery')} </strong>
        </FlexItem>
        <FlexItem>
          {drStatus?.replicationType === REPLICATION_TYPE.ASYNC
            ? t('{{drPolicy}}, sync every {{syncInterval}}', {
                drPolicy: drStatus?.policyName,
                syncInterval: drStatus?.schedulingInterval,
              })
            : drStatus?.policyName}
        </FlexItem>
      </Flex>
      <Flex>
        <FlexItem>{t('Failover status')}</FlexItem>
        <FlexItem>
          {failOverStatus.includes(drStatus?.status) ? (
            <DRCurrentActivity {...drStatus} />
          ) : (
            <HelperText>
              <HelperTextItem variant="indeterminate">
                {t('Not Initiated')}
              </HelperTextItem>
            </HelperText>
          )}
        </FlexItem>
      </Flex>
      <Flex>
        <FlexItem>{t('Relocate status')}</FlexItem>
        <FlexItem>
          {relocateStatus.includes(drStatus?.status) ? (
            <DRCurrentActivity {...drStatus} />
          ) : (
            <HelperText>
              <HelperTextItem variant="indeterminate">
                {t('Not Initiated')}
              </HelperTextItem>
            </HelperText>
          )}
        </FlexItem>
      </Flex>
    </Flex>
  );
};

export type DRStatusProps = {
  policyName: string;
  status: DRPC_STATUS;
  targetCluster: string;
  replicationType: REPLICATION_TYPE;
  dataLastSyncedOn: string;
  schedulingInterval: string;
};
