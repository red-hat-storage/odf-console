import { createRequire } from 'module';
import * as path from 'path';
import { fileURLToPath } from 'url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, '../..');

let cached: string[] | null = null;

/**
 * Returns the list of shared plugin modules from the Console SDK,
 * merged with its peerDependencies.
 *
 * Note: PatternFly component packages (@patternfly/react-core, etc.)
 * use dynamic component-level sharing and are NOT listed by the SDK.
 * Use {@link isSharedModule} which adds a @patternfly/* catch-all.
 */
export const getSharedModules = (): string[] => {
  if (cached) return cached;

  const req = createRequire(path.join(projectRoot, 'package.json'));
  const meta = req(
    '@openshift-console/dynamic-plugin-sdk-webpack/lib/shared-modules/shared-modules-meta.js'
  );
  const sdkPkg = req('@openshift-console/dynamic-plugin-sdk/package.json');

  const fromSdk: string[] = meta.sharedPluginModules || [];
  const fromPeers: string[] = Object.keys(sdkPkg.peerDependencies || {});

  const all = new Set([...fromSdk, ...fromPeers]);
  // react-dom is provided by Console but not listed in SDK metadata
  all.add('react-dom');
  // SDK webpack package is Console-owned tooling
  all.add('@openshift-console/dynamic-plugin-sdk-webpack');

  cached = [...all];

  return cached;
};

/**
 * Checks whether a package is Console-provided and should not be
 * bumped or flagged by the plugin's own CVE tooling. Covers:
 *   - Exact matches from the SDK shared modules list
 *   - Sub-path imports of shared modules (e.g., react-router/dom)
 *   - Any @patternfly/* package (component-level sharing)
 */
export const isSharedModule = (name: string): boolean => {
  const shared = getSharedModules();
  return (
    shared.some((mod) => name === mod || name.startsWith(`${mod}/`)) ||
    name.startsWith('@patternfly/')
  );
};

export const getJustification = (name: string): string =>
  isSharedModule(name)
    ? 'Console-provided shared module, externalized at runtime'
    : 'Not present in production bundle (dev/build dependency)';
