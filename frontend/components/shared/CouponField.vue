<template>
  <div class="coupon-field">
    <label :for="inputId" class="field-label">
      {{ label }}
      <span class="field-optional">(optional)</span>
    </label>
    <div class="coupon-input-wrap" :class="{ 'has-value': !!trimmed }">
      <i class="ri-coupon-3-line coupon-input-icon" aria-hidden="true"></i>
      <input
        :id="inputId"
        type="text"
        class="app-input coupon-input text-uppercase"
        :value="modelValue"
        :placeholder="placeholder"
        :maxlength="maxlength"
        autocomplete="off"
        spellcheck="false"
        @input="onInput"
      />
      <button
        v-if="trimmed"
        type="button"
        class="coupon-clear"
        aria-label="Clear code"
        @click="clear"
      >
        <i class="ri-close-line" aria-hidden="true"></i>
      </button>
    </div>

    <div v-if="loading" class="coupon-status">
      <span class="coupon-spinner" aria-hidden="true"></span>
      Checking code…
    </div>

    <transition name="coupon-fade">
      <div
        v-if="!loading && preview"
        class="coupon-preview"
        :class="previewClass"
      >
        <span class="coupon-preview-icon">
          <i :class="preview.icon" aria-hidden="true"></i>
        </span>
        <span class="coupon-preview-text">
          <strong class="coupon-preview-headline">{{ preview.headline }}</strong>
          <span v-if="preview.detail" class="coupon-preview-detail">{{ preview.detail }}</span>
        </span>
        <span class="coupon-preview-badge">{{ preview.code }}</span>
      </div>
    </transition>

    <p v-if="hint && !preview && !loading" class="field-hint">{{ hint }}</p>
  </div>
</template>

<script>
export default {
  name: 'CouponField',
  props: {
    modelValue: { type: String, default: '' },
    label: { type: String, default: 'Referral or coupon code' },
    placeholder: { type: String, default: 'e.g. WELCOME10' },
    hint: { type: String, default: 'Have an invite or offer code? Add it to see your reward.' },
    maxlength: { type: Number, default: 40 },
    inputId: { type: String, default: 'couponCode' }
  },
  emits: ['update:modelValue'],
  data () {
    return {
      loading: false,
      preview: null,
      lookupTimer: null,
      // Guards against out-of-order responses when the user types quickly.
      lookupSeq: 0
    }
  },
  computed: {
    trimmed () {
      return String(this.modelValue || '').trim()
    },
    previewClass () {
      if (!this.preview) return ''
      if (this.preview.kind === 'invalid') return 'coupon-preview--invalid'
      if (this.preview.kind === 'referral') return 'coupon-preview--referral'
      return 'coupon-preview--promo'
    }
  },
  watch: {
    modelValue: {
      immediate: true,
      handler () {
        this.scheduleLookup()
      }
    }
  },
  beforeUnmount () {
    clearTimeout(this.lookupTimer)
  },
  methods: {
    onInput (event) {
      // Normalise to uppercase, no spaces — matches how codes are stored/displayed.
      const next = String(event.target.value || '').toUpperCase().replace(/\s+/g, '')
      this.$emit('update:modelValue', next)
    },
    clear () {
      this.$emit('update:modelValue', '')
    },
    scheduleLookup () {
      clearTimeout(this.lookupTimer)
      const code = this.trimmed
      if (!code) {
        this.loading = false
        this.preview = null
        return
      }
      this.loading = true
      this.lookupTimer = setTimeout(() => this.runLookup(code), 350)
    },
    async runLookup (code) {
      const seq = ++this.lookupSeq
      const res = await this.$store.dispatch('lookupSignupCoupon', { code })
      // Ignore stale responses (user kept typing / cleared the field).
      if (seq !== this.lookupSeq || this.trimmed !== code) return
      this.loading = false
      this.preview = this.toPreview(res && res.result)
    },
    toPreview (result) {
      if (!result || !result.found) {
        // Unknown code — do not block signup; just show a neutral note.
        return {
          kind: 'invalid',
          icon: 'ri-error-warning-line',
          code: this.trimmed,
          headline: "We couldn't find this code",
          detail: 'Double-check the code, or continue without one.'
        }
      }
      if (result.type === 'referral') {
        return {
          kind: 'referral',
          icon: 'ri-user-add-line',
          code: result.code,
          headline: `Referral success — invited by ${result.referrerName}`,
          detail: 'You and your referrer may both earn a reward once your account is approved.'
        }
      }
      // Company coupon.
      if (result.valid) {
        const days = Number(result.premiumDays) || 0
        return {
          kind: 'promo',
          icon: 'ri-gift-2-line',
          code: result.code,
          headline: result.title,
          detail: [
            result.description,
            days > 0 ? `Includes ${days} day${days === 1 ? '' : 's'} of Pro on approval.` : ''
          ].filter(Boolean).join(' ')
        }
      }
      // Found but not usable (inactive / limit reached).
      return {
        kind: 'invalid',
        icon: 'ri-error-warning-line',
        code: result.code,
        headline: result.reason === 'exhausted' ? 'This coupon has reached its limit' : 'This coupon is no longer active',
        detail: 'You can continue without a code.'
      }
    }
  }
}
</script>

