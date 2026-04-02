import * as React from 'react';
import { Card, CardBody, CardTitle } from '@patternfly/react-core';
import { ProgressStep, ProgressStepper } from '@patternfly/react-core';
import { CheckCircleIcon, InProgressIcon } from '@patternfly/react-icons';
import { Edge } from '@patternfly/react-topology';
import { ActiveDROperation } from '../../../hooks/useActiveDROperations';
import { getTrainSteps } from '../../dr-status-popover/progression-train-view';
import './EdgeProgressionOverlay.scss';

export type EdgeProgressionOverlayProps = {
  edge: Edge;
  activeOperations: ActiveDROperation[];
};

enum StepStatus {
  Completed = 'completed',
  InProgress = 'in-progress',
  Pending = 'pending',
}

/**
 * Calculates the midpoint between two points
 */
const getMidpoint = (
  start: { x: number; y: number },
  end: { x: number; y: number }
): { x: number; y: number } => ({
  x: (start.x + end.x) / 2,
  y: (start.y + end.y) / 2,
});

/**
 * Component that renders active DR operation progression on the edge
 */
export const EdgeProgressionOverlay: React.FC<EdgeProgressionOverlayProps> = ({
  edge,
  activeOperations,
}) => {
  if (!activeOperations || activeOperations.length === 0) {
    return null;
  }

  const source = edge.getSource();
  const target = edge.getTarget();

  if (!source || !target) {
    return null;
  }

  const sourceBounds = source.getBounds();
  const targetBounds = target.getBounds();

  // Calculate midpoint
  const sourceCenter = {
    x: sourceBounds.x + sourceBounds.width / 2,
    y: sourceBounds.y + sourceBounds.height / 2,
  };
  const targetCenter = {
    x: targetBounds.x + targetBounds.width / 2,
    y: targetBounds.y + targetBounds.height / 2,
  };
  const midpoint = getMidpoint(sourceCenter, targetCenter);

  // For now, show the first operation (can be enhanced to show all)
  const operation = activeOperations[0];
  const steps = getTrainSteps(
    operation.action,
    operation.progression,
    operation.isDiscoveredApp
  );

  const completedSteps = steps.filter(
    (s) => s.status === StepStatus.Completed
  ).length;
  const totalSteps = steps.length;

  // Calculate position for the overlay (centered on midpoint)
  const overlayWidth = 300;
  const overlayHeight = 150;
  const x = midpoint.x - overlayWidth / 2;
  const y = midpoint.y - overlayHeight / 2;

  return (
    <g className="edge-progression-overlay">
      {/* Foreign object to render HTML content */}
      <foreignObject
        x={x}
        y={y}
        width={overlayWidth}
        height={overlayHeight}
        className="edge-progression-overlay__foreign-object"
      >
        <Card className="edge-progression-overlay__card" isCompact>
          <CardTitle className="edge-progression-overlay__title">
            <div className="edge-progression-overlay__app-name">
              {operation.applicationName}
            </div>
            <div className="edge-progression-overlay__action">
              {operation.action} → {operation.targetCluster}
            </div>
            <div className="edge-progression-overlay__progress">
              {completedSteps} of {totalSteps} steps
            </div>
          </CardTitle>
          <CardBody className="edge-progression-overlay__body">
            <ProgressStepper isCenterAligned isCompact>
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
                  id={`edge-step-${index}`}
                  titleId={`edge-step-${index}-title`}
                  aria-label={step.label}
                  isCurrent={step.status === StepStatus.InProgress}
                  icon={
                    step.status === StepStatus.Completed ? (
                      <CheckCircleIcon />
                    ) : step.status === StepStatus.InProgress ? (
                      <InProgressIcon className="edge-progression-overlay__in-progress-icon" />
                    ) : undefined
                  }
                >
                  {step.label}
                </ProgressStep>
              ))}
            </ProgressStepper>
          </CardBody>
        </Card>
      </foreignObject>
    </g>
  );
};
