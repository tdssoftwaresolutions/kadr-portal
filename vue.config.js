const webpack = require('webpack')
const path = require('path')

module.exports = {
  lintOnSave: process.env.NODE_ENV !== 'production',
  publicPath: process.env.NODE_ENV === 'production'
    ? process.env.BASE_URL + '/admin/'
    : '/admin/',
  devServer: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000', // Your Express server's port
        changeOrigin: true
      }
    }
  },
  chainWebpack: config => {
    config.module
      .rule('eslint')
      .exclude.add(path.resolve(__dirname, 'public/home'))
      .end()
  },
  configureWebpack: {
    plugins: [
      new webpack.ProvidePlugin({
        mapboxgl: 'mapbox-gl'
      }),
      {
        apply: (compiler) => {
          compiler.hooks.emit.tapAsync('ExcludeFolderPlugin', (compilation, callback) => {
            const excludedFolder = 'home'
            Object.keys(compilation.assets).forEach((asset) => {
              if (asset.startsWith(excludedFolder)) {
                delete compilation.assets[asset]
              }
            })
            callback()
          })
        }
      }
    ],
    resolve: {
      alias: {
        'vue$': 'vue/dist/vue.common.js',
        'jquery': 'jquery/src/jquery.js'
      }
    }
  }
}
