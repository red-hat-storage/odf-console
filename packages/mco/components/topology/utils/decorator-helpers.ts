import { DRStatus } from '@odf/mco/utils/dr-status';
import { NodeStatus, TopologyQuadrant } from '@patternfly/react-topology';
import { Phase, Progression } from '../../../types/ramen';
import { DecoratorIcon, TopologyDecorator } from '../types';

// Fixed tooltip keys shared with decorator-utils localization.
// Adding a key here without a Record entry in decorator-utils is a type error.
export enum DecoratorTooltipKey {
  Preparing = 'Preparing',
  AwaitingResync = 'Awaiting resync',
  ActionRequired = 'Action required',
  UserActionRequired = 'User action required',
}

/**
 * Determines decorator properties based on DR status
 * Centralized logic to avoid duplication across node generation
 */
export const getDecoratorForStatus = (
  drStatus: string,
  quadrant: TopologyQuadrant = TopologyQuadrant.upperRight
): TopologyDecorator => {
  let icon: DecoratorIcon;
  let tooltip: string = drStatus;
  let status = NodeStatus.default;

  switch (drStatus) {
    case DRStatus.WaitOnUserToCleanUp:
    case DRStatus.WaitForUser:
      icon = DecoratorIcon.UserAction;
      tooltip = DecoratorTooltipKey.UserActionRequired;
      status = NodeStatus.default;
      break;
    case DRStatus.Critical:
    case DRStatus.ProtectionError:
    case DRStatus.Unknown:
      icon = DecoratorIcon.ExclamationCircle;
      tooltip = drStatus;
      status = NodeStatus.danger;
      break;
    case Progression.WaitForUserAction:
      icon = DecoratorIcon.ExclamationCircle;
      tooltip = DecoratorTooltipKey.ActionRequired;
      status = NodeStatus.danger;
      break;
    case DRStatus.Healthy:
    case DRStatus.Available:
    case DRStatus.Relocated:
    case DRStatus.FailedOver:
    case Phase.Deployed:
    case Progression.Completed:
      icon = DecoratorIcon.CheckCircle;
      tooltip = drStatus;
      status = NodeStatus.success;
      break;
    case DRStatus.FailingOver:
    case DRStatus.Relocating:
    case DRStatus.Deleting:
    case DRStatus.Protecting:
    case Phase.Initiating:
    case Phase.Deploying:
    case DRStatus.CleaningUp:
      icon = DecoratorIcon.InProgress;
      tooltip = `${drStatus}...`;
      status = NodeStatus.info;
      break;
    case DRStatus.TestingFailover:
      icon = DecoratorIcon.InProgress;
      // Same label keys as the popover / sidebar (translated at render).
      tooltip = DecoratorTooltipKey.Preparing;
      status = NodeStatus.info;
      break;
    case DRStatus.TestFailoverPaused:
      icon = DecoratorIcon.Clock;
      tooltip = DecoratorTooltipKey.AwaitingResync;
      status = NodeStatus.info;
      break;
    case DRStatus.TestFailoverActionRequired:
      icon = DecoratorIcon.UserAction;
      tooltip = DecoratorTooltipKey.UserActionRequired;
      status = NodeStatus.default;
      break;
    case DRStatus.Warning:
      icon = DecoratorIcon.ExclamationTriangle;
      tooltip = drStatus;
      status = NodeStatus.warning;
      break;
    default:
      icon = DecoratorIcon.ExclamationTriangle;
      tooltip = drStatus;
      status = NodeStatus.warning;
      break;
  }

  return {
    quadrant,
    icon,
    tooltip,
    status,
  };
};
