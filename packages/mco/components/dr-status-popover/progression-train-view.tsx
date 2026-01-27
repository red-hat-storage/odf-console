import * as React from 'react';
import { DRActionType } from '@odf/mco/constants';
import { Progression } from '@odf/mco/types';
import { formatTime } from '@odf/shared/details-page/datetime';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  Flex,
  FlexItem,
  ProgressStep,
  ProgressStepper,
  Text,
  Alert,
  AlertVariant,
  Button,
  CodeBlock,
  CodeBlockCode,
} from '@patternfly/react-core';
import {
  CheckCircleIcon,
  InProgressIcon,
  AngleRightIcon,
  AngleDownIcon,
} from '@patternfly/react-icons';
import './progression-train-view.scss';

export enum TrainStep {
  Preparing = 'Preparing',
  Failover = 'Failover',
  Syncing = 'Syncing',
  Restoring = 'Restoring',
  CleanUp = 'Clean up',
}

export enum StepStatus {
  Completed = 'completed',
  InProgress = 'in-progress',
  Pending = 'pending',
}

type ProgressionStep = {
  label: string;
  status: StepStatus;
};

export enum ProgressionStatus {
  // Preparing
  CHECKING_PREREQS = 'CheckingFailoverPrerequisites',
  WAIT_FENCING = 'WaitForFencing',
  WAIT_MAINTENANCE = 'WaitForStorageMaintenanceActivation',
  PREPARING_SYNC = 'PreparingFinalSync',
  CLEARING_PLACEMENT = 'ClearingPlacement',

  // Failover
  FAILING_OVER = 'FailingOverToCluster',
  RUNNING_FINAL_SYNC = 'RunningFinalSync',
  FINAL_SYNC_COMPLETE = 'FinalSyncComplete',
  ENSURING_SECONDARY = 'EnsuringVolumesAreSecondary',

  // Syncing
  ENSURING_VOLSYNC = 'EnsuringVolSyncSetup',
  SETUP_VOLSYNC_DEST = 'SettingUpVolSyncDest',

  // Restoring
  WAIT_RESTORE = 'WaitingForResourceRestore',
  WAIT_READINESS = 'WaitForReadiness',
  UPDATED_PLACEMENT = 'UpdatedPlacement',
  CREATING_MW = 'CreatingMW',
  UPDATING_PL_RULE = 'UpdatingPlRule',

  CLEANING_UP = 'Cleaning Up',
  WAIT_USER_CLEANUP = 'WaitOnUserToCleanUp',
}

export type ProgressionStatusValue = ProgressionStatus;

export type StepConfig = {
  label: TrainStep;
  statuses: ProgressionStatusValue[];
  description?: string;
};

export const FAILOVER_FLOW: StepConfig[] = [
  {
    label: TrainStep.Preparing,
    statuses: [
      ProgressionStatus.CHECKING_PREREQS,
      ProgressionStatus.WAIT_FENCING,
      ProgressionStatus.WAIT_MAINTENANCE,
      ProgressionStatus.PREPARING_SYNC,
      ProgressionStatus.CLEARING_PLACEMENT,
    ],
  },
  {
    label: TrainStep.Failover,
    statuses: [
      ProgressionStatus.FAILING_OVER,
      ProgressionStatus.RUNNING_FINAL_SYNC,
      ProgressionStatus.FINAL_SYNC_COMPLETE,
      ProgressionStatus.ENSURING_SECONDARY,
    ],
  },
  {
    label: TrainStep.Restoring,
    statuses: [
      ProgressionStatus.WAIT_RESTORE,
      ProgressionStatus.ENSURING_VOLSYNC,
      ProgressionStatus.SETUP_VOLSYNC_DEST,
      ProgressionStatus.WAIT_READINESS,
      ProgressionStatus.UPDATED_PLACEMENT,
      ProgressionStatus.CREATING_MW,
      ProgressionStatus.UPDATING_PL_RULE,
    ],
  },
  {
    label: TrainStep.CleanUp,
    statuses: [
      ProgressionStatus.CLEANING_UP,
      ProgressionStatus.WAIT_USER_CLEANUP,
    ],
  },
];

