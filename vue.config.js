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

    // Vue 3 migration: run @vue/compat in "Vue 2 behavior" mode so the app keeps
    // working while breaking changes are fixed phase by phase. Each SFC is compiled
    // with MODE 2 (full Vue 2 compatibility). Individual features are tightened later.
    config.module
      .rule('vue')
      .use('vue-loader')
      .tap(options => {
        options = options || {}
        options.compilerOptions = {
          ...(options.compilerOptions || {}),
          compatConfig: {
            MODE: 2
          }
        }
        return options
      })

    // The refreshed dependency tree pulled a stricter cssnano/postcss selector
    // parser that throws a false-positive "Unclosed comment" during the
    // production `mergeRules` optimization on the bundled vendor CSS. Disable the
    // two selector-rewriting optimizations so production minification completes.
    // Source CSS is unchanged; only these micro-optimizations are turned off.
    if (process.env.NODE_ENV === 'production') {
      config.optimization.minimizer('css').tap(args => {
        args[0] = args[0] || {}
        args[0].minimizerOptions = {
          preset: ['default', {
            mergeRules: false,
            discardComments: { removeAll: true }
          }]
        }
        return args
      })
    }
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
        // Vue 3 migration build. Replaced with plain 'vue' in Phase 9.
        'vue$': '@vue/compat',
        'jquery': 'jquery/src/jquery.js'
      }
    }
  }
}
