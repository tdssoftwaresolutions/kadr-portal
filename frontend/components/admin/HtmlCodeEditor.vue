<template>
  <div
    class="html-code-editor"
    :class="[
      `html-code-editor--${theme}`,
      { 'html-code-editor--disabled': disabled, 'html-code-editor--focused': focused }
    ]"
  >
    <div v-if="showToolbar" class="html-code-editor__toolbar">
      <b-button
        size="sm"
        variant="outline-primary"
        class="html-code-editor__format-btn"
        :disabled="disabled || !String(modelValue || '').trim()"
        @click="formatCode"
      >
        Format HTML
      </b-button>
      </div>
    <div ref="host" class="html-code-editor__host" :style="hostStyle" />
  </div>
</template>

<script>
import CodeMirror from 'codemirror'
import 'codemirror/lib/codemirror.css'
import 'codemirror/mode/xml/xml'
import 'codemirror/mode/javascript/javascript'
import 'codemirror/mode/css/css'
import 'codemirror/mode/htmlmixed/htmlmixed'
import 'codemirror/addon/mode/overlay'
import 'codemirror/addon/display/placeholder'
import { formatHtml } from '../../utils/htmlHighlight'

const PLACEHOLDER_OVERLAY = {
  token (stream) {
    if (stream.match(/\{[a-zA-Z][a-zA-Z0-9_]*\}/)) {
      return 'cm-placeholder'
    }
    stream.next()
    return null
  }
}

let htmlModeRegistered = false
function registerHtmlMode () {
  if (htmlModeRegistered) return
  htmlModeRegistered = true
  CodeMirror.defineMode('kadr-html', (config) => {
    return CodeMirror.overlayMode(
      CodeMirror.getMode(config, 'htmlmixed'),
      PLACEHOLDER_OVERLAY
    )
  })
}
registerHtmlMode()

