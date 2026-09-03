<template>
  <div v-if="visible" class="modal-overlay" @click="$emit('close')">
    <div class="modal-content" @click.stop>
      <h3>{{ title }}</h3>
      <p v-if="subtitle" class="text-muted small">{{ subtitle }}</p>
      <form class="payment-form" @submit.prevent="$emit('submit', paymentData)">
        <div class="form-group">
          <label>Card Number</label>
          <input v-model="paymentData.cardNumber" type="text" placeholder="1234 5678 9012 3456" required>
        </div>
        <div class="form-group">
          <label>Expiry Date</label>
          <input v-model="paymentData.expiryDate" type="text" placeholder="MM/YY" required>
        </div>
        <div class="form-group">
          <label>CVV</label>
          <input v-model="paymentData.cvv" type="text" placeholder="123" required>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" @click="$emit('close')" :disabled="processing">Cancel</button>
          <button type="submit" class="btn btn-primary" :disabled="processing">
            <span v-if="processing" class="spinner-border spinner-border-sm me-2" role="status"></span>
            {{ processing ? 'Processing...' : payLabel }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script>
export default {
  name: 'FakePaymentModal',
  props: {
    visible: { type: Boolean, default: false },
    amountInr: { type: Number, default: 1000 },
    title: { type: String, default: 'Payment Details' },
    subtitle: { type: String, default: '' },
    processing: { type: Boolean, default: false }
  },
  data () {
    return {
      paymentData: { cardNumber: '', expiryDate: '', cvv: '' }
    }
  },
  computed: {
    payLabel () {
      return `Pay Rs. ${this.amountInr.toLocaleString()}`
    }
  },
  watch: {
    visible (v) {
      if (!v) this.paymentData = { cardNumber: '', expiryDate: '', cvv: '' }
    }
  }
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}
.modal-content {
  background: #fff;
  border-radius: 12px;
  padding: 1.5rem;
  width: 100%;
  max-width: 420px;
}
.payment-form .form-group {
  margin-bottom: 1rem;
}
.payment-form label {
  display: block;
  font-size: 0.85rem;
  margin-bottom: 0.25rem;
}
.payment-form input {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid #ced4da;
  border-radius: 6px;
}
.modal-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
  margin-top: 1rem;
}
</style>
