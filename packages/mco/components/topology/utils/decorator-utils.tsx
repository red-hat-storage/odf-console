import * as React from 'react';
import { Tooltip } from '@patternfly/react-core';
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
  InfoCircleIcon,
  InProgressIcon,
} from '@patternfly/react-icons';
import {
  Node,
  Decorator,
  DEFAULT_DECORATOR_RADIUS,
  getDefaultShapeDecoratorCenter,
} from '@patternfly/react-topology';
import { DecoratorIcon, TopologyDecorator, TopologyNodeData } from '../types';
import './decorator-utils.scss';

/**
 * Maps icon string identifiers to their corresponding React icon components
 */
export const getDecoratorIcon = (icon: DecoratorIcon): React.ReactNode => {
  switch (icon) {
    case DecoratorIcon.CheckCircle:
      return (
        <CheckCircleIcon
          style={{ fill: 'var(--pf-t--global--color--status--success--100)' }}
        />
      );
    case DecoratorIcon.ExclamationCircle:
      return (
        <ExclamationCircleIcon
          style={{ fill: 'var(--pf-t--global--color--status--danger--100)' }}
        />
      );
    case DecoratorIcon.ExclamationTriangle:
      return (
        <ExclamationTriangleIcon
          style={{ fill: 'var(--pf-t--global--color--status--warning--100)' }}
        />
      );
    case DecoratorIcon.InProgress:
      return (
        <g className="mco-decorator-icon--spinning">
          <InProgressIcon
            style={{ fill: 'var(--pf-t--global--color--status--info--100)' }}
          />
        </g>
      );
    case DecoratorIcon.InfoCircle:
      return (
        <InfoCircleIcon
          style={{ fill: 'var(--pf-t--global--color--status--info--100)' }}
        />
      );
    default:
      return null;
  }
};

/**
 * Component to render a single decorator with stable ref.
 * Uses React.useRef to ensure the ref persists across re-renders,
 * which is necessary for tooltips to work reliably.
 */
export const DecoratorWithTooltip: React.FC<{
  decorator: TopologyDecorator;
  element: Node;
}> = ({ decorator, element }) => {
  const decoratorRef = React.useRef<SVGGElement>(null);
  const { quadrant, icon, tooltip } = decorator;
  const { x, y } = getDefaultShapeDecoratorCenter(quadrant, element);
  const decoratorIcon = icon ? getDecoratorIcon(icon) : null;

  return (
    <>
      <Tooltip content={tooltip} triggerRef={decoratorRef} />
      <Decorator
        innerRef={decoratorRef}
        x={x}
        y={y}
        radius={DEFAULT_DECORATOR_RADIUS}
        showBackground
        icon={decoratorIcon}
      />
    </>
  );
};

/**
 * Renders decorators for topology nodes.
 * Returns null if no decorators are present or if the element
 * is inside a pairing box (to avoid layout issues).
 *
 * @param element - The topology node element
 * @param data - The node's data containing decorators
 * @param skipPairingBoxCheck - If true, skips the pairing box parent check
 */
export const renderDecorators = (
  element: Node,
  data: TopologyNodeData,
  skipPairingBoxCheck = false
): React.ReactNode => {
  const decorators = data.decorators;
  if (!decorators || !Array.isArray(decorators) || decorators.length === 0) {
    return null;
  }

  // Don't render decorators if this element is a child of a pairing box
  // PatternFly Topology's layout system doesn't handle nested group decorators well
  if (!skipPairingBoxCheck) {
    const parent = element.getParent();
    if (parent) {
      const parentData = parent.getData();
      // Check both data property and type for robustness
      if (parentData?.isPairingBox || parent.getType() === 'pairing-box') {
        return null;
      }
    }
  }

  return (
    <>
      {decorators.map((decorator, index) => (
        <DecoratorWithTooltip
          key={`decorator-${index}`}
          decorator={decorator}
          element={element}
        />
      ))}
    </>
  );
};
