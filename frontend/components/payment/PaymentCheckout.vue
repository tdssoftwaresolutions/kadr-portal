<template>
  <div v-if="visible" class="payment-checkout-overlay" @click.self="$emit('close')">
    <div class="payment-checkout-card" role="dialog" aria-labelledby="paymentCheckoutTitle">
      <h3 id="paymentCheckoutTitle">{{ title }}</h3>
      <p v-if="subtitle" class="text-muted small">{{ subtitle }}</p>

      <div class="payment-summary">
        <div class="payment-summary-row">
          <span>Amount</span>
          <strong>₹{{ formattedAmount }}</strong>
        </div>
        <div class="payment-summary-row">
          <span>Payment partner</span>
          <strong>{{ gatewayLabel }}</strong>
        </div>
      </div>

      <p class="payment-note small text-muted">
        You will be redirected to {{ gatewayLabel }} to complete payment securely. We do not store card or UPI details on our servers.
      </p>

      <div v-if="errorMessage" class="alert alert-danger py-2 px-3 small" role="alert">{{ errorMessage }}</div>

      <div class="payment-checkout-actions">
        <button type="button" class="btn btn-secondary" :disabled="processing" @click="$emit('close')">Cancel</button>
        <button type="button" class="btn btn-primary" :disabled="processing || !gateway" @click="startPayment">
          <span v-if="processing" class="spinner-border spinner-border-sm me-2" role="status"></span>
          {{ processing ? 'Redirecting…' : `Pay ₹${formattedAmount}` }}
        </button>
      </div>
    </div>
  </div>
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
        this.loadConfig()
      }
    }
  },
  methods: {
    async loadConfig () {
      try {
        const res = await this.$store.dispatch('getPaymentConfig')
        this.gateway = res.gateway || res.data?.gateway
      } catch (e) {
        this.errorMessage = 'Unable to load payment configuration.'
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
      } catch (e) {
        this.errorMessage = e.message || 'Payment could not be started. Please try again.'
        this.processing = false
      }
    }
  }
}
</script>

<style scoped>
.payment-checkout-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 1rem;
}
.payment-checkout-card {
  background: var(--kadr-bg-surface, #fff);
  border-radius: var(--kadr-radius, 12px);
  padding: 1.5rem;
  width: 100%;
  max-width: 440px;
  box-shadow: var(--kadr-shadow-md, 0 4px 12px rgba(0, 0, 0, 0.12));
}
.payment-summary {
  background: var(--kadr-bg-page, #f3f7fd);
  border-radius: 8px;
  padding: 1rem;
  margin: 1rem 0;
}
.payment-summary-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.25rem 0;
}
.payment-checkout-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
  margin-top: 1rem;
}
.payment-note {
  margin-bottom: 0;
}
</style>
