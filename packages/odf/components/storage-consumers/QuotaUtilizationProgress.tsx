import * as React from 'react';
import * as _ from 'lodash-es';
import {
  Progress,
  ProgressMeasureLocation,
  ProgressVariant,
} from '@patternfly/react-core';

type StorageQuotaUtilizationProps = {
  storageQuota: number;
  quotaUtilizationRatio: number;
};

export const StorageQuotaUtilizationProgress: React.FC<StorageQuotaUtilizationProps> =
  ({ storageQuota, quotaUtilizationRatio }) => {
    const usagePercentage = quotaUtilizationRatio * 100;
    const usedAmount = storageQuota * quotaUtilizationRatio;
    const variant = usagePercentage > 80 ? ProgressVariant.warning : undefined;
    const isValid =
      _.isNumber(storageQuota) && _.isNumber(quotaUtilizationRatio);
    return isValid ? (
      <Progress
        value={usedAmount}
        measureLocation={ProgressMeasureLocation.inside}
        variant={variant}
        max={storageQuota}
        size="sm"
      />
    ) : (
      <>-</>
    );
  };
