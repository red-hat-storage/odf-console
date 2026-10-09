import { createRequire } from 'module';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as semver from 'semver';
import { getSharedModules } from './lib/get-shared-modules.mts';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, '..');
const req = createRequire(path.join(projectRoot, 'package.json'));

const sdkPeers: Record<string, string> =
  req('@openshift-console/dynamic-plugin-sdk/package.json').peerDependencies ||
  {};

const shared = getSharedModules();

let failed = false;

for (const mod of shared) {
  const expected = sdkPeers[mod];
  if (!expected) {
    // eslint-disable-next-line no-continue
    continue;
  }

  try {
    const { version: installed } = req(`${mod}/package.json`) as {
      version: string;
    };
    if (!semver.satisfies(installed, expected)) {
      // eslint-disable-next-line no-console
      console.error(
        `MISMATCH: ${mod} installed ${installed}, SDK expects ${expected}`
      );
      failed = true;
    }
  } catch {
    // Not installed (optional shared module like react-router-dom-v5-compat)
  }
}

if (failed) {
  process.exit(1);
}

// eslint-disable-next-line no-console
console.log('All shared modules align with Console SDK.');
