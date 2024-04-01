//@ts-check

'use strict';

const path = require('path');
const webpack = require('webpack');

const isDev = process.env.NODE_ENV === 'development';

/**@type {import('webpack').Configuration}*/
const config = {
    target: 'node', // webworker if browser is to support
    entry: './src/extension.ts',
    output: {
        path: path.resolve(__dirname, 'out'),
        filename: 'extension.js',
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
        // define USE_MOCKS variable to detect at runtime if mocks should be used
        new webpack.DefinePlugin({
            USE_MOCKS: JSON.stringify(isDev),
        }),
        // ignore ./mocks import in production to have webpack not compile the module
        isDev
            ? false
            : new webpack.IgnorePlugin({
                  resourceRegExp: /^\.\/mocks$/,
              }),
    ],
};
module.exports = config;
