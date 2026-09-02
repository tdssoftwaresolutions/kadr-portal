const path = require('path')

const isCapacitorBuild = process.env.VUE_APP_CAPACITOR === '1'

module.exports = {
  lintOnSave: process.env.NODE_ENV !== 'production',
  publicPath: isCapacitorBuild
    ? './'
    : (process.env.NODE_ENV === 'production'
        ? process.env.BASE_URL + '/admin/'
        : '/admin/'),
  devServer: {
    // Keep Vue off Express's PORT (.env PORT=3000). 8081 avoids common 8080 clashes.
    port: 8081,
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
