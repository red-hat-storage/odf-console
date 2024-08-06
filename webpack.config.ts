/* eslint-env node */

import * as path from 'path';
import { ConsoleRemotePlugin } from '@openshift-console/dynamic-plugin-sdk-webpack';
import * as CircularDependencyPlugin from 'circular-dependency-plugin';
import * as CopyWebpackPlugin from 'copy-webpack-plugin';
import { ForkTsCheckerWebpackPlugin } from 'fork-ts-checker-webpack-plugin/lib/plugin';
import * as webpack from 'webpack';
import { BundleAnalyzerPlugin } from 'webpack-bundle-analyzer';
import type { Configuration as DevServerConfiguration } from 'webpack-dev-server';

// supported PLUGINS: odf/mco/client
const PLUGIN = process.env.PLUGIN;
if (PLUGIN === undefined) {
  process.exit(1);
}
// switch current working directory based on the plugins
const processPath = path.resolve(__dirname, `plugins/${PLUGIN}`);
process.chdir(processPath);

// supported languages
const LANGUAGES = ['en', 'ja', 'ko', 'zh', 'es', 'fr'];
const resolveLocale = (dirName: string, ns: string) =>
  LANGUAGES.map((lang) => ({
    from: path.resolve(dirName, `locales/${lang}/plugin__*.json`),
    to: `locales/${lang}/${ns}.[ext]`,
  }));

// supported NODE_ENV: production/development
const NODE_ENV = (process.env.NODE_ENV ||
  'development') as webpack.Configuration['mode'];
const isProduction = NODE_ENV === 'production';
const OPENSHIFT_CI = process.env.OPENSHIFT_CI;

const config: webpack.Configuration & DevServerConfiguration = {
  context: __dirname,
  mode: NODE_ENV,
  entry: {},
  output: {
    path: path.resolve('./dist'),
    filename: '[name].bundle.[contenthash:8].js',
    chunkFilename: '[name].[contenthash:8].js',
  },
  ignoreWarnings: [(warning) => !!warning?.file?.includes('shared module')],
  watchOptions: {
    ignored: ['node_modules', 'dist'],
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
              ...(!isProduction
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
    new ConsoleRemotePlugin({
      sharedDynamicModuleSettings: {
        modulePaths: [path.resolve(__dirname, 'node_modules')],
      },
    }),
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
  // 'source-map' is recommended choice for production builds, A full SourceMap is emitted as a separate file.
  // 'eval-source-map' is recommended for development but 'eval-cheap-module-source-map' is faster and gives better result.
  devtool: isProduction ? 'source-map' : 'eval-cheap-module-source-map',
  optimization: {
    // 'deterministic' Good for long term caching.
    // 'named' Readable ids for better debugging.
    chunkIds: isProduction ? 'deterministic' : 'named',
  },
  devServer: {
    port: 9001,
    // Allow bridge running in a container to connect to the plugin dev server.
    allowedHosts: 'all',
    devMiddleware: {
      writeToDisk: true,
    },
    static: ['dist'],
    // Enable gzip compression for dev server
    compress: true,
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
    alias: {
      '@odf/shared': path.resolve(__dirname, './packages/shared/src/'),
    },
  },
};

if (isProduction || process.env.DEV_NO_TYPE_CHECK !== 'true') {
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