// Relocate flow for non-discovered apps (cleanup happens at the end)
export const RELOCATE_FLOW: StepConfig[] = [
  {
    label: TrainStep.Preparing,
    statuses: [
      ProgressionStatus.CHECKING_PREREQS,
      ProgressionStatus.WAIT_FENCING,
      ProgressionStatus.WAIT_MAINTENANCE,
      ProgressionStatus.PREPARING_SYNC,
      ProgressionStatus.CLEARING_PLACEMENT,
    ],
  },
  {
    label: TrainStep.Syncing,
    statuses: [
      ProgressionStatus.RUNNING_FINAL_SYNC,
      ProgressionStatus.FINAL_SYNC_COMPLETE,
      ProgressionStatus.ENSURING_SECONDARY,
      ProgressionStatus.ENSURING_VOLSYNC,
      ProgressionStatus.SETUP_VOLSYNC_DEST,
    ],
  },
  {
    label: TrainStep.Restoring,
    statuses: [
      ProgressionStatus.WAIT_RESTORE,
      ProgressionStatus.WAIT_READINESS,
      ProgressionStatus.UPDATED_PLACEMENT,
      ProgressionStatus.CREATING_MW,
      ProgressionStatus.UPDATING_PL_RULE,
    ],
  },
  {
    label: TrainStep.CleanUp,
    statuses: [
      ProgressionStatus.CLEANING_UP,
      ProgressionStatus.WAIT_USER_CLEANUP,
    ],
  },
];

// Relocate flow for discovered apps (cleanup happens after preparing)
export const RELOCATE_DISCOVERED_FLOW: StepConfig[] = [
  {
    label: TrainStep.Preparing,
    statuses: [
      ProgressionStatus.CHECKING_PREREQS,
      ProgressionStatus.WAIT_FENCING,
      ProgressionStatus.WAIT_MAINTENANCE,
      ProgressionStatus.PREPARING_SYNC,
      ProgressionStatus.CLEARING_PLACEMENT,
    ],
  },
  {
    label: TrainStep.CleanUp,
    statuses: [ProgressionStatus.WAIT_USER_CLEANUP],
  },
  {
    label: TrainStep.Syncing,
    statuses: [
      ProgressionStatus.RUNNING_FINAL_SYNC,
      ProgressionStatus.FINAL_SYNC_COMPLETE,
      ProgressionStatus.ENSURING_SECONDARY,
      ProgressionStatus.ENSURING_VOLSYNC,
      ProgressionStatus.SETUP_VOLSYNC_DEST,
    ],
  },
  {
    label: TrainStep.Restoring,
    statuses: [
      ProgressionStatus.WAIT_RESTORE,
      ProgressionStatus.WAIT_READINESS,
      ProgressionStatus.UPDATED_PLACEMENT,
      ProgressionStatus.CREATING_MW,
      ProgressionStatus.UPDATING_PL_RULE,
      ProgressionStatus.CLEANING_UP, // Final cleanup after restore
    ],
  },
];

const getCurrentStepFromFlow = (
  progression: string | undefined,
  flow: StepConfig[]
): TrainStep => {
  // If progression is "Completed", all steps should be completed
  // Return the last step so all steps show as completed
  if (progression === Progression.Completed) {
    return flow[flow.length - 1].label; // Clean up (last step)
  }

  // If progression is empty/undefined, return first step (transition state)
  if (!progression) {
    return flow[0].label;
  }

  const stepConfig = flow.find((config) =>
    config.statuses.includes(progression as ProgressionStatus)
  );

  // Fallback to first step if progression not recognized
  return stepConfig?.label || flow[0].label;
};

export const getTrainSteps = (
  action: DRActionType,
  currentProgression?: string,
  isDiscoveredApp?: boolean
): ProgressionStep[] => {
  const flow =
    action === DRActionType.FAILOVER
      ? FAILOVER_FLOW
      : isDiscoveredApp
        ? RELOCATE_DISCOVERED_FLOW
        : RELOCATE_FLOW;

  const currentStep = getCurrentStepFromFlow(currentProgression, flow);
  const currentIndex = flow.findIndex((config) => config.label === currentStep);

  return flow.map((config, index) => ({
    label: config.label,
    status:
      index < currentIndex
        ? StepStatus.Completed
        : index === currentIndex
          ? StepStatus.InProgress
          : StepStatus.Pending,
  }));
};

type ProgressionTrainViewProps = {
  action: DRActionType;
  currentProgression?: string;
  applicationName: string;
  actionStartTime?: string;
  progressionDetails?: string[];
  isCleanupRequired?: boolean;
  cleanupCluster?: string;
  isDiscoveredApp?: boolean;
  learnMoreHref?: string;
};

