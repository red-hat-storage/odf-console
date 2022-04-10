import {
  humanizeNumber,
  humanizeSeconds,
  secondsToNanoSeconds,
} from '@odf/shared/utils';
import { Humanize } from '@openshift-console/dynamic-plugin-sdk';

export const humanizeIOPS: Humanize = (value) => {
  const humanizedNumber = humanizeNumber(value);
  return {
    ...humanizedNumber,
    string: `${humanizedNumber.string} IOPS`,
    unit: `${humanizedNumber.unit} IOPS`,
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
