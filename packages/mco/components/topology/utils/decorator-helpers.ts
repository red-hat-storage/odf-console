import { NodeStatus, TopologyQuadrant } from '@patternfly/react-topology';
import { DecoratorIcon, TopologyDecorator } from '../types';

/**
 * Determines decorator properties based on phase/status
 * Centralized logic to avoid duplication across node generation
 */
export const getDecoratorForPhase = (
  phase: string,
  quadrant: TopologyQuadrant = TopologyQuadrant.upperRight
): TopologyDecorator | undefined => {
  let icon: DecoratorIcon | undefined;
  let tooltip = phase;
  let status = NodeStatus.default;

  switch (phase) {
    case 'Critical':
      icon = DecoratorIcon.ExclamationCircle;
      tooltip = 'Critical';
      status = NodeStatus.danger;
      break;
    case 'Completed':
    case 'Available':
      icon = DecoratorIcon.CheckCircle;
      tooltip = phase;
      status = NodeStatus.success;
      break;
    case 'FailingOver':
    case 'Relocating':
    case 'Initiating':
    case 'Deploying':
      icon = DecoratorIcon.InProgress;
      tooltip = `${phase}...`;
      status = NodeStatus.info;
      break;
    case 'FailedOver':
      icon = DecoratorIcon.ExclamationTriangle;
      tooltip = 'FailedOver';
      status = NodeStatus.warning;
      break;
    default:
      // For unknown phases, show warning
      if (phase !== 'Unknown') {
        icon = DecoratorIcon.ExclamationTriangle;
        tooltip = phase;
        status = NodeStatus.warning;
      }
      break;
  }

  if (!icon) {
    return undefined;
  }

  return {
    quadrant,
    icon,
    tooltip,
    status,
  };
};
