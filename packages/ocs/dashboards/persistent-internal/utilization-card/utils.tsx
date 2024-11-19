import {
  humanizeNumber,
  humanizeSeconds,
  secondsToNanoSeconds,
} from '@odf/shared/utils';
import { Humanize } from '@openshift-console/dynamic-plugin-sdk';
import { TFunction } from 'react-i18next';

export const humanizeIOPS = (t: TFunction<string>): Humanize => {
  return (value: string | number) => {
    const humanizedNumber = humanizeNumber(value);

    return {
      ...humanizedNumber,
      string: t('{{value}} IOPS', { value: humanizedNumber.string }),
      unit: t('{{unit}} IOPS', { unit: humanizedNumber.unit }),
    };
  };
};

export const humanizeLatency: Humanize = (value) => {
  const humanizedTime = humanizeSeconds(
    secondsToNanoSeconds(value),
    null,
    'ms'
  );
  return humanizedTime;
};
