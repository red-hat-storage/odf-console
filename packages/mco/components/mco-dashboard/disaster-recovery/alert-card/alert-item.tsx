import * as React from 'react';
import {
  getAlertDescription,
  getAlertMessage,
  getAlertName,
  getAlertSummary,
  getAlertTime,
  getSeverityIcon,
  getAlertSeverity,
} from '@odf/shared/alert/utils';
import { Timestamp } from '@odf/shared/details-page/timestamp';
import { AlertItem as AlertItemSDK } from '@openshift-console/dynamic-plugin-sdk-internal';
import './alert-item.scss';

export const StatusItem: React.FC<StatusItemProps> = ({
  name,
  Icon,
  timestamp,
  message,
}) => {
  return (
    <div className="mco-status-card__alert-item">
      <div className="mco-status-card__alert-item-icon mco-dashboard-icon">
        <Icon />
      </div>
      <div className="mco-status-card__alert-item-text">
        <div className="mco-status-card__alert-item-message">
          {name && (
            <span className="mco-status-card__alert-item-header">{name}</span>
          )}
          <div
            className="mco-health-card__alert-item-timestamp mco-status-card__health-item-text text-secondary"
            data-test="timestamp"
          >
            {timestamp && <Timestamp simple timestamp={timestamp} />}
          </div>
          <span className="mco-status-card__health-item-text">{message}</span>
        </div>
      </div>
    </div>
  );
};

const AlertItem: React.FC<React.ComponentProps<typeof AlertItemSDK>> = ({
  alert,
}) => {
  const alertName = getAlertName(alert);
  return (
    <StatusItem
      Icon={getSeverityIcon(getAlertSeverity(alert))}
      timestamp={getAlertTime(alert)}
      message={
        getAlertDescription(alert) ||
        getAlertMessage(alert) ||
        getAlertSummary(alert)
      }
      name={alertName}
    />
  );
};

export default AlertItem;

type StatusItemProps = {
  Icon: React.ComponentType<any>;
  timestamp?: string;
  message: string;
  name?: string;
};
