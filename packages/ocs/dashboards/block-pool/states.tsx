import * as React from 'react';
import { GrayUnknownIcon } from '@odf/shared/status/icons';
import {
  GreenCheckCircleIcon,
  RedExclamationCircleIcon,
  YellowExclamationTriangleIcon,
} from '@openshift-console/dynamic-plugin-sdk';
import { global_danger_color_100 as dangerColor } from '@patternfly/react-tokens/dist/js/global_danger_color_100';
import { global_danger_color_300 as veryDangerColor } from '@patternfly/react-tokens/dist/js/global_danger_color_300';
import { global_disabled_color_100 as disabledColor } from '@patternfly/react-tokens/dist/js/global_disabled_color_100';
import { global_palette_blue_300 as blueInfoColor } from '@patternfly/react-tokens/dist/js/global_palette_blue_300';
import { global_palette_green_500 as okColor } from '@patternfly/react-tokens/dist/js/global_palette_green_500';
import { global_warning_color_100 as warningColor } from '@patternfly/react-tokens/dist/js/global_warning_color_100';
import { TFunction } from 'i18next';
import { ImageStates } from '../../types';

export const ImageStateLegendMap = (
  t: TFunction
): { [state in ImageStates]: string } => ({
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

export const healthStateMapping: { [key in ImageHealth]: HealthMappingValues } =
  {
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

export const getColor = (status) => {
  switch (status) {
    case ImageStates.STARTING_REPLAY:
      return okColor.value;
    case ImageStates.REPLAYING:
      return blueInfoColor.value;
    case ImageStates.STOPPING_REPLAY:
      return warningColor.value;
    case ImageStates.STOPPED:
      return dangerColor.value;
    case ImageStates.ERROR:
      return veryDangerColor.value;
    case ImageStates.UNKNOWN:
      return disabledColor.value;
  }
};
