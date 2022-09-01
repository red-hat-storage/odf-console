import * as React from 'react';
import { GreenCheckCircleIcon } from '@odf/shared/status/icons';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { StatusIconAndText } from '@openshift-console/dynamic-plugin-sdk';
import {
  Flex,
  FlexItem,
  HelperText,
  HelperTextItem,
} from '@patternfly/react-core';
import { InProgressIcon } from '@patternfly/react-icons';
import { DRPlacementControlKind } from '../../../types';
import { getDRPoliciesCount, DRPolicyMap } from '../../../utils';

export enum DRPC_STATUS {
  FailedOver = 'FailedOver',
  Relocating = 'Relocating',
  FailingOver = 'FailingOver',
  Relocated = 'Relocated',
}

const updateStatusSummary = (
  currentStatus: string,
  prevStatus?: DRStatusSummaryType
) => {
  (currentStatus === DRPC_STATUS.FailedOver &&
    prevStatus.failover.finished++) ||
    (currentStatus === DRPC_STATUS.FailingOver &&
      prevStatus.failover.inProgress++) ||
    (currentStatus === DRPC_STATUS.Relocated &&
      prevStatus.relocate.finished++) ||
    (currentStatus === DRPC_STATUS.Relocating &&
      prevStatus.relocate.inProgress++);
  return prevStatus;
};

const generateStatusSummary = (
  drPlacementControls: DRPlacementControlKind[]
): DRStatusSummaryType =>
  drPlacementControls?.reduce(
    (acc, drPlacementControl) =>
      updateStatusSummary(drPlacementControl?.status?.phase || '', acc),
    {
      relocate: {
        finished: 0,
        inProgress: 0,
      },
      failover: {
        finished: 0,
        inProgress: 0,
      },
    }
  );

const StatusSummary: React.FC<StatusSummaryProps> = ({
  drAction,
  statusCount,
}) => {
  const { t } = useCustomTranslation();
  const finished = statusCount?.finished;
  const inProgress = statusCount?.inProgress;
  const isEnabled = finished > 0 || inProgress > 0;
  return (
    <Flex>
      <FlexItem>
        <HelperText>
          <HelperTextItem
            data-test="dr-status-label"
            variant={isEnabled ? 'default' : 'indeterminate'}
          >
            {drAction}
          </HelperTextItem>
        </HelperText>
      </FlexItem>
      {isEnabled ? (
        <FlexItem>
          <Flex spaceItems={{ default: 'spaceItemsMd' }}>
            <FlexItem>
              <StatusIconAndText
                title={finished.toString()}
                icon={<GreenCheckCircleIcon />}
              />
            </FlexItem>
            <FlexItem>
              <StatusIconAndText
                title={inProgress.toString()}
                icon={<InProgressIcon />}
              />
            </FlexItem>
          </Flex>
        </FlexItem>
      ) : (
        <FlexItem>
          <HelperText>
            <HelperTextItem
              variant="indeterminate"
              data-test="dr-status-unknown"
            >
              {t('Not Initiated')}
            </HelperTextItem>
          </HelperText>
        </FlexItem>
      )}
    </Flex>
  );
};

export const DRStatusCard: React.FC<DRStatusCardProps> = ({ drPolicies }) => {
  const { t } = useCustomTranslation();
  const statusSummary = React.useMemo(
    () =>
      generateStatusSummary(
        Object.values(drPolicies).reduce(
          (acc, policies) => [...acc, ...policies],
          []
        )
      ),
    [drPolicies]
  );

  return (
    <>
      <Flex>
        <FlexItem>
          <strong>
            {t('Disaster recovery: {{count}} policies', {
              count: getDRPoliciesCount(drPolicies),
            })}
          </strong>
        </FlexItem>
      </Flex>
      <StatusSummary
        drAction={t('Failover:')}
        statusCount={statusSummary?.failover}
      />
      <StatusSummary
        drAction={t('Relocate:')}
        statusCount={statusSummary?.relocate}
      />
    </>
  );
};

type DRStatusCardProps = {
  drPolicies: DRPolicyMap;
};

type StatusSummaryProps = {
  drAction: string;
  statusCount: DRStatusSummaryCountType;
};

type DRStatusSummaryCountType = {
  finished: number;
  inProgress: number;
};

export type DRStatusSummaryType = {
  relocate?: DRStatusSummaryCountType;
  failover?: DRStatusSummaryCountType;
};
