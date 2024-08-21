/* eslint-env node */

import * as path from 'path';
import { ConsoleRemotePlugin } from '@openshift-console/dynamic-plugin-sdk-webpack';
import * as CircularDependencyPlugin from 'circular-dependency-plugin';
import * as CopyWebpackPlugin from 'copy-webpack-plugin';
import { ForkTsCheckerWebpackPlugin } from 'fork-ts-checker-webpack-plugin/lib/plugin';
import * as webpack from 'webpack';
import { BundleAnalyzerPlugin } from 'webpack-bundle-analyzer';
import type { Configuration as DevServerConfiguration } from 'webpack-dev-server';

const LANGUAGES = ['en', 'ja', 'ko', 'zh', 'es', 'fr'];
const resolveLocale = (dirName: string, ns: string) =>
  LANGUAGES.map((lang) => ({
    from: path.resolve(dirName, `locales/${lang}/plugin__*.json`),
    to: `locales/${lang}/${ns}.[ext]`,
  }));

const NODE_ENV = (process.env.NODE_ENV ||
  'development') as webpack.Configuration['mode'];
const PLUGIN = process.env.PLUGIN;
const OPENSHIFT_CI = process.env.OPENSHIFT_CI;
const IS_PRODUCTION = NODE_ENV === 'production';

if (PLUGIN === undefined) {
  process.exit(1);
}
const processPath = path.resolve(__dirname, `plugins/${PLUGIN}`);
process.chdir(processPath);

const config: webpack.Configuration & DevServerConfiguration = {
  context: __dirname,
  mode: NODE_ENV,
  entry: {},
  output: {
    path: path.resolve('./dist'),
    filename: '[name]-bundle.js',
    chunkFilename: '[name]-chunk.js',
  },
  ignoreWarnings: [(warning) => !!warning?.file?.includes('shared module')],
  watchOptions: {
    ignored: ['node_modules', 'dist'],
  },
  devServer: {
    port: 9001,
    devMiddleware: {
      writeToDisk: true,
    },
    headers: {
      'Cache-Control': 'no-store',
    },
    static: ['dist'],
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
    alias: {
      '@odf/shared': path.resolve(__dirname, './packages/shared/src/'),
    },
  },
  module: {
    rules: [
      {
        test: /(\.jsx?)|(\.tsx?)$/,
        include: /packages/,
        exclude: /(build|dist)/, // Ignore shared build folder.
        use: [
          {
            loader: 'ts-loader',
            options: {
              configFile: path.resolve(__dirname, 'tsconfig.json'),
              transpileOnly: true,
              happyPackMode: true,
            },
          },
        ],
      },
      {
        test: /\.scss$/,
        include: [
          /node_modules\/@openshift-console\/plugin-shared/,
          /node_modules\/@openshift-console\/dynamic-plugin-sdk/,
          /packages/,
        ],
        exclude: /(build|dist)/, // Ignore shared build folder.
        use: [
          { loader: 'cache-loader' },
          {
            loader: 'thread-loader',
            options: {
              ...(!IS_PRODUCTION
                ? { poolTimeout: Infinity, poolRespawn: false }
                : OPENSHIFT_CI
                ? {
                    workers: 4,
                    workerNodeArgs: ['--max-old-space-size=1024'],
                  }
                : {}),
            },
          },
          { loader: 'style-loader' },
          {
            loader: 'css-loader',
            options: {
              sourceMap: true,
            },
          },
          {
            loader: 'resolve-url-loader',
            options: {
              sourceMap: true,
            },
          },
          {
            loader: 'sass-loader',
            options: {
              sassOptions: {
                outputStyle: 'compressed',
                quietDeps: true,
              },
              sourceMap: true,
            },
          },
        ],
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.(png|jpg|jpeg|gif|svg|woff2?|ttf|eot|otf)(\?.*$|$)/,
        loader: 'file-loader',
        options: {
          name: 'assets/[name].[ext]',
        },
      },
    ],
  },
  plugins: [
    new ConsoleRemotePlugin(),
    new CopyWebpackPlugin({
      patterns: [...resolveLocale(__dirname, process.env.I8N_NS || '')],
    }),
    new webpack.DefinePlugin({
      'process.env.I8N_NS': JSON.stringify(process.env.I8N_NS),
      'process.env.PLUGIN_VERSION': JSON.stringify(process.env.PLUGIN_VERSION),
    }),
    new webpack.ProvidePlugin({
      Buffer: ['buffer', 'Buffer'],
    }),
    new CircularDependencyPlugin({
      exclude: /cypress|plugins|scripts|node_modules/,
      failOnError: true,
      allowAsyncCycles: false,
      cwd: process.cwd(),
    }),
  ],
  // 'eval-source-map' is recommended for development but 'eval-cheap-module-source-map' is faster and gives better result.
  ...(!IS_PRODUCTION ? { devtool: 'eval-cheap-module-source-map' } : {}),
  optimization: {
    chunkIds: 'named',
  },
};

if (IS_PRODUCTION || process.env.DEV_NO_TYPE_CHECK !== 'true') {
  config.plugins?.push(
    new ForkTsCheckerWebpackPlugin({
      issue: {
        exclude: [{ file: '**/node_modules/**/*' }],
      },
      typescript: {
        diagnosticOptions: {
          semantic: true,
          syntactic: true,
        },
      },
    })
  );
}

if (process.env.ANALYZE_BUNDLE === 'true') {
  config.plugins?.push(
    new BundleAnalyzerPlugin({
      analyzerMode: 'static',
      generateStatsFile: true,
      openAnalyzer: false,
    })
  );
}

export default config;
