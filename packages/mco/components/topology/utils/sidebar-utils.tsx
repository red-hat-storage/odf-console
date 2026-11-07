import * as React from 'react';
import { DRPlacementControlModel } from '@odf/shared';
import {
  BlueInfoCircleIcon,
  GreenCheckCircleIcon,
  RedExclamationCircleIcon,
  YellowExclamationTriangleIcon,
} from '@odf/shared/status/icons';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { referenceForModel } from '@odf/shared/utils';
import { InProgressIcon } from '@patternfly/react-icons';
import { t_color_blue_40 as blueInfoColor } from '@patternfly/react-tokens';
import { NodeStatus } from '@patternfly/react-topology';
import {
  DRStatus,
  isUserActionRequired as isUserActionRequiredUtil,
} from '../../../utils/dr-status';

export const getAppLink = (name: string, namespace: string) => {
  return `/k8s/ns/${namespace}/${referenceForModel(DRPlacementControlModel)}/${name}`;
};

/**
 * Maps DR status to PatternFly NodeStatus for topology display.
 * Consolidated status classification for consistency across topology components.
 */
export const getDRNodeStatus = (status: DRStatus): NodeStatus => {
  // Success states
  if (
    status === DRStatus.Healthy ||
    status === DRStatus.Available ||
    status === DRStatus.FailedOver ||
    status === DRStatus.Relocated
  ) {
    return NodeStatus.success;
  }

  // In-progress states
  if (
    status === DRStatus.FailingOver ||
    status === DRStatus.Relocating ||
    status === DRStatus.Deleting ||
    status === DRStatus.Protecting ||
    status === DRStatus.TestingFailover ||
    status === DRStatus.TestFailoverPaused ||
    status === DRStatus.TestFailoverActionRequired
  ) {
    return NodeStatus.info;
  }

  // Warning states
  if (status === DRStatus.Warning) {
    return NodeStatus.warning;
  }

  // Danger states (includes user action required — matches protected-applications)
  if (
    status === DRStatus.Critical ||
    status === DRStatus.Unknown ||
    status === DRStatus.ProtectionError ||
    status === DRStatus.WaitOnUserToCleanUp ||
    status === DRStatus.WaitForUser
  ) {
    return NodeStatus.danger;
  }

  // Default to warning for unhandled cases
  // eslint-disable-next-line no-console
  console.warn(`Unhandled DR status in topology: ${status}`);
  return NodeStatus.warning;
};

/**
 * Checks if a DR status requires user action.
 */
export const isDRStatusUserActionRequired = isUserActionRequiredUtil;

export const DRStatusIcon: React.FC<{ status: DRStatus }> = ({ status }) => {
  const { t } = useCustomTranslation();
  // Danger states (includes user action required — matches protected-applications)
  if (
    status === DRStatus.Critical ||
    status === DRStatus.Unknown ||
    status === DRStatus.ProtectionError ||
    status === DRStatus.WaitOnUserToCleanUp ||
    status === DRStatus.WaitForUser
  ) {
    return (
      <>
        <RedExclamationCircleIcon />
        <span>{status}</span>
      </>
    );
  }

  // Success states
  if (
    status === DRStatus.FailedOver ||
    status === DRStatus.Relocated ||
    status === DRStatus.Healthy ||
    status === DRStatus.Available
  ) {
    return (
      <>
        <GreenCheckCircleIcon />
        <span>{status}</span>
      </>
    );
  }

  if (status === DRStatus.TestFailoverActionRequired) {
    return (
      <>
        <BlueInfoCircleIcon />
        <span>{t('Action needed')}</span>
      </>
    );
  }

  if (
    status === DRStatus.TestingFailover ||
    status === DRStatus.TestFailoverPaused
  ) {
    return (
      <>
        <InProgressIcon color={blueInfoColor.value} />
        <span>{t('Preparing')}</span>
      </>
    );
  }

  // In-progress states
  if (
    status === DRStatus.FailingOver ||
    status === DRStatus.Relocating ||
    status === DRStatus.Deleting ||
    status === DRStatus.Protecting
  ) {
    return (
      <>
        <InProgressIcon color={blueInfoColor.value} />
        <span>{status}</span>
      </>
    );
  }

  // Warning states
  if (status === DRStatus.Warning) {
    return (
      <>
        <YellowExclamationTriangleIcon />
        <span>{status}</span>
      </>
    );
  }

  // Default - just show the status text
  return <span>{status}</span>;
};
