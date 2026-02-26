import * as React from 'react';
import { Skeleton } from '@patternfly/react-core';

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
          <div className="pf-v6-u-display-flex pf-v6-u-justify-content-space-between">
            {Array.from({ length: columns }).map((_item2, index2) => (
              <Skeleton
                key={index1 + index2}
                width="80%"
                className="pf-v6-u-mx-xl"
              />
            ))}
          </div>
          <br />
        </div>
      ))}
    </>
  );
};
