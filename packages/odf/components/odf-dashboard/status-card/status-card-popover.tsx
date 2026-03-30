import * as React from 'react';
import Status, { StatusPopupSection } from '@odf/shared/popup/status-popup';
import { HealthState } from '@openshift-console/dynamic-plugin-sdk';
import { Link } from 'react-router-dom-v5-compat';
import { Flex, FlexItem } from '@patternfly/react-core';
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
} from '@patternfly/react-icons';
import './status-card-popover.scss';

export type ResourceHealthMap = {
  systemName: string;
  healthState: HealthState;
  link?: string;
  extraTexts?: string[];
};

type StatusCardPopoverProps = {
  resourceHealthMap: ResourceHealthMap[];
  firstColumnName: string;
  secondColumnName: string;
};

const healthStateToIcon = {
  [HealthState.OK]: (
    <CheckCircleIcon color="var(--pf-t--global--color--brand--default)" />
  ),
  [HealthState.WARNING]: (
    <ExclamationTriangleIcon color="var(--pf-t--global--color--status--warning--default)" />
  ),
  [HealthState.ERROR]: (
    <ExclamationCircleIcon color="var(--pf-t--global--color--status--danger--default" />
  ),
};

const StatusCardPopover: React.FC<StatusCardPopoverProps> = ({
  resourceHealthMap,
  firstColumnName,
  secondColumnName,
}) => {
  return (
    <StatusPopupSection
      firstColumn={firstColumnName}
      secondColumn={secondColumnName}
    >
      {resourceHealthMap.map((resource) => (
        <Status
          key={resource.systemName}
          icon={healthStateToIcon[resource.healthState]}
        >
          <Flex direction={{ default: 'column' }}>
            <FlexItem className="odf-status-card__popup--margin">
              {resource.link ? (
                <Link to={resource.link}>{resource.systemName}</Link>
              ) : (
                <>{resource.systemName}</>
              )}
            </FlexItem>
            {!!resource.extraTexts && (
              <FlexItem>
                {resource.extraTexts.map((extraText, i) => (
                  <div className="text-muted" key={i}>
                    {extraText}
                  </div>
                ))}
              </FlexItem>
            )}
          </Flex>
        </Status>
      ))}
    </StatusPopupSection>
  );
};

export default StatusCardPopover;