<style scoped>
.coupon-field {
  display: block;
}

.field-label {
  display: block;
  font-size: 0.8125rem;
  font-weight: 600;
  color: #344054;
  margin-bottom: 0.375rem;
}

.field-optional {
  font-weight: 500;
  color: #98a2b3;
}

.coupon-input-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.coupon-input-icon {
  position: absolute;
  left: 0.75rem;
  color: #98a2b3;
  font-size: 1.05rem;
  pointer-events: none;
}

.coupon-input-wrap.has-value .coupon-input-icon {
  color: var(--kadr-primary);
}

.coupon-input {
  padding-left: 2.35rem;
  letter-spacing: 0.04em;
}

.coupon-clear {
  position: absolute;
  right: 0.5rem;
  border: none;
  background: #f2f4f7;
  color: #667085;
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.15s ease;
}

.coupon-clear:hover {
  background: #e4e7ec;
  color: #344054;
}

.coupon-preview {
  display: flex;
  align-items: flex-start;
  gap: 0.65rem;
  margin-top: 0.6rem;
  padding: 0.7rem 0.8rem;
  border-radius: 10px;
  border: 1px solid transparent;
}

.coupon-preview--promo {
  background: #ecfdf3;
  border-color: #abefc6;
}

.coupon-preview--referral {
  background: #eff4ff;
  border-color: #b2ccff;
}

.coupon-preview--invalid {
  background: #fffaeb;
  border-color: #fde3a7;
}

.coupon-preview--invalid .coupon-preview-icon { color: #b54708; }

.coupon-status {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  margin-top: 0.6rem;
  font-size: 0.8rem;
  color: #667085;
}

.coupon-spinner {
  width: 0.9rem;
  height: 0.9rem;
  border: 2px solid #e4e7ec;
  border-top-color: var(--kadr-primary);
  border-radius: 50%;
  animation: coupon-spin 0.6s linear infinite;
}

@keyframes coupon-spin {
  to { transform: rotate(360deg); }
}

.coupon-preview-icon {
  flex-shrink: 0;
  width: 2rem;
  height: 2rem;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  background: #fff;
}

.coupon-preview--promo .coupon-preview-icon { color: #067647; }
.coupon-preview--referral .coupon-preview-icon { color: #2e5aac; }

.coupon-preview-text {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  min-width: 0;
}

.coupon-preview-headline {
  font-size: 0.85rem;
  color: #101828;
  line-height: 1.3;
}

.coupon-preview-detail {
  font-size: 0.75rem;
  color: #475467;
  line-height: 1.35;
}

.coupon-preview-badge {
  margin-left: auto;
  align-self: center;
  flex-shrink: 0;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  padding: 0.15rem 0.5rem;
  border-radius: 6px;
  background: #fff;
  color: #344054;
  border: 1px dashed #d0d5dd;
}

.field-hint {
  font-size: 0.75rem;
  color: #98a2b3;
  margin: 0.375rem 0 0;
}

.coupon-fade-enter-active,
.coupon-fade-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}
.coupon-fade-enter-from,
.coupon-fade-leave-to {
  opacity: 0;
  transform: translateY(-3px);
}
</style>
