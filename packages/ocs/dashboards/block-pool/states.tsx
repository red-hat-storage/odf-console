import * as React from 'react';
import { GrayUnknownIcon } from '@odf/shared/status/icons';
import { GreenCheckCircleIcon, RedExclamationCircleIcon, YellowExclamationTriangleIcon } from '@openshift-console/dynamic-plugin-sdk';
import { TFunction } from 'i18next';
import { ImageStates } from '../../types';

export const ImageStateLegendMap = (t: TFunction): { [state in ImageStates]: string } => ({
  [ImageStates.STARTING_REPLAY]: t('Start replay'),
  [ImageStates.STOPPING_REPLAY]: t('Stop reply'),
  [ImageStates.REPLAYING]: t('Replaying'),
  [ImageStates.STOPPED]: t('Stopped'),
  [ImageStates.ERROR]: t('Error'),
  [ImageStates.SYNCING]: t('Syncing'),
  [ImageStates.UNKNOWN]: t('Unknown'),
});

enum ImageHealth {
  OK = 'OK',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  UNKNOWN = 'UNKNOWN',
}

export const healthStateMapping: { [key in ImageHealth]: HealthMappingValues } = {
  [ImageHealth.OK]: {
    health: ImageHealth.OK,
    icon: <GreenCheckCircleIcon />,
  },
  [ImageHealth.UNKNOWN]: {
    health: ImageHealth.UNKNOWN,
    icon: <GrayUnknownIcon />,
  },
  [ImageHealth.WARNING]: {
    health: ImageHealth.WARNING,
    icon: <YellowExclamationTriangleIcon />,
  },
  [ImageHealth.ERROR]: {
    health: ImageHealth.ERROR,
    icon: <RedExclamationCircleIcon />,
  },
};

type HealthMappingValues = {
  icon: React.ReactNode;
  health: ImageHealth;
};
