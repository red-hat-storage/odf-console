import * as React from 'react';
import { HealthState } from '@openshift-console/dynamic-plugin-sdk';
import { global_danger_color_100 as dangerColor } from '@patternfly/react-tokens/dist/js/global_danger_color_100';
import { global_success_color_100 as successColor } from '@patternfly/react-tokens/dist/js/global_success_color_100';
import { global_warning_color_100 as warningColor } from '@patternfly/react-tokens/dist/js/global_warning_color_100';
import { TFunction } from 'react-i18next';
import {
  ExclamationTriangleIcon,
  ExclamationCircleIcon,
  CheckCircleIcon,
} from '@patternfly/react-icons';

export const POOL_NEAR_FULL_THRESHOLD = 70; // percent
export const POOL_FULL_THRESHOLD = 90; // percent

export enum PoolUtilizationState {
  NORMAL = 'NORMAL',
  NEAR_FULL = 'NEAR_FULL',
  FULL = 'FULL',
}

type PoolUtilizationInfo = {
  state: PoolUtilizationState;
  severity: HealthState;
  icon: React.ReactNode;
  message: string;
  actionableMessage?: string;
};

export const getPoolUtilizationState = (
  utilization: number,
  t: TFunction
): PoolUtilizationInfo => {
  const utilizationPercentage = Math.round(utilization);

  if (utilizationPercentage >= POOL_FULL_THRESHOLD) {
    return {
      state: PoolUtilizationState.FULL,
      severity: HealthState.ERROR,
      icon: <ExclamationCircleIcon style={{ color: dangerColor.value }} />,
      message: t('Storage pool critically full'),
      actionableMessage: t(
        'Storage pool critically full. Add capacity to avoid disruptions'
      ),
    };
  }

  if (utilizationPercentage >= POOL_NEAR_FULL_THRESHOLD) {
    return {
      state: PoolUtilizationState.NEAR_FULL,
      severity: HealthState.WARNING,
      icon: <ExclamationTriangleIcon style={{ color: warningColor.value }} />,
      message: t('Storage pool needs attention'),
      actionableMessage: t('Monitor pool utilization and plan for expansion'),
    };
  }

  return {
    state: PoolUtilizationState.NORMAL,
    severity: HealthState.OK,
    icon: <CheckCircleIcon style={{ color: successColor.value }} />,
    message: t('Pool utilization is good'),
  };
};

export const getPoolUtilizationPercentage = (
  poolUtilizationMetrics: any,
  poolName: string
): number => {
  const utilization = poolUtilizationMetrics?.[poolName];
  return utilization ? parseFloat(utilization) : 0;
};
