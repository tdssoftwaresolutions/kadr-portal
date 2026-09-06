<template>
  <teleport to="body">
  <transition name="payment-modal">
    <div
      v-if="visible"
      class="payment-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="paymentCheckoutTitle"
      @click.self="onOverlayClick"
      @keydown.esc="onEscKey"
      @wheel="onOverlayWheel"
      @touchmove="onOverlayTouch"
      tabindex="-1"
      ref="overlay"
    >
      <div class="payment-card">

        <!-- Header -->
        <div class="payment-card__header">
          <div class="payment-card__icon" aria-hidden="true">
            <i class="ri-secure-payment-line"></i>
          </div>
          <div>
            <h3 id="paymentCheckoutTitle" class="payment-card__title">{{ title }}</h3>
            <p v-if="subtitle" class="payment-card__subtitle">{{ subtitle }}</p>
          </div>
          <button
            type="button"
            class="payment-card__close"
            aria-label="Close"
            :disabled="processing"
            @click="$emit('close')"
          >
            <i class="ri-close-line"></i>
          </button>
        </div>

        <!-- Amount callout -->
        <div class="payment-amount-callout">
          <span class="payment-amount-callout__label">Total due</span>
          <span class="payment-amount-callout__value">₹{{ formattedAmount }}</span>
        </div>

        <!-- Summary rows -->
        <div class="payment-summary">
          <div class="payment-summary__row">
            <span class="payment-summary__key">
              <i class="ri-bank-card-line" aria-hidden="true"></i>
              Payment partner
            </span>
            <span class="payment-summary__val">
              <span v-if="gateway" class="payment-gateway-badge">{{ gatewayLabel }}</span>
              <span v-else class="payment-summary__loading">
                <kadr-spinner size="sm" />
              </span>
            </span>
          </div>
          <div class="payment-summary__row">
            <span class="payment-summary__key">
              <i class="ri-shield-check-line" aria-hidden="true"></i>
              Security
            </span>
            <span class="payment-summary__val payment-summary__secure">256-bit TLS encrypted</span>
          </div>
        </div>

        <!-- Trust note -->
        <p class="payment-trust-note">
          <i class="ri-lock-line" aria-hidden="true"></i>
          Your card and UPI details are entered directly on {{ gatewayLabel || 'the payment page' }} — we never see or store them.
        </p>

        <!-- Error -->
        <div
          v-if="errorMessage"
          class="payment-error"
          role="alert"
        >
          <i class="ri-error-warning-line" aria-hidden="true"></i>
          <span>{{ errorMessage }}</span>
          <button
            v-if="!gateway && !processing"
            type="button"
            class="payment-error__retry"
            @click="loadConfig"
          >
            Retry
          </button>
        </div>

        <!-- Actions -->
        <div class="payment-card__actions">
          <button
            type="button"
            class="btn btn-secondary payment-btn-cancel"
            :disabled="processing"
            @click="$emit('close')"
          >
            Cancel
          </button>
          <button
            type="button"
            class="btn btn-primary payment-btn-pay"
            :disabled="processing || !gateway"
            @click="startPayment"
          >
            <kadr-spinner v-if="processing" size="sm" class="me-2" />
            <i v-else class="ri-arrow-right-line me-1" aria-hidden="true"></i>
            {{ processing ? 'Redirecting…' : `Pay ₹${formattedAmount}` }}
          </button>
        </div>

      </div>
    </div>
  </transition>
  </teleport>
</template>

<script>
import { launchPaymentCheckout, gatewayDisplayName } from '../../utils/paymentCheckout'

