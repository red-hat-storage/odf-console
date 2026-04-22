import { DRStatus } from '@odf/mco/utils/dr-status';
import { NodeStatus, TopologyQuadrant } from '@patternfly/react-topology';
import { Phase, Progression } from '../../../types/ramen';
import { DecoratorIcon, TopologyDecorator } from '../types';

/**
 * Determines decorator properties based on DR status
 * Centralized logic to avoid duplication across node generation
 */
export const getDecoratorForStatus = (
  drStatus: string,
  quadrant: TopologyQuadrant = TopologyQuadrant.upperRight
): TopologyDecorator => {
  let icon: DecoratorIcon;
  let tooltip = drStatus;
  let status = NodeStatus.default;

  switch (drStatus) {
    case DRStatus.Critical:
    case DRStatus.ProtectionError:
    case DRStatus.Unknown:
    case Progression.FailedToFailover:
    case Progression.FailedToRelocate:
      icon = DecoratorIcon.ExclamationCircle;
      tooltip = drStatus;
      status = NodeStatus.danger;
      break;
    case DRStatus.Healthy:
    case DRStatus.Available:
    case DRStatus.Relocated:
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
    case Progression.CleaningUp:
      icon = DecoratorIcon.InProgress;
      tooltip = `${drStatus}...`;
      status = NodeStatus.info;
      break;
    case DRStatus.WaitOnUserToCleanUp:
    case DRStatus.WaitForUser:
    case Progression.WaitForUserAction:
      icon = DecoratorIcon.InfoCircle;
      tooltip = 'Action required';
      status = NodeStatus.info;
      break;
    case DRStatus.FailedOver:
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
