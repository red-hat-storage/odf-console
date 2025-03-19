import * as React from 'react';
import classNames from 'classnames';
import '../style.scss';

type LoadingProps = {
  className?: string;
};

const Loading: React.FC<LoadingProps> = ({ className }) => (
  <div
    className={classNames('odf-m-loader', className)}
    data-test="loading-indicator"
  >
    <div className="odf-m-loader-dot__one" />
    <div className="odf-m-loader-dot__two" />
    <div className="odf-m-loader-dot__three" />
  </div>
);
Loading.displayName = 'Loading';

export const LoadingInline: React.FC<{}> = () => (
  <Loading className="odf-m-loader--inline" />
);
