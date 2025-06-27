import { HumanizeResult } from '@openshift-console/dynamic-plugin-sdk';

export type ParsedMetric = {
  name: string;
  usedValue: HumanizeResult;
};
