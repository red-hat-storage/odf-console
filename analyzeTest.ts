import * as fs from 'fs';
import { parseChunked } from '@discoveryjs/json-ext';

const pluginName = process.env.PLUGIN;
const MAX_ASSET_SIZE = 3; //3 MiB

const getStatsFilePath = () => `./plugins/${pluginName}/dist/stats.json`;

const toMiB = (value: number) => value / 1024 ** 2;

const stringifyMiB = (value: ReturnType<typeof toMiB>): string =>
  `${value.toFixed(2)} MB`;

const getParsedStatFile = () => {
  const filePath = getStatsFilePath();
  return parseChunked(fs.createReadStream(filePath, { encoding: 'utf8' }));
};

type BundleDataMap = Record<string, number>;

// [Valid Bundles, Violating Bunldes]
type GetBundleInformation = () => Promise<[BundleDataMap, BundleDataMap]>;

const getBundleInformation: GetBundleInformation = async () => {
  const statsData = await getParsedStatFile();
  const validAssets = {};
  const violatingAssets = {};

  statsData.assets.forEach((asset) => {
    const assetSize = toMiB(asset.size);
    const readableSize = stringifyMiB(assetSize);
    if (assetSize > MAX_ASSET_SIZE) {
      violatingAssets[asset.name] = readableSize;
    } else {
      validAssets[asset.name] = readableSize;
    }
  });

  return [validAssets, violatingAssets];
};

const validateBuild = async () => {
  const [validAssets, violatingAssets] = await getBundleInformation();
  if (Object.keys(violatingAssets).length > 0) {
    // eslint-disable-next-line no-console
    console.error('Assets are larger than expected', violatingAssets);
    process.exit(1);
  } else {
    // eslint-disable-next-line no-console
    console.log('All assets are valid', validAssets);
    process.exit(0);
  }
};

validateBuild();
