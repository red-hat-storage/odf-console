import { HealthState } from '@openshift-console/dynamic-plugin-sdk';
import { TFunction } from 'react-i18next';
import { t_global_color_status_danger_100 as dangerColor } from '@patternfly/react-tokens';
import { t_global_color_status_danger_300 as veryDangerColor } from '@patternfly/react-tokens';
import { t_global_color_disabled_100 as disabledColor } from '@patternfly/react-tokens';
import { t_color_blue_40 as blueInfoColor } from '@patternfly/react-tokens';
import { t_color_green_50 as okColor } from '@patternfly/react-tokens';
import { t_global_color_status_warning_100 as warningColor } from '@patternfly/react-tokens';
import { ImageStates } from '../../types';

export const ImageStateLegendMap = (
  t: TFunction
): { [state in ImageStates]: string } => ({
  [ImageStates.STARTING_REPLAY]: t('Starting replay'),
  [ImageStates.STOPPING_REPLAY]: t('Stopping replay'),
  [ImageStates.REPLAYING]: t('Replaying'),
  [ImageStates.STOPPED]: t('Stopped'),
  [ImageStates.ERROR]: t('Error'),
  [ImageStates.SYNCING]: t('Syncing'),
  [ImageStates.UNKNOWN]: t('Unknown'),
});

export const MirroringImageHealthMap = {
  0: HealthState.OK,
  1: HealthState.UNKNOWN,
  2: HealthState.WARNING,
  3: HealthState.ERROR,
};

export const healthStateMessage = (
  state: keyof typeof HealthState,
  t: TFunction
): string => {
  switch (state) {
    case HealthState.OK:
      return t('Ok');
    case HealthState.UNKNOWN:
      return t('Unknown');
    case HealthState.WARNING:
      return t('Warning');
    case HealthState.ERROR:
      return t('Error');
    default:
      return '-';
  }
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
