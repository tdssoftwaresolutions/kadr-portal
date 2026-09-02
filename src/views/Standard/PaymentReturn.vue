<template>
  <div class="payment-return-page">
    <div class="payment-return-card">
      <div v-if="loading" class="text-center py-4">
        <div class="spinner-border text-primary mb-3" role="status"></div>
        <p>Verifying your payment…</p>
      </div>
      <div v-else-if="success" class="text-center">
        <i class="ri-checkbox-circle-fill text-success payment-return-icon"></i>
        <h3>Payment successful</h3>
        <p class="text-muted">Your payment has been confirmed. You can return to your dashboard.</p>
        <router-link class="btn btn-primary mt-3" :to="redirectTo">Continue</router-link>
      </div>
      <div v-else class="text-center">
        <i class="ri-close-circle-fill text-danger payment-return-icon"></i>
        <h3>Payment not completed</h3>
        <p class="text-muted">{{ errorMessage || 'We could not verify your payment. If money was deducted, contact support with your order reference.' }}</p>
        <p v-if="orderId" class="small text-muted">Order reference: {{ orderId }}</p>
        <router-link class="btn btn-primary mt-3" to="/">Back to dashboard</router-link>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'PaymentReturn',
  data () {
    return {
      loading: true,
      success: false,
      errorMessage: '',
      orderId: null,
      purpose: null
    }
  },
  computed: {
    redirectTo () {
      if (this.purpose === 'MEDIATOR_PRO') return '/user/profile-edit'
      return '/'
    }
  },
  async mounted () {
    const q = this.$route.query
    this.orderId = q.order_id || q.orderId
    const statusHint = q.status

    if (statusHint === 'failed' && !this.orderId) {
      this.loading = false
      this.success = false
      this.errorMessage = 'Payment was cancelled or failed.'
      return
    }

    if (!this.orderId) {
      this.loading = false
      this.errorMessage = 'Missing payment order reference.'
      return
    }

    try {
      const res = await this.$store.dispatch('verifyPayment', {
        orderId: this.orderId,
        gatewayPayload: { gateway: q.gateway }
      })
      this.success = res.success
      this.purpose = res.purpose || res.data?.purpose
      if (!this.success) {
        this.errorMessage = res.error?.message || 'Verification failed'
      } else {
        this.$store.commit('invalidateDashboardCaches')
      }
    } catch (e) {
      this.success = false
      this.errorMessage = e.message || 'Verification failed'
    } finally {
      this.loading = false
    }
  }
}
</script>

<style scoped>
.payment-return-page {
  min-height: 60vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem 1rem;
}
.payment-return-card {
  background: #fff;
  border-radius: 12px;
  padding: 2rem;
  max-width: 480px;
  width: 100%;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}
.payment-return-icon {
  font-size: 3rem;
  display: block;
  margin-bottom: 1rem;
}
</style>