export default {
  name: 'PaymentCheckout',
  props: {
    visible: { type: Boolean, default: false },
    purpose: { type: String, required: true },
    caseId: { type: String, default: null },
    amountInr: { type: Number, default: null },
    title: { type: String, default: 'Complete payment' },
    subtitle: { type: String, default: '' }
  },
  emits: ['close'],
  data () {
    return {
      processing: false,
      errorMessage: '',
      gateway: null
    }
  },
  computed: {
    formattedAmount () {
      const n = Number(this.amountInr || 0)
      return n.toLocaleString('en-IN')
    },
    gatewayLabel () {
      return gatewayDisplayName(this.gateway)
    }
  },
  watch: {
    visible (v) {
      if (v) {
        this.errorMessage = ''
        this.lockScroll()
        this.loadConfig()
        this.$nextTick(() => {
          this.$refs.overlay?.focus()
        })
      } else {
        this.unlockScroll()
      }
    }
  },
  beforeUnmount () {
    this.unlockScroll()
  },
  methods: {
    lockScroll () {
      // Store current scroll position so we can restore it on unlock.
      // Technique: set position:fixed on body with a top offset equal to the
      // current scroll — this is the only cross-browser approach that works
      // regardless of which element is the actual scroll container.
      const scrollY = window.scrollY
      document.body.style.position = 'fixed'
      document.body.style.top = `-${scrollY}px`
      document.body.style.width = '100%'
      document.body.style.overflowY = 'scroll' // keep scrollbar width to avoid layout shift
      document.body.dataset.scrollY = scrollY
    },
    unlockScroll () {
      const scrollY = parseInt(document.body.dataset.scrollY || '0', 10)
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.width = ''
      document.body.style.overflowY = ''
      delete document.body.dataset.scrollY
      // Restore the scroll position silently.
      window.scrollTo(0, scrollY)
    },
    onOverlayWheel (e) {
      // Block scroll on the dark backdrop itself; allow scroll inside the card.
      if (!this.$refs.overlay) return
      const card = this.$refs.overlay.querySelector('.payment-card')
      if (card && card.contains(e.target)) return
      e.preventDefault()
    },
    onOverlayTouch (e) {
      if (!this.$refs.overlay) return
      const card = this.$refs.overlay.querySelector('.payment-card')
      if (card && card.contains(e.target)) return
      e.preventDefault()
    },
    onOverlayClick () {
      if (this.processing) return
      this.$emit('close')
    },
    onEscKey () {
      if (this.processing) return
      this.$emit('close')
    },
    async loadConfig () {
      this.errorMessage = ''
      this.gateway = null
      try {
        const res = await this.$store.dispatch('getPaymentConfig')
        this.gateway = res.gateway || res.data?.gateway
        if (!this.gateway) {
          this.errorMessage = 'Payment is temporarily unavailable. Please try again.'
        }
      } catch (e) {
        this.errorMessage = 'Unable to load payment configuration. Please try again.'
      }
    },
    async startPayment () {
      this.processing = true
      this.errorMessage = ''
      try {
        const payload = { purpose: this.purpose }
        if (this.caseId) payload.caseId = this.caseId
        if (this.amountInr != null) payload.amount = this.amountInr

        const res = await this.$store.dispatch('initiatePayment', payload)
        if (!res.success) {
          throw new Error(res.error?.message || 'Could not start payment')
        }
        const checkout = res.checkout || res.data?.checkout
        await launchPaymentCheckout(checkout)
        // SDK-mode (e.g. Cashfree in-page) can resolve without navigating away.
        // Reset processing so the user can retry if they close the payment sheet.
        this.processing = false
      } catch (e) {
        this.errorMessage = e.message || 'Payment could not be started. Please try again.'
        this.processing = false
      }
    }
  }
}
</script>

<style scoped>
/* ── Overlay ── */
.payment-overlay {
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(3px);
  -webkit-backdrop-filter: blur(3px);
  outline: none; /* remove focus ring on the backdrop */
}

/* ── Card ── */
.payment-card {
  background: var(--kadr-bg-surface, #fff);
  border-radius: 16px;
  width: 100%;
  max-width: 420px;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.18), 0 4px 16px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  /* prevent the card itself from being taller than the viewport */
  max-height: calc(100vh - 2rem);
  overflow-y: auto;
}

/* ── Header ── */
.payment-card__header {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 1.25rem 1.25rem 0;
}

