const { merge } = require('webpack-merge')
const common = require('./webpack.common.js')
const LiveReloadPlugin = require('webpack-livereload-plugin')

module.exports = merge(common, {
  mode: 'development',
  devtool: 'inline-source-map',
  // devServer: {
  //   static: './dist',
  // },
  plugins: [
    new LiveReloadPlugin({
      appendScriptTag: true,
      useSourceHash: true,
      useSourceSize: false,
    }),
  ],
})