export const ProgressionTrainView: React.FC<ProgressionTrainViewProps> = ({
  action,
  currentProgression,
  applicationName,
  actionStartTime,
  progressionDetails,
  isCleanupRequired,
  cleanupCluster,
  isDiscoveredApp,
  learnMoreHref,
}) => {
  const { t } = useCustomTranslation();
  const [isDetailsExpanded, setIsDetailsExpanded] = React.useState(false);

  const steps = getTrainSteps(action, currentProgression, isDiscoveredApp);
  const completedSteps = steps.filter(
    (s) => s.status === StepStatus.Completed
  ).length;
  const totalSteps = steps.length;

  return (
    <Flex
      direction={{ default: 'column' }}
      spaceItems={{ default: 'spaceItemsMd' }}
      className="progression-train-view"
    >
      <FlexItem>
        <Text className="progression-train-view__summary">
          {t('{{completedSteps}} of {{totalSteps}} steps completed', {
            completedSteps,
            totalSteps,
          })}
        </Text>
      </FlexItem>

      <FlexItem>
        <ProgressStepper isCenterAligned>
          {steps.map((step, index) => (
            <ProgressStep
              key={step.label}
              variant={
                step.status === StepStatus.Completed
                  ? 'success'
                  : step.status === StepStatus.InProgress
                    ? 'info'
                    : 'pending'
              }
              id={`step-${index}`}
              titleId={`step-${index}-title`}
              aria-label={step.label}
              icon={
                step.status === StepStatus.Completed ? (
                  <CheckCircleIcon />
                ) : step.status === StepStatus.InProgress ? (
                  <InProgressIcon className="progression-train-view__in-progress-icon" />
                ) : undefined
              }
            >
              {step.label}
            </ProgressStep>
          ))}
        </ProgressStepper>
      </FlexItem>

      {isCleanupRequired && cleanupCluster && (
        <FlexItem>
          <Alert
            variant={AlertVariant.info}
            isInline
            title={t(
              'Clean up application {{appName}} to complete {{action}}',
              {
                appName: applicationName,
                action: action.toLowerCase(),
              }
            )}
          >
            {action === DRActionType.FAILOVER
              ? t(
                  'Go to the cloned repository for {{appName}} on the failed cluster {{cluster}} and delete the application.',
                  { appName: applicationName, cluster: cleanupCluster }
                )
              : t(
                  'Clean up application resources on the primary cluster {{cluster}} to start relocating.',
                  { cluster: cleanupCluster }
                )}
            <br />
            <Button
              variant="link"
              isInline
              icon={<AngleRightIcon />}
              iconPosition="right"
              className="pf-v5-u-pl-0 pf-v5-u-mt-sm"
              component={learnMoreHref ? 'a' : undefined}
              {...(learnMoreHref
                ? {
                    href: learnMoreHref,
                    target: '_blank',
                    rel: 'noreferrer',
                  }
                : {})}
            >
              {t('Learn more')}
            </Button>
          </Alert>
        </FlexItem>
      )}

      {actionStartTime && (
        <FlexItem>
          <Text>
            <strong>{t('Started on')}</strong> {formatTime(actionStartTime)}
          </Text>
        </FlexItem>
      )}

      {(currentProgression ||
        (progressionDetails && progressionDetails.length > 0)) && (
        <FlexItem>
          <Button
            variant="link"
            isInline
            onClick={() => setIsDetailsExpanded(!isDetailsExpanded)}
            icon={isDetailsExpanded ? <AngleDownIcon /> : <AngleRightIcon />}
            className="pf-v5-u-pl-0"
          >
            {isDetailsExpanded ? t('Hide details') : t('View details')}
          </Button>
          {isDetailsExpanded && (
            <>
              <Text className="pf-v5-u-mt-sm pf-v5-u-mb-sm">
                <strong>{t('Current progression')}:</strong>{' '}
                {currentProgression || t('Unavailable')}
              </Text>
              {progressionDetails && progressionDetails.length > 0 ? (
                <>
                  <Text className="pf-v5-u-mb-xs">{t('Details')}</Text>
                  <CodeBlock className="progression-train-view__details">
                    <CodeBlockCode>
                      {progressionDetails.map((detail, index) => (
                        <React.Fragment key={index}>
                          {detail}
                          {index < progressionDetails.length - 1 && <br />}
                        </React.Fragment>
                      ))}
                    </CodeBlockCode>
                  </CodeBlock>
                </>
              ) : (
                <Text className="pf-v5-u-mb-sm">
                  {t('No additional details are available.')}
                </Text>
              )}
            </>
          )}
        </FlexItem>
      )}
    </Flex>
  );
};
