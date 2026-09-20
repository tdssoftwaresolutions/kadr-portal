const path = require('path')

const isCapacitorBuild = process.env.VUE_APP_CAPACITOR === '1'

module.exports = {
  lintOnSave: process.env.NODE_ENV !== 'production',
  // The Vue source lives in frontend/ instead of the Vue CLI default src/.
  // `pages` sets the app entry so vue-cli-service knows where main.js is.
  pages: {
    index: {
      entry: 'frontend/main.js',
      template: 'public/index.html',
      filename: 'index.html'
    }
  },
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
      // Source moved from src/ to frontend/; ensure the linter scans it.
      .include.add(path.resolve(__dirname, 'frontend'))
      .end()
      .exclude.add(path.resolve(__dirname, 'public/home'))
      .end()

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
  configureWebpack: config => {
    // Never emit eval-based bundles in production. Vue CLI defaults to a
    // `source-map` devtool for production, but forcing it guarantees the built
    // app.js contains no eval()/new Function(), so it satisfies the strict CSP
    // (no 'unsafe-eval'). Development keeps Vue CLI's own fast eval-based
    // devtool — this branch used to be a dead no-op that forced source-map
    // unconditionally, so dev builds paid the slower devtool for no reason.
    if (process.env.NODE_ENV === 'production') {
      config.devtool = 'source-map'
    }

    config.plugins.push({
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
    })

    config.resolve = config.resolve || {}
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      // Source dir is frontend/ (not the Vue CLI default src/), so point the
      // conventional `@` alias at it explicitly.
      '@': path.resolve(__dirname, 'frontend'),
      // Pure Vue 3 (migration complete; @vue/compat removed).
      'vue$': 'vue/dist/vue.runtime.esm-bundler.js',
      'jquery': 'jquery/src/jquery.js'
    }

    // ANALYZE=1 npm run build:analyze — opens an interactive treemap of what's
    // actually in each bundle, so a bundle-size regression can be diagnosed
    // without manually grepping dist/js/*.js.
    if (process.env.ANALYZE === '1') {
      const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer')
      config.plugins.push(new BundleAnalyzerPlugin())
    }
  }
}
