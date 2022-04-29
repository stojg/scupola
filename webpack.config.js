module.exports = {
    entry: "./srcjs",
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                exclude: /node_modules/,
                use: 'ts-loader',
            },
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: {
                    loader: "babel-loader"
                }
            }
        ]
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js'],
    },
    output: {
        path: __dirname + '/dist',
        publicPath: '',
        filename: 'js/main.js'
    },
    devServer: {
        contentBase: './dist'
    } 
};
