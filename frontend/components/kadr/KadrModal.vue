<template>
  <transition name="kadr-modal-fade">
    <div
      v-if="modelValue"
      class="kadr-modal-overlay"
      @click.self="onBackdrop"
    >
      <div
        ref="dialog"
        class="kadr-modal"
        :class="[sizeClass, { 'kadr-modal--sidebar-safe': true }]"
        role="dialog"
        aria-modal="true"
        :aria-label="ariaLabel || title || undefined"
        tabindex="-1"
      >
        <header v-if="title || $slots.header || !hideClose" class="kadr-modal__head">
          <div class="kadr-modal__title-wrap">
            <h3 v-if="title" class="kadr-modal__title">{{ title }}</h3>
            <slot name="header" />
          </div>
          <button
            v-if="!hideClose"
            type="button"
            class="kadr-modal__close"
            :disabled="busy"
            aria-label="Close"
            @click="requestClose"
          >
            <i class="ri-close-line" aria-hidden="true"></i>
          </button>
        </header>

        <div class="kadr-modal__body">
          <slot />
        </div>

        <footer v-if="$slots.footer" class="kadr-modal__foot">
          <slot name="footer" :busy="busy" />
        </footer>
      </div>
    </div>
  </transition>
</template>

<script>
/**
 * KadrModal — an opt-in guarded modal overlay for the Kadr design language.
 *
 * Why this exists: the app has a few hand-rolled `.modal-overlay` dialogs that
 * each re-implemented (and sometimes forgot) the same safety affordances —
 * guarding dismissal while a submit is in flight, Escape-to-close, and locking
 * body scroll. New modals should use this wrapper so those come for free.
 *
 * It is intentionally NOT retrofitted onto the existing hardened modals; adopt
 * it when a modal is next touched.
 *
 * Usage:
 *   <kadr-modal v-model="open" :busy="submitting" title="Do the thing">
 *     ...body...
 *     <template #footer>
 *       <button class="btn btn-secondary" :disabled="submitting" @click="open = false">Cancel</button>
 *       <button class="btn btn-primary" :disabled="submitting" @click="submit">Save</button>
 *     </template>
 *   </kadr-modal>
 */
export default {
  name: 'KadrModal',
  props: {
    /** v-model visibility. */
    modelValue: {
      type: Boolean,
      default: false
    },
    /** When true, Escape / backdrop / close-button dismissal is blocked (submit in flight). */
    busy: {
      type: Boolean,
      default: false
    },
    title: {
      type: String,
      default: ''
    },
    ariaLabel: {
      type: String,
      default: ''
    },
    /** Hide the header close (X) button. */
    hideClose: {
      type: Boolean,
      default: false
    },
    /** Allow closing on backdrop click (still blocked while busy). */
    closeOnBackdrop: {
      type: Boolean,
      default: true
    },
    /** Allow closing on Escape (still blocked while busy). */
    closeOnEsc: {
      type: Boolean,
      default: true
    },
    size: {
      type: String,
      default: 'md',
      validator: (v) => ['sm', 'md', 'lg', 'xl'].includes(v)
    }
  },
  emits: ['update:modelValue', 'close'],
  computed: {
    sizeClass () {
      return `kadr-modal--${this.size}`
    }
  },
  watch: {
    modelValue (open) {
      if (open) {
        this.lockScroll()
        this.$nextTick(() => {
          if (this.$refs.dialog) this.$refs.dialog.focus()
        })
      } else {
        this.unlockScroll()
      }
    }
  },
  mounted () {
    document.addEventListener('keydown', this.onKeydown)
    if (this.modelValue) {
      this.lockScroll()
      this.$nextTick(() => {
        if (this.$refs.dialog) this.$refs.dialog.focus()
      })
    }
  },
  beforeUnmount () {
    document.removeEventListener('keydown', this.onKeydown)
    this.unlockScroll()
  },
  methods: {
    requestClose () {
      // Never dismiss while an action is in flight.
      if (this.busy) return
      this.$emit('update:modelValue', false)
      this.$emit('close')
    },
    onBackdrop () {
      if (!this.closeOnBackdrop) return
      this.requestClose()
    },
    onKeydown (e) {
      if (!this.modelValue) return
      if (e.key === 'Escape' && this.closeOnEsc) {
        this.requestClose()
      }
    },
    lockScroll () {
      if (typeof document === 'undefined') return
      this._prevOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
    },
    unlockScroll () {
      if (typeof document === 'undefined') return
      document.body.style.overflow = this._prevOverflow || ''
    }
  }
}
</script>

<style scoped>
.kadr-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(31, 36, 50, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 1rem;
}

.kadr-modal {
  background: var(--kadr-bg-surface);
  border-radius: var(--kadr-radius-lg);
  box-shadow: var(--kadr-shadow-lg);
  width: 100%;
  max-height: calc(100vh - 2rem);
  display: flex;
  flex-direction: column;
  outline: none;
}

.kadr-modal--sm { max-width: 380px; }
.kadr-modal--md { max-width: 520px; }
.kadr-modal--lg { max-width: 720px; }
.kadr-modal--xl { max-width: 960px; }

.kadr-modal__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 1rem 1.25rem 0.75rem;
  border-bottom: 1px solid var(--kadr-border);
}

.kadr-modal__title-wrap {
  min-width: 0;
}

.kadr-modal__title {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--kadr-text-primary);
}

.kadr-modal__close {
  flex-shrink: 0;
  border: none;
  background: transparent;
  color: var(--kadr-text-muted);
  font-size: 1.35rem;
  line-height: 1;
  cursor: pointer;
  padding: 0.15rem;
  border-radius: var(--kadr-radius-sm);
  transition: color var(--kadr-duration-fast) var(--kadr-ease), background var(--kadr-duration-fast) var(--kadr-ease);
}

.kadr-modal__close:hover:not(:disabled) {
  color: var(--kadr-text-primary);
  background: var(--kadr-surface-muted);
}

.kadr-modal__close:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.kadr-modal__body {
  padding: 1rem 1.25rem;
  overflow-y: auto;
}

.kadr-modal__foot {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  flex-wrap: wrap;
  padding: 0.75rem 1.25rem 1.1rem;
  border-top: 1px solid var(--kadr-border);
}

/* Entrance/exit — subtle, respects reduced motion via the shared media query below. */
.kadr-modal-fade-enter-active,
.kadr-modal-fade-leave-active {
  transition: opacity var(--kadr-duration, 0.22s) var(--kadr-ease, ease);
}

.kadr-modal-fade-enter-from,
.kadr-modal-fade-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .kadr-modal-fade-enter-active,
  .kadr-modal-fade-leave-active {
    transition: none;
  }
}

@media (max-width: 575px) {
  .kadr-modal__foot .btn {
    width: 100%;
  }
}
</style>
