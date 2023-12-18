import * as React from 'react';
import {
  GrayUnknownIcon,
  BlueSyncIcon,
  BlueArrowCircleUpIcon,
  GreenCheckCircleIcon,
  RedExclamationCircleIcon,
  YellowExclamationTriangleIcon,
} from '@odf/shared/status/icons';
import { HealthState } from '@openshift-console/dynamic-plugin-sdk';
import { TFunction } from 'i18next';
import { InProgressIcon } from '@patternfly/react-icons';

export const healthStateMap = (state: string) => {
  switch (state) {
    case '0':
      return HealthState.OK;
    case '1':
      return HealthState.WARNING;
    case '2':
      return HealthState.ERROR;
    default:
      return HealthState.LOADING;
  }
};

export const healthStateMessage = (
  state: keyof typeof HealthState,
  t: TFunction
): string => {
  switch (state) {
    case HealthState.OK:
      return '';
    case HealthState.UNKNOWN:
      return t('Unknown');
    case HealthState.PROGRESS:
      return t('Pending');
    case HealthState.UPDATING:
      return t('Updating');
    case HealthState.WARNING:
      return t('Degraded');
    case HealthState.ERROR:
      return t('Degraded');
    case HealthState.LOADING:
      return t('Loading');
    case HealthState.UPGRADABLE:
      return t('Upgrade available');
    case HealthState.NOT_AVAILABLE:
      return t('Not available');
    default:
      return t('Unknown');
  }
};

export const healthStateMapping: {
  [key in HealthState]: HealthStateMappingValues;
} = {
  [HealthState.OK]: {
    priority: 0,
    health: HealthState.OK,
    icon: <GreenCheckCircleIcon title="Healthy" />,
  },
  [HealthState.UNKNOWN]: {
    priority: 1,
    health: HealthState.UNKNOWN,
    icon: <GrayUnknownIcon title="Unknown" />,
  },
  [HealthState.PROGRESS]: {
    priority: 2,
    health: HealthState.PROGRESS,
    icon: <InProgressIcon title="In progress" />,
  },
  [HealthState.UPDATING]: {
    priority: 3,
    health: HealthState.UPDATING,
    icon: <BlueSyncIcon title="Updating" />,
  },
  [HealthState.UPGRADABLE]: {
    priority: 4,
    health: HealthState.UPGRADABLE,
    icon: <BlueArrowCircleUpIcon title="Upgrade available" />,
  },
  [HealthState.WARNING]: {
    priority: 5,
    health: HealthState.WARNING,
    icon: <YellowExclamationTriangleIcon title="Warning" />,
  },
  [HealthState.ERROR]: {
    priority: 6,
    health: HealthState.ERROR,
    icon: <RedExclamationCircleIcon title="Error" />,
  },
  [HealthState.LOADING]: {
    priority: 7,
    health: HealthState.LOADING,
    icon: <div className="skeleton-health" />,
  },
  [HealthState.NOT_AVAILABLE]: {
    priority: 8,
    health: HealthState.NOT_AVAILABLE,
    icon: <GrayUnknownIcon title="Not available" />,
  },
};

export const STATE_PRIORITY = [
  HealthState.NOT_AVAILABLE,
  HealthState.LOADING,
  HealthState.ERROR,
  HealthState.WARNING,
  HealthState.UPGRADABLE,
  HealthState.UPDATING,
  HealthState.PROGRESS,
  HealthState.UNKNOWN,
  HealthState.OK,
];

export type HealthStateMappingValues = {
  icon: React.ReactNode;
  priority: number;
  health: HealthState;
};

export const csvStatusMap = (state: string) => {
  switch (state) {
    // right now "csv_succeeded" only returns 0/1
    case '0':
      return HealthState.ERROR;
    case '1':
      return HealthState.OK;
  }
};