export default {
  name: 'HtmlCodeEditor',
  props: {
    modelValue: {
      type: String,
      default: ''
    },
    rows: {
      type: [Number, String],
      default: 8
    },
    minHeight: {
      type: String,
      default: ''
    },
    disabled: {
      type: Boolean,
      default: false
    },
    placeholder: {
      type: String,
      default: ''
    },
    theme: {
      type: String,
      default: 'light',
      validator: (v) => ['dark', 'light'].includes(v)
    },
    showToolbar: {
      type: Boolean,
      default: true
    },
    /** Set false when parent tab/modal is hidden so we can refresh when it opens */
    visible: {
      type: Boolean,
      default: true
    }
  },
  data () {
    return {
      focused: false,
      editor: null,
      skipExternalSync: false,
      resizeObserver: null,
      intersectionObserver: null
    }
  },
  computed: {
    hostStyle () {
      const styles = {}
      if (this.minHeight) {
        styles.minHeight = this.minHeight
        return styles
      }
      const rowCount = Number(this.rows) || 8
      styles.minHeight = `${Math.max(4, rowCount) * 21 + 24}px`
      return styles
    }
  },
  emits: ['update:modelValue'],
  watch: {
    modelValue (next) {
      if (!this.editor || this.skipExternalSync) return
      this.syncEditorValue(next)
    },
    visible (next) {
      if (next) {
        this.$nextTick(() => this.refreshEditor())
      }
    },
    disabled (next) {
      if (this.editor) {
        this.editor.setOption('readOnly', next)
      }
    },
    placeholder (next) {
      if (this.editor) {
        this.editor.setOption('placeholder', next || '')
      }
    }
  },
  mounted () {
    const heightPx = this.editorHeightPx()
    this.editor = CodeMirror(this.$refs.host, {
      value: this.modelValue || '',
      mode: 'kadr-html',
      lineNumbers: true,
      lineWrapping: true,
      indentUnit: 2,
      tabSize: 2,
      indentWithTabs: false,
      readOnly: this.disabled,
      placeholder: this.placeholder || '',
      extraKeys: {
        Tab: (cm) => {
          if (cm.somethingSelected()) {
            cm.indentSelection('add')
          } else {
            cm.replaceSelection('  ', 'end')
          }
        }
      }
    })
    this.editor.setSize('100%', heightPx)

    this.editor.on('change', this.onEditorChange)
    this.editor.on('focus', () => {
      this.focused = true
      this.refreshEditor()
    })
    this.editor.on('blur', () => { this.focused = false })

    this.bindVisibilityObservers()
    this.syncEditorValue(this.modelValue)
  },
  beforeUnmount () {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect()
      this.resizeObserver = null
    }
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect()
      this.intersectionObserver = null
    }
    if (!this.editor) return
    this.editor.off('change', this.onEditorChange)
    const wrapper = this.editor.getWrapperElement()
    if (wrapper && wrapper.parentNode) {
      wrapper.parentNode.removeChild(wrapper)
    }
    this.editor = null
  },
  methods: {
    editorHeightPx () {
      if (this.minHeight) {
        const parsed = parseInt(String(this.minHeight), 10)
        if (!Number.isNaN(parsed)) return parsed
      }
      const rowCount = Number(this.rows) || 8
      return Math.max(4, rowCount) * 21 + 24
    },
    refreshEditor () {
      if (!this.editor) return
      this.editor.refresh()
    },
    syncEditorValue (next) {
      if (!this.editor) return
      const value = next == null ? '' : String(next)
      if (this.editor.getValue() !== value) {
        this.editor.setValue(value)
      }
      this.scheduleRefreshes()
    },
    scheduleRefreshes () {
      this.$nextTick(() => {
        this.refreshEditor()
        requestAnimationFrame(() => this.refreshEditor())
      })
      window.setTimeout(() => this.refreshEditor(), 50)
      window.setTimeout(() => this.refreshEditor(), 280)
    },
    bindVisibilityObservers () {
      const el = this.$refs.host
      if (!el || typeof ResizeObserver === 'undefined') return

      this.resizeObserver = new ResizeObserver(() => {
        if (el.offsetWidth > 0 && el.offsetHeight > 0) {
          this.refreshEditor()
        }
      })
      this.resizeObserver.observe(el)

      if (typeof IntersectionObserver !== 'undefined') {
        this.intersectionObserver = new IntersectionObserver((entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              this.refreshEditor()
            }
          }
        }, { threshold: 0.01 })
        this.intersectionObserver.observe(el)
      }
    },
    onEditorChange (editor) {
      const next = editor.getValue()
      if (next === this.modelValue) return
      this.skipExternalSync = true
      this.$emit('update:modelValue', next)
      this.$nextTick(() => {
        this.skipExternalSync = false
      })
    },
    formatCode () {
      if (this.disabled || !this.editor) return
      const formatted = formatHtml(this.modelValue)
      if (formatted !== this.modelValue) {
        this.editor.setValue(formatted)
        this.$emit('update:modelValue', formatted)
      }
    }
  }
}
</script>

<style scoped>
.html-code-editor {
  width: 100%;
  background: #fff;
}

.html-code-editor__toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem 1rem;
  margin-bottom: 0.35rem;
}

.html-code-editor__format-btn {
  font-size: 0.75rem;
}

.html-code-editor__hint {
  color: #6b7280;
}

.html-code-editor__hint code {
  font-size: 0.85em;
  color: #b45309;
  background: transparent;
}

.html-code-editor__host {
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid #dee2e6;
  background: #fff;
}

.html-code-editor--dark .html-code-editor__host {
  border-color: #334155;
  background: #0f172a;
}

.html-code-editor--focused .html-code-editor__host {
  border-color: #80bdff;
  box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.15);
}

.html-code-editor--disabled .html-code-editor__host {
  opacity: 0.65;
}
</style>

<style>
.html-code-editor .CodeMirror {
  height: 100%;
  min-height: inherit;
  font-family: Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
  font-size: 13px;
  line-height: 21px;
  border-radius: 4px;
}

.html-code-editor--light .CodeMirror {
  background: #fff;
  color: #111827;
}

.html-code-editor--dark .CodeMirror {
  background: #0f172a;
  color: #e2e8f0;
}

.html-code-editor--dark .CodeMirror-gutters {
  background: #0f172a;
  border-right-color: #334155;
}

.html-code-editor--dark .CodeMirror-linenumber {
  color: #64748b;
}

.html-code-editor .cm-placeholder {
  color: #c2410c;
  font-weight: 600;
}

.html-code-editor--dark .cm-placeholder {
  color: #fdba74;
}

.html-code-editor .CodeMirror-placeholder {
  color: #adb5bd;
}

.html-code-editor--dark .CodeMirror-placeholder {
  color: #64748b;
}
</style>
