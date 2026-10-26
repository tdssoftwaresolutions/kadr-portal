// BootstrapVueNext (Vue 3, Bootstrap 5) replaces BootstrapVue 2 (Vue 2, Bootstrap 4).
// BootstrapVueNext styles. The plugin itself is registered in main.js via
// createBootstrap() so its orchestrators (modal/toast controllers) are available.
// Bootstrap 5 itself is compiled once from SCSS in assets/scss/style.scss —
// importing bootstrap/dist/css/bootstrap.css here as well shipped the whole
// framework twice (~230 KB of duplicate CSS on every page).
import 'bootstrap-vue-next/dist/bootstrap-vue-next.css'
