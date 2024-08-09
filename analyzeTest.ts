import * as fs from 'fs';
import * as JSONStream from 'JSONStream';

const pluginName = process.env.PLUGIN;
const MAX_ASSET_SIZE = 19; // 19 MiB

const getStatsFilePath = () => `./plugins/${pluginName}/dist/stats.json`;

const toMiB = (value: number) => value / 1024 ** 2;

const stringifyMiB = (value: ReturnType<typeof toMiB>): string =>
  `${value.toFixed(2)} MB`;

const getParsedStatFile = async (): Promise<any> => {
  const filePath = getStatsFilePath();
  return new Promise((resolve, reject) => {
    const fileStream = fs.createReadStream(filePath);
    const parser = JSONStream.parse('assets.*');
    const assets: any[] = [];

    fileStream.pipe(parser);

    parser.on('data', (data) => {
      assets.push(data);
    });

    parser.on('end', () => {
      resolve({ assets });
    });

    parser.on('error', (error) => {
      reject(error);
    });
  });
};

type BundleDataMap = Record<string, string>;

// [Valid Bundles, Violating Bundles]
type GetBundleInformation = () => Promise<[BundleDataMap, BundleDataMap]>;

const getBundleInformation: GetBundleInformation = async () => {
  const statsData = await getParsedStatFile();
  const validAssets: BundleDataMap = {};
  const violatingAssets: BundleDataMap = {};

  statsData.assets.forEach((asset: { name: string; size: number }) => {
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
