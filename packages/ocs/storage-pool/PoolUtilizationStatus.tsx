import * as React from 'react';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { global_palette_green_500 as okColor } from '@patternfly/react-tokens/dist/js/global_palette_green_500';
import { CheckCircleIcon } from '@patternfly/react-icons';
import {
  getPoolUtilizationState,
  PoolUtilizationState,
} from '../utils/pool-utilization';

type PoolUtilizationStatusProps = {
  utilizationPercentage: number;
  showOptimalStatus?: boolean;
};

export const PoolUtilizationStatus: React.FC<PoolUtilizationStatusProps> = ({
  utilizationPercentage,
  showOptimalStatus = false,
}) => {
  const { t } = useCustomTranslation();
  const utilizationInfo = getPoolUtilizationState(utilizationPercentage, t);

  if (
    utilizationInfo.state === PoolUtilizationState.NORMAL &&
    !showOptimalStatus
  ) {
    return null;
  }

  if (
    utilizationInfo.state === PoolUtilizationState.NORMAL &&
    showOptimalStatus
  ) {
    return (
      <div className="co-icon-and-text">
        <CheckCircleIcon style={{ color: okColor.value }} />
        <span>{utilizationInfo.message}</span>
      </div>
    );
  }

  return (
    <div className="co-icon-and-text">
      {utilizationInfo.icon}
      <span>{utilizationInfo.message}</span>
    </div>
  );
};
