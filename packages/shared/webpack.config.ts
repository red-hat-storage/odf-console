/* eslint-env node */

import * as path from 'path';
import { ForkTsCheckerWebpackPlugin } from 'fork-ts-checker-webpack-plugin/lib/plugin';
import { Configuration } from 'webpack';

const config: Configuration = {
  entry: './src/index.ts',
  output: {
    path: path.resolve(__dirname, 'build'),
    filename: 'index.js',
    libraryTarget: 'umd',
    library: '@odf/shared',
    globalObject: 'this',
    clean: true,
  },
  watchOptions: {
    ignored: ['node_modules', 'build'],
  },
  externals: [/^@openshift-console.*/, 'react', 'react-dom', /^@patternfly.*/],
  devtool: 'source-map',
  mode: (process.env.NODE_ENV || 'development') as Configuration['mode'],
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: {
          loader: 'ts-loader',
          options: {
            configFile: path.resolve(__dirname, 'tsconfig.json'),
            transpileOnly: false,
            happyPackMode: false,
          },
        },
      },
      {
        test: /\.scss$/,
        use: [
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
    }),
  ],
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
    alias: {
      '@odf/shared': path.resolve(__dirname, './src/'),
    },
  },
};

export default config;
