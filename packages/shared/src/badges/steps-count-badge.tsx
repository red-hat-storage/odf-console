import * as React from 'react';
import './Badge.scss';

const StepsCountBadge: React.FC<{ stepCount: number | string }> = ({
  stepCount,
}) => {
  return (
    <>
      <span className="sr-only">{stepCount}</span>
      <span className="odf-steps-count-badge">{stepCount}</span>
    </>
  );
};

export default StepsCountBadge;
