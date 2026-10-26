import { defineAsyncComponent } from 'vue'

/**
 * Lazy <editor> component for TinyMCE.
 *
 * TinyMCE plus its plugins and skin is ~1.2 MB (~390 KB gzipped). Importing
 * it statically from MyCases.vue put it in the dashboard chunk, so every user
 * downloaded it right after login even though the editor only appears inside
 * a few modals. This wrapper defers the download until an editor is actually
 * rendered; props, v-model and listeners pass straight through.
 */
export default defineAsyncComponent(() =>
  import(/* webpackChunkName: "tinymce" */ './tinymce').then(() =>
    import(/* webpackChunkName: "tinymce" */ '@tinymce/tinymce-vue')
  )
)
