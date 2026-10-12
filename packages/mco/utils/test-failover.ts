import { Patch } from '@openshift-console/dynamic-plugin-sdk';

const DRY_RUN_PATH = '/spec/dryRun';

export const getStartTestFailoverPatch = (): Patch[] => [
  { op: 'add', path: DRY_RUN_PATH, value: true },
];

export const getPromoteTestFailoverPatch = (): Patch[] => [
  { op: 'replace', path: DRY_RUN_PATH, value: false },
];

export const getEndTestFailoverPatch = (homeCluster: string): Patch[] => [
  { op: 'replace', path: DRY_RUN_PATH, value: false },
  { op: 'remove', path: '/spec/action' },
  { op: 'replace', path: '/spec/preferredCluster', value: homeCluster },
];
