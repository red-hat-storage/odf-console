import * as React from 'react';
import { Flex } from '@patternfly/react-core';
import { Popover } from '@patternfly/react-core';
import { Button } from '@patternfly/react-core';
import {
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
} from '@patternfly/react-icons';
import { PoolUtilizationPopoverContent } from '../dashboards/persistent-internal/pool-utilization-card/PoolUtilizationPopoverContent';
import { StoragePoolTableData } from '../dashboards/persistent-internal/pool-utilization-card/types';

export const PoolUtilizationDisplay: React.FC<{
  pool: StoragePoolTableData;
  usedCapacityDisplay: string;
  utilizationPercentage: number;
  isCritical: boolean;
  isWarning: boolean;
  needsAttention: boolean;
  totalCapacity: string;
}> = ({
  pool,
  usedCapacityDisplay,
  utilizationPercentage,
  isCritical,
  isWarning,
  needsAttention,
  totalCapacity,
}) => {
  if (!needsAttention) {
    return <>{usedCapacityDisplay}</>;
  }

  return (
    <Popover
      aria-label="Pool utilization information"
      bodyContent={
        <PoolUtilizationPopoverContent
          pool={
            {
              ...pool,
              utilization: utilizationPercentage,
              usedCapacity: usedCapacityDisplay,
              totalCapacity: totalCapacity,
              critical: isCritical,
              warning: isWarning,
            } as StoragePoolTableData
          }
        />
      }
      hasAutoWidth
      triggerAction="hover"
    >
      <Button variant="link" className="pf-v6-u-text-align-left pf-v6-u-w-100">
        <Flex
          alignItems={{ default: 'alignItemsCenter' }}
          spaceItems={{ default: 'spaceItemsSm' }}
        >
          {isCritical ? (
            <ExclamationCircleIcon className="pf-v6-u-danger-color-100" />
          ) : (
            <ExclamationTriangleIcon className="pf-v6-u-warning-color-100" />
          )}
          <span className="pf-v6-u-word-break-break-word">
            {usedCapacityDisplay} ({utilizationPercentage.toFixed(1)}%)
          </span>
        </Flex>
      </Button>
    </Popover>
  );
};
