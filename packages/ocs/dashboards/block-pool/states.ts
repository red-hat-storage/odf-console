import { HealthState } from '@openshift-console/dynamic-plugin-sdk';
import { global_danger_color_100 as dangerColor } from '@patternfly/react-tokens/dist/js/global_danger_color_100';
import { global_danger_color_300 as veryDangerColor } from '@patternfly/react-tokens/dist/js/global_danger_color_300';
import { global_disabled_color_100 as disabledColor } from '@patternfly/react-tokens/dist/js/global_disabled_color_100';
import { global_palette_blue_300 as blueInfoColor } from '@patternfly/react-tokens/dist/js/global_palette_blue_300';
import { global_palette_green_500 as okColor } from '@patternfly/react-tokens/dist/js/global_palette_green_500';
import { global_warning_color_100 as warningColor } from '@patternfly/react-tokens/dist/js/global_warning_color_100';
import { TFunction } from 'react-i18next';
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
