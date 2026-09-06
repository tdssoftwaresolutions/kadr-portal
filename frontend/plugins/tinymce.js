/**
 * Self-hosted TinyMCE 5 setup for the @tinymce/tinymce-vue wrapper.
 *
 * The old `vue2-tinymce-editor` bundled TinyMCE 5 internally. Its replacement,
 * @tinymce/tinymce-vue, expects TinyMCE to be provided. We reuse the already
 * self-hosted `tinymce@5` package (no Cloud API key needed) and import every
 * theme/icon/skin/plugin referenced by the editor `:init` options used across
 * MyBlogs, MyCases, and SimpleFulfillmentRuleEditor.
 *
 * Import this module once per component that renders <editor>, before use.
 */
import 'tinymce/tinymce'
import 'tinymce/themes/silver'
import 'tinymce/icons/default'
import 'tinymce/skins/ui/oxide/skin.css'

// Plugins referenced by the editor options (TinyMCE 5 names).
import 'tinymce/plugins/autosave'
import 'tinymce/plugins/lists'
import 'tinymce/plugins/advlist'
import 'tinymce/plugins/link'
import 'tinymce/plugins/image'
import 'tinymce/plugins/table'
import 'tinymce/plugins/media'
import 'tinymce/plugins/fullscreen'
import 'tinymce/plugins/paste'
import 'tinymce/plugins/charmap'
import 'tinymce/plugins/hr'
import 'tinymce/plugins/anchor'
import 'tinymce/plugins/insertdatetime'
import 'tinymce/plugins/wordcount'
import 'tinymce/plugins/preview'
import 'tinymce/plugins/code'
