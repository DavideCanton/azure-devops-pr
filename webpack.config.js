//@ts-check

'use strict';

const glob = require('glob');
const path = require('path');
const webpack = require('webpack');

const isDev = process.env.NODE_ENV === 'development';

/**@type {(env: any) => import('webpack').Configuration}*/
const config = env => {
    const useMocks = isDev && env.mocks;
    return {
        target: 'node', // webworker if browser is to support
        entry: {
            extension: './src/extension.ts',
            ...(isDev ? { tests: glob.sync('./src/tests/**/*.test.ts') } : {}),
        },
        output: {
            path: path.resolve(__dirname, 'out'),
            filename: '[name].js',
            libraryTarget: 'commonjs2',
            devtoolModuleFilenameTemplate: '../[resource-path]',
        },
        devtool: 'source-map',
        externals: {
            vscode: 'commonjs vscode',
        },
        resolve: {
            mainFields: ['browser', 'module', 'main'],
            extensions: ['.ts', '.js'],
            alias: {},
            fallback: {},
        },
        module: {
            rules: [
                {
                    test: /\.ts$/,
                    exclude: /node_modules/,
                    use: [
                        {
                            loader: 'ts-loader',
                        },
                    ],
                },
            ],
        },
        plugins: [
            // define DEV_MODE variable to detect dev mode at runtime
            new webpack.DefinePlugin({
                DEV_MODE: JSON.stringify(isDev),
            }),
            new webpack.ProgressPlugin(),
            // dev only plugins
            ...(useMocks
                ? [
                      // replace client import from ./client with ./mocks/client in dev mode
                      new webpack.NormalModuleReplacementPlugin(
                          /\.\/client/,
                          './mocks/client',
                      ),
                      // don't include mocks in prod build. Mainly as a safety measure.
                      new webpack.IgnorePlugin({
                          resourceRegExp: /^\.\/mocks$/,
                      }),
                  ]
                : []),
        ],
    };
};
module.exports = config;
