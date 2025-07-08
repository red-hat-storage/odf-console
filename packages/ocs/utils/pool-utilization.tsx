import * as React from 'react';
import { HealthState } from '@openshift-console/dynamic-plugin-sdk';
import { global_danger_color_100 as dangerColor } from '@patternfly/react-tokens/dist/js/global_danger_color_100';
import { global_warning_color_100 as warningColor } from '@patternfly/react-tokens/dist/js/global_warning_color_100';
import { TFunction } from 'react-i18next';
import {
  ExclamationTriangleIcon,
  ExclamationCircleIcon,
} from '@patternfly/react-icons';

export const POOL_NEAR_FULL_THRESHOLD = 85; // Warning at 85%
export const POOL_FULL_THRESHOLD = 95; // Critical at 95%

export enum PoolUtilizationState {
  NORMAL = 'NORMAL',
  NEAR_FULL = 'NEAR_FULL',
  FULL = 'FULL',
}

export type PoolUtilizationInfo = {
  state: PoolUtilizationState;
  severity: HealthState;
  icon: React.ReactElement;
  message: string;
  actionableMessage?: string;
};

export const getPoolUtilizationState = (
  utilizationPercentage: number,
  t: TFunction
): PoolUtilizationInfo => {
  if (utilizationPercentage >= POOL_FULL_THRESHOLD) {
    return {
      state: PoolUtilizationState.FULL,
      severity: HealthState.ERROR,
      icon: <ExclamationCircleIcon style={{ color: dangerColor.value }} />,
      message: t('Pool nearly full'),
      actionableMessage: t(
        'Storage pool nearly full. Add Device class to avoid disruptions'
      ),
    };
  }

  if (utilizationPercentage >= POOL_NEAR_FULL_THRESHOLD) {
    return {
      state: PoolUtilizationState.NEAR_FULL,
      severity: HealthState.WARNING,
      icon: <ExclamationTriangleIcon style={{ color: warningColor.value }} />,
      message: t('Pool needs attention'),
      actionableMessage: t(
        'Pools with usage over 95% may require immediate action to prevent issues.'
      ),
    };
  }

  return {
    state: PoolUtilizationState.NORMAL,
    severity: HealthState.OK,
    icon: null,
    message: t('Utilization is good!'),
  };
};

export const getPoolUtilizationPercentage = (
  poolUtilizationMetrics: any,
  poolName: string
): number => {
  const utilization = poolUtilizationMetrics?.[poolName];
  return utilization ? parseFloat(utilization) : 0;
};

export const hasPoolsNeedingAttention = (
  poolUtilizationMetrics: any,
  poolNames: string[]
): boolean => {
  return poolNames.some((poolName) => {
    const utilization = getPoolUtilizationPercentage(
      poolUtilizationMetrics,
      poolName
    );
    return utilization >= POOL_NEAR_FULL_THRESHOLD;
  });
};

export const getGlobalPoolUtilizationSeverity = (
  poolUtilizationMetrics: any,
  poolNames: string[]
): HealthState => {
  let maxSeverity = HealthState.OK;
  poolNames.forEach((poolName) => {
    const utilization = getPoolUtilizationPercentage(
      poolUtilizationMetrics,
      poolName
    );
    const utilizationInfo = getPoolUtilizationState(utilization, (key) => key);

    if (utilizationInfo.severity === HealthState.ERROR) {
      maxSeverity = HealthState.ERROR;
    } else if (
      utilizationInfo.severity === HealthState.WARNING &&
      maxSeverity !== HealthState.ERROR
    ) {
      maxSeverity = HealthState.WARNING;
    }
  });

  return maxSeverity;
};
