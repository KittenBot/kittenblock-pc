var path = require('path');
var webpack = require('webpack');

var base = {
    devServer: {
        contentBase: path.resolve(__dirname, 'playground'),
        host: '0.0.0.0'
    },
    module: {
        loaders: [
            {
                include: [
                    path.resolve(__dirname, 'src')
                ],
                test: /\.js$/,
                loader: 'babel-loader',
                query: {
                    presets: ['es2015']
                }
            },
            {
                test: /\.json$/,
                loader: 'json-loader'
            }
        ]
    },
    plugins: [
        new webpack.optimize.UglifyJsPlugin({
            include: /\.min\.js$/,
            minimize: true,
            compress: {
                warnings: false
            }
        })
    ]
};


module.exports = [
    Object.assign({}, base, {
        entry: {
            'kittenblock': './src/index.js'
        },
        target:"node",
        output: {
            library: 'KittenBlock',
            libraryTarget: 'commonjs2',
            path: __dirname,
            filename: '[name].js'
        }
    })
];
