import * as React from 'react';
import { DRActionType } from '@odf/mco/constants';
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

type StepMap = Record<TrainStep, string[]>;

const PREPARING_STATUSES = [
  'CheckingFailoverPrerequisites',
  'WaitForFencing',
  'WaitForStorageMaintenanceActivation',
  'PreparingFinalSync',
  'ClearingPlacement',
];

const CLEANUP_STATUSES = ['CleaningUp', 'WaitOnUserToCleanUp'];

const FAILOVER_STEP_ORDER: TrainStep[] = [
  TrainStep.Preparing,
  TrainStep.Failover,
  TrainStep.Restoring,
  TrainStep.CleanUp,
];

const RELOCATE_STEP_ORDER: TrainStep[] = [
  TrainStep.Preparing,
  TrainStep.Syncing,
  TrainStep.Restoring,
  TrainStep.CleanUp,
];

const FAILOVER_STEP_MAP: StepMap = {
  [TrainStep.Preparing]: PREPARING_STATUSES,
  [TrainStep.Failover]: [
    'FailingOverToCluster',
    'RunningFinalSync',
    'FinalSyncComplete',
    'EnsuringVolumesAreSecondary',
  ],
  [TrainStep.Restoring]: [
    'WaitingForResourceRestore',
    'EnsuringVolSyncSetup',
    'SettingUpVolSyncDest',
    'WaitForReadiness',
    'UpdatedPlacement',
    'CreatingMW',
    'UpdatingPlRule',
  ],
  [TrainStep.CleanUp]: CLEANUP_STATUSES,
  [TrainStep.Syncing]: [],
};

const RELOCATE_STEP_MAP: StepMap = {
  [TrainStep.Preparing]: PREPARING_STATUSES,
  [TrainStep.Syncing]: [
    'RunningFinalSync',
    'FinalSyncComplete',
    'EnsuringVolumesAreSecondary',
    'EnsuringVolSyncSetup',
    'SettingUpVolSyncDest',
  ],
  [TrainStep.Restoring]: [
    'WaitingForResourceRestore',
    'WaitForReadiness',
    'UpdatedPlacement',
    'CreatingMW',
    'UpdatingPlRule',
  ],
  [TrainStep.CleanUp]: CLEANUP_STATUSES,
  [TrainStep.Failover]: [],
};

const getProgressionStepFromMap = (
  progression: string,
  stepOrder: TrainStep[],
  stepMap: StepMap
): TrainStep => {
  return (
    stepOrder.find((step) =>
      stepMap[step]?.some((status) => progression.includes(status))
    ) || stepOrder[0]
  );
};

export const getTrainSteps = (
  action: DRActionType,
  currentProgression: string
): ProgressionStep[] => {
  const isFailover = action === DRActionType.FAILOVER;
  const stepOrder = isFailover ? FAILOVER_STEP_ORDER : RELOCATE_STEP_ORDER;
  const stepMap = isFailover ? FAILOVER_STEP_MAP : RELOCATE_STEP_MAP;

  const currentStep = getProgressionStepFromMap(
    currentProgression,
    stepOrder,
    stepMap
  );

  const currentIndex = stepOrder.indexOf(currentStep);

  return stepOrder.map((step, index) => ({
    label: step,
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
  currentProgression: string;
  targetCluster: string;
  applicationName: string;
  actionStartTime?: string;
  progressionDetails?: string[];
  isCleanupRequired?: boolean;
  primaryCluster?: string;
  learnMoreHref?: string;
};

export const ProgressionTrainView: React.FC<ProgressionTrainViewProps> = ({
  action,
  currentProgression,
  targetCluster: _targetCluster,
  applicationName,
  actionStartTime,
  progressionDetails,
  isCleanupRequired,
  primaryCluster,
  learnMoreHref,
}) => {
  const { t } = useCustomTranslation();
  const [isDetailsExpanded, setIsDetailsExpanded] = React.useState(false);

  const steps = getTrainSteps(action, currentProgression);
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
          {completedSteps} {t('of')} {totalSteps} {t('steps completed')}
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

      {isCleanupRequired && (
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
            {t(
              'Go to the cloned repository for {{appName}} on the primary cluster {{cluster}} and delete the application.',
              { appName: applicationName, cluster: primaryCluster }
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
