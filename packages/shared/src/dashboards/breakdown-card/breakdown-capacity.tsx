import * as React from 'react';
import classNames from 'classnames';
import './breakdown-card.scss';

export const TotalCapacityBody: React.FC<TotalCapacityBodyProps> = ({
  capacity,
  prefix,
  suffix,
  className,
  styleCapacityAsBold,
}) => {
  return (
    <p
      className={classNames(
        'capacity-breakdown-card__capacity-body',
        className
      )}
    >
      {prefix} {styleCapacityAsBold ? <strong>{capacity}</strong> : capacity}{' '}
      {suffix}
    </p>
  );
};

type TotalCapacityBodyProps = {
  capacity: string;
  prefix?: string;
  suffix?: string;
  className?: string;
  styleCapacityAsBold?: boolean;
};
