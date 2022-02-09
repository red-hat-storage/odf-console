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

const Status: React.FC<StatusProps> = ({ value, icon, children }) => (
  <div className="odf-status-popup__row">
    {children}
    {value ? (
      <div className="odf-status-popup__status">
        <div>{icon}</div>
        <div className="text-secondary">{value}</div>
      </div>
    ) : (
      icon && (
        <div className="odf-status-popup__status">
          <div className="odf-status-popup__icon">{icon}</div>
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
