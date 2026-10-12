import { Patch } from '@openshift-console/dynamic-plugin-sdk';

const DRY_RUN_PATH = '/spec/dryRun';

export const getStartTestFailoverPatch = (): Patch[] => [
  { op: 'add', path: DRY_RUN_PATH, value: true },
];
