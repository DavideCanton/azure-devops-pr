//@ts-check

'use strict';

const path = require('path');
const webpack = require('webpack');

/**@type {(env: any) => import('webpack').Configuration}*/
const config = env => {
    return {
        target: 'node', // webworker if browser is to support
        entry: {
            extension: './src/extension.ts',
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
        plugins: [new webpack.ProgressPlugin()],
    };
};
module.exports = config;
