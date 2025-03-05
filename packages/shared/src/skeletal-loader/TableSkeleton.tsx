import * as React from 'react';
import { Skeleton } from '@patternfly/react-core';
import './tableSkeleton.scss';

type SkeletalLoaderProps = {
  // Defaults to 3
  columns?: number;
  // Defaults to 5
  rows?: number;
};
export const TableSkeletonLoader: React.FC<SkeletalLoaderProps> = ({
  columns = 3,
  rows = 5,
}) => {
  return (
    <>
      {Array.from({ length: rows }).map((_item1, index1) => (
        <div>
          <div className="odf-skeleton-table__skeletal-loader">
            {Array.from({ length: columns }).map((_item2, index2) => (
              <Skeleton
                key={index1 + index2}
                width="80%"
                className="odf-skeleton-table-skeletal-loader__item"
              />
            ))}
          </div>
          <br />
        </div>
      ))}
    </>
  );
};
