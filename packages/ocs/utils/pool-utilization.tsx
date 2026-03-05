import * as React from 'react';
import { HealthState } from '@openshift-console/dynamic-plugin-sdk';
import { TFunction } from 'react-i18next';
import {
  ExclamationTriangleIcon,
  ExclamationCircleIcon,
  CheckCircleIcon,
} from '@patternfly/react-icons';
import { t_global_color_status_warning_default as warningColor } from '@patternfly/react-tokens';
import { t_global_color_status_success_default as successColor } from '@patternfly/react-tokens';
import { t_global_color_status_danger_default as dangerColor } from '@patternfly/react-tokens';
import {
  POOL_NEAR_FULL_THRESHOLD,
  POOL_FULL_THRESHOLD,
  PoolUtilizationState,
} from '../constants';
import { PoolMetrics } from '../types';

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
  poolUtilizationMetrics: PoolMetrics,
  poolName: string
): number => {
  const utilization = poolUtilizationMetrics?.[poolName];
  return utilization ? parseFloat(utilization) : 0;
};
