import * as React from 'react';
import classNames from 'classnames';

type LoadingProps = {
  className?: string;
};

const Loading: React.FC<LoadingProps> = ({ className }) => (
  <div
    className={classNames('co-m-loader co-an-fade-in-out', className)}
    data-test="loading-indicator"
  >
    <div className="co-m-loader-dot__one" />
    <div className="co-m-loader-dot__two" />
    <div className="co-m-loader-dot__three" />
  </div>
);
Loading.displayName = 'Loading';

export const LoadingInline: React.FC<{}> = () => (
  <Loading className="co-m-loader--inline" />
);
