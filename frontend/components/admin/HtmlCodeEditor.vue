<template>
  <div class="hce-wrap" :class="{ 'hce-wrap--disabled': disabled, 'hce-wrap--focused': focused }">
    <div v-if="showToolbar" class="hce-toolbar">
      <button
        type="button"
        class="hce-btn"
        :disabled="disabled || !currentValue.trim()"
        @click="formatCode"
      >
        Format HTML
      </button>
    </div>
    <textarea
      ref="ta"
      class="hce-textarea"
      :style="textareaStyle"
      :value="currentValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :readonly="disabled"
      spellcheck="false"
      autocomplete="off"
      autocorrect="off"
      autocapitalize="off"
      @input="onInput"
      @focus="focused = true"
      @blur="focused = false"
      @keydown.tab.prevent="onTab"
    />
  </div>
</template>

<script>
import { formatHtml } from '../../utils/htmlHighlight'

export default {
  name: 'HtmlCodeEditor',

  props: {
    modelValue: { type: String, default: null },
    value: { type: String, default: null },
    rows: { type: [Number, String], default: 8 },
    minHeight: { type: String, default: '' },
    disabled: { type: Boolean, default: false },
    placeholder: { type: String, default: '' },
    theme: { type: String, default: 'light', validator: (v) => ['dark', 'light'].includes(v) },
    showToolbar: { type: Boolean, default: true },
    visible: { type: Boolean, default: true } // kept for API compat, unused
  },

  emits: ['update:modelValue', 'input'],

  data () {
    return { focused: false }
  },

  computed: {
    currentValue () {
      const v = this.modelValue != null ? this.modelValue : (this.value != null ? this.value : '')
      return String(v)
    },
    textareaStyle () {
      const rows = Math.max(4, Number(this.rows) || 8)
      if (this.minHeight) return { minHeight: this.minHeight }
      return { minHeight: `${rows * 21}px` }
    }
  },

  watch: {
    // Keep the native DOM value in sync when the prop changes externally
    // (e.g. when parent resets the editor or programmatically sets content).
    currentValue (next) {
      const ta = this.$refs.ta
      if (ta && ta.value !== next) {
        ta.value = next
      }
    }
  },

  methods: {
    onInput (e) {
      const next = e.target.value
      this.$emit('update:modelValue', next)
      this.$emit('input', next)
    },

    onTab (e) {
      if (this.disabled) return
      const ta = e.target
      const start = ta.selectionStart
      const end = ta.selectionEnd
      const next = ta.value.substring(0, start) + '  ' + ta.value.substring(end)
      ta.value = next
      ta.selectionStart = ta.selectionEnd = start + 2
      this.$emit('update:modelValue', next)
      this.$emit('input', next)
    },

    formatCode () {
      if (this.disabled) return
      const formatted = formatHtml(this.currentValue)
      if (formatted !== this.currentValue) {
        this.$emit('update:modelValue', formatted)
        this.$emit('input', formatted)
        this.$nextTick(() => {
          if (this.$refs.ta) this.$refs.ta.value = formatted
        })
      }
    },

    // Called by parent via $refs — no longer needed but kept for compatibility
    refreshEditor () {}
  }
}
</script>

<style scoped>
.hce-wrap {
  width: 100%;
}

.hce-toolbar {
  display: flex;
  align-items: center;
  margin-bottom: 0.35rem;
}

.hce-btn {
  padding: 2px 12px;
  font-size: 0.75rem;
  line-height: 1.5;
  border-radius: 4px;
  border: 1px solid var(--kadr-primary, #5a4bd4);
  color: var(--kadr-primary, #5a4bd4);
  background: transparent;
  cursor: pointer;
}
.hce-btn:hover:not(:disabled) {
  background: var(--kadr-primary, #5a4bd4);
  color: #fff;
}
.hce-btn:disabled {
  opacity: 0.45;
  cursor: default;
}

.hce-textarea {
  display: block;
  width: 100%;
  padding: 8px 10px;
  font-family: Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
  font-size: 13px;
  line-height: 21px;
  color: var(--kadr-text-primary, #212529);
  background: var(--kadr-bg-surface, #fff);
  border: 1px solid var(--kadr-border-strong, #ced4da);
  border-radius: 4px;
  resize: vertical;
  box-sizing: border-box;
  white-space: pre;
  overflow: auto;
  tab-size: 2;
  outline: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.hce-wrap--focused .hce-textarea {
  border-color: var(--kadr-primary, #5a4bd4);
  box-shadow: 0 0 0 0.2rem rgba(90, 75, 212, 0.18);
}

.hce-wrap--disabled .hce-textarea {
  background: var(--kadr-bg-subtle, #f8f9fa);
  opacity: 0.65;
  cursor: not-allowed;
}
</style>
