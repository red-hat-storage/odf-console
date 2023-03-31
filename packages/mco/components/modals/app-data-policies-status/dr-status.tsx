import * as React from 'react';
import { REPLICATION_TYPE, DRPC_STATUS } from '@odf/mco/constants';
import { fromNow } from '@odf/shared/details-page/datetime';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { StatusIconAndText } from '@openshift-console/dynamic-plugin-sdk';
import {
  DescriptionList,
  DescriptionListTerm,
  DescriptionListGroup,
  DescriptionListDescription,
  HelperText,
  HelperTextItem,
  Text,
} from '@patternfly/react-core';
import { getDRStatus } from '../../../utils';

const failOverStatus = [DRPC_STATUS.FailedOver, DRPC_STATUS.FailingOver];
const relocateStatus = [DRPC_STATUS.Relocating, DRPC_STATUS.Relocated];

export const DRStatus: React.FC<DRStatusProps[]> = (disasterRecoveryStatus) => {
  const { t } = useCustomTranslation();
  const drStatus: DRStatusProps = disasterRecoveryStatus?.[0];
  const {
    replicationType,
    dataLastSyncedOn,
    policyName,
    schedulingInterval,
    status,
    targetCluster,
  } = drStatus || {};
  const customText: string = [
    DRPC_STATUS.FailedOver,
    DRPC_STATUS.Relocated,
  ].includes(status)
    ? t('Completed')
    : t('In Progress');
  const statusAndText = getDRStatus({ currentStatus: status, customText, t });
  const lastSync = !!dataLastSyncedOn
    ? t('Last synced {{lastSync}}', { lastSync: fromNow(dataLastSyncedOn) })
    : '';
  return (
    <DescriptionList
      isCompact
      isHorizontal
      horizontalTermWidthModifier={{
        default: '8rem',
        sm: '8rem',
        md: '8rem',
        lg: '8rem',
        xl: '8rem',
        '2xl': '8rem',
      }}
    >
      <DescriptionListGroup>
        <DescriptionListTerm>{t('Disaster recovery')}</DescriptionListTerm>
        <DescriptionListDescription>
          {replicationType === REPLICATION_TYPE.ASYNC ? (
            <>
              <Text>
                {t('{{drPolicy}}, sync every {{syncInterval}}', {
                  drPolicy: policyName,
                  syncInterval: schedulingInterval,
                })}
              </Text>
              <Text>{t('Sync status: {{lastSync}}', { lastSync })}</Text>
            </>
          ) : (
            <Text>{policyName}</Text>
          )}
        </DescriptionListDescription>
      </DescriptionListGroup>
      <DescriptionListGroup>
        <HelperText>
          <HelperTextItem
            variant={
              failOverStatus.includes(status) ? 'default' : 'indeterminate'
            }
          >
            {t('Failover status')}
          </HelperTextItem>
        </HelperText>

        <DescriptionListDescription>
          {failOverStatus.includes(status) ? (
            <>
              <StatusIconAndText
                title={statusAndText?.text}
                icon={statusAndText?.icon}
              />
              <Text>
                {t('Target cluster: {{targetCluster}}', {
                  targetCluster: targetCluster,
                })}
              </Text>
            </>
          ) : (
            <HelperText>
              <HelperTextItem variant="indeterminate">
                {t('Not Initiated')}
              </HelperTextItem>
            </HelperText>
          )}
        </DescriptionListDescription>
      </DescriptionListGroup>
      <DescriptionListGroup>
        <HelperText>
          <HelperTextItem
            variant={
              relocateStatus.includes(status) ? 'default' : 'indeterminate'
            }
          >
            {t('Relocate status')}
          </HelperTextItem>
        </HelperText>
        <DescriptionListDescription>
          {relocateStatus.includes(status) ? (
            <>
              <StatusIconAndText
                title={statusAndText?.text}
                icon={statusAndText?.icon}
              />
              <Text>
                {t('Target cluster: {{targetCluster}}', {
                  targetCluster: targetCluster,
                })}
              </Text>
            </>
          ) : (
            <HelperText>
              <HelperTextItem variant="indeterminate">
                {t('Not Initiated')}
              </HelperTextItem>
            </HelperText>
          )}
        </DescriptionListDescription>
      </DescriptionListGroup>
    </DescriptionList>
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