.payment-card__icon {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: var(--kadr-primary-soft, #eef3ff);
  color: var(--kadr-primary, #3b5bdb);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  margin-top: 2px;
}

.payment-card__title {
  font-size: 1rem;
  font-weight: 700;
  margin: 0 0 0.2rem;
  color: var(--kadr-text-main, #1a1a2e);
  line-height: 1.3;
}

.payment-card__subtitle {
  font-size: 0.82rem;
  color: var(--kadr-text-muted, #6b7280);
  margin: 0;
  line-height: 1.4;
}

.payment-card__close {
  margin-left: auto;
  flex-shrink: 0;
  background: none;
  border: none;
  padding: 0.25rem;
  cursor: pointer;
  color: var(--kadr-text-muted, #6b7280);
  font-size: 1.1rem;
  border-radius: 6px;
  line-height: 1;
  transition: background 0.15s, color 0.15s;
}
.payment-card__close:hover:not(:disabled) {
  background: var(--kadr-bg-page, #f3f4f6);
  color: var(--kadr-text-main, #1a1a2e);
}
.payment-card__close:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* ── Amount callout ── */
.payment-amount-callout {
  margin: 1rem 1.25rem 0;
  background: var(--kadr-primary-soft, #eef3ff);
  border: 1px solid var(--kadr-primary-soft-border, #c5d0fa);
  border-radius: 10px;
  padding: 0.85rem 1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.payment-amount-callout__label {
  font-size: 0.78rem;
  color: var(--kadr-text-label, #6b7280);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.payment-amount-callout__value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--kadr-primary, #3b5bdb);
  letter-spacing: -0.02em;
}

/* ── Summary rows ── */
.payment-summary {
  margin: 0.85rem 1.25rem 0;
  border: 1px solid var(--kadr-border, #e5e7eb);
  border-radius: 10px;
  overflow: hidden;
}

.payment-summary__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.6rem 0.85rem;
  font-size: 0.84rem;
}

.payment-summary__row + .payment-summary__row {
  border-top: 1px solid var(--kadr-border, #e5e7eb);
}

.payment-summary__key {
  color: var(--kadr-text-muted, #6b7280);
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.payment-summary__val {
  font-weight: 600;
  color: var(--kadr-text-main, #1a1a2e);
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.payment-summary__loading {
  display: flex;
  align-items: center;
}

.payment-summary__secure {
  color: var(--kadr-success, #2e7d32);
  font-size: 0.8rem;
}

.payment-gateway-badge {
  background: var(--kadr-bg-page, #f3f4f6);
  border: 1px solid var(--kadr-border, #e5e7eb);
  border-radius: 6px;
  padding: 0.15rem 0.5rem;
  font-size: 0.78rem;
  font-weight: 600;
}

/* ── Trust note ── */
.payment-trust-note {
  margin: 0.85rem 1.25rem 0;
  font-size: 0.78rem;
  color: var(--kadr-text-muted, #9ca3af);
  display: flex;
  align-items: flex-start;
  gap: 0.35rem;
  line-height: 1.45;
}
.payment-trust-note i {
  margin-top: 1px;
  flex-shrink: 0;
}

/* ── Error ── */
.payment-error {
  margin: 0.85rem 1.25rem 0;
  background: var(--kadr-error-soft, #fef2f2);
  border: 1px solid var(--kadr-error-border, #fecaca);
  border-radius: 8px;
  padding: 0.6rem 0.85rem;
  font-size: 0.83rem;
  color: var(--kadr-error, #dc2626);
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.payment-error i {
  flex-shrink: 0;
  font-size: 1rem;
}

.payment-error span {
  flex: 1;
}

.payment-error__retry {
  background: none;
  border: 1px solid currentColor;
  border-radius: 5px;
  color: inherit;
  font-size: 0.78rem;
  padding: 0.15rem 0.5rem;
  cursor: pointer;
  white-space: nowrap;
}
.payment-error__retry:hover {
  background: rgba(220, 38, 38, 0.08);
}

/* ── Actions ── */
.payment-card__actions {
  display: flex;
  gap: 0.6rem;
  padding: 1rem 1.25rem 1.25rem;
  margin-top: 0.5rem;
}

.payment-btn-cancel {
  flex-shrink: 0;
}

.payment-btn-pay {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ── Enter/leave transition ── */
.payment-modal-enter-active {
  transition: opacity 0.2s ease;
}
.payment-modal-leave-active {
  transition: opacity 0.15s ease;
}
.payment-modal-enter-from,
.payment-modal-leave-to {
  opacity: 0;
}

.payment-modal-enter-active .payment-card {
  animation: payment-card-in 0.22s cubic-bezier(0.34, 1.4, 0.64, 1) both;
}
.payment-modal-leave-active .payment-card {
  animation: payment-card-out 0.15s ease both;
}

@keyframes payment-card-in {
  from { transform: translateY(12px) scale(0.97); opacity: 0; }
  to   { transform: translateY(0)    scale(1);    opacity: 1; }
}
@keyframes payment-card-out {
  from { transform: translateY(0)   scale(1);    opacity: 1; }
  to   { transform: translateY(6px) scale(0.98); opacity: 0; }
}
</style>
