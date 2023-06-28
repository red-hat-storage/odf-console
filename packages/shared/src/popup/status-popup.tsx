import * as React from 'react';
import './status-popup.scss';

export const StatusPopupSection: React.FC<StatusPopupSectionProps> = ({
  firstColumn,
  secondColumn,
  children,
}) => (
  <>
    <div className="odf-status-popup__row odf-status-popup__section">
      <div className="odf-status-popup__text--bold">{firstColumn}</div>
      {secondColumn && <div className="text-secondary">{secondColumn}</div>}
    </div>
    {children}
  </>
);

export const Status: React.FC<StatusProps> = ({ value, icon, children }) => (
  <div className="odf-status-popup__row" data-test="operator-status">
    {children}
    {value ? (
      <div className="odf-status-popup__status">
        <div>
          <span data-test="operator-status-value">{icon}</span>
          <span
            className="text-secondary odf-status-popup__text"
            data-test="operator-status-icon"
          >
            {value}
          </span>
        </div>
      </div>
    ) : (
      icon && (
        <div className="odf-status-popup__status">
          <div
            className="odf-status-popup__icon"
            data-test="operator-status-icon"
          >
            {icon}
          </div>
        </div>
      )
    )}
  </div>
);

type StatusProps = {
  children: React.ReactNode;
  value?: string;
  icon?: React.ReactNode;
};

type StatusPopupSectionProps = {
  firstColumn: string;
  secondColumn?: string;
};

export default Status;
