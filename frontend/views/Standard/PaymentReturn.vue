<template>
  <div class="payment-return-page">
    <div class="payment-return-card">

      <!-- Verifying -->
      <div v-if="loading" class="text-center py-4">
        <kadr-spinner size="lg" class="mb-3" />
        <p>{{ $t('paymentReturn.verifying') }}</p>
      </div>

      <!-- Success -->
      <div v-else-if="success" class="text-center">
        <i class="ri-checkbox-circle-fill text-success payment-return-icon"></i>
        <h3>{{ $t('paymentReturn.successTitle') }}</h3>
        <p class="text-muted">{{ $t('paymentReturn.successBody') }}</p>
        <router-link class="btn btn-primary mt-3" :to="redirectTo">{{ $t('paymentReturn.continue') }}</router-link>
      </div>

      <!-- Pending / processing -->
      <div v-else-if="pending" class="text-center">
        <i class="ri-time-line text-warning payment-return-icon"></i>
        <h3>{{ $t('paymentReturn.processingTitle') }}</h3>
        <p class="text-muted">
          {{ $t('paymentReturn.processingBody') }}
        </p>
        <p v-if="orderId" class="small text-muted mb-3">{{ $t('paymentReturn.orderReference', { id: orderId }) }}</p>
        <div class="d-flex align-items-center justify-content-center gap-2 text-muted small mb-3">
          <kadr-spinner size="sm" />
          <span>{{ $t('paymentReturn.checkingStatus') }}{{ pollDots }}</span>
        </div>
        <p class="small text-muted">
          {{ $t('paymentReturn.safeToClose') }}
        </p>
        <router-link class="btn btn-outline-secondary btn-sm mt-2" to="/">{{ $t('paymentReturn.goToDashboard') }}</router-link>
      </div>

      <!-- Failed / not completed -->
      <div v-else class="text-center">
        <i class="ri-close-circle-fill text-danger payment-return-icon"></i>
        <h3>{{ $t('paymentReturn.notCompletedTitle') }}</h3>
        <p class="text-muted">
          {{ errorMessage || $t('paymentReturn.notCompletedBody') }}
        </p>
        <p v-if="orderId" class="small text-muted">{{ $t('paymentReturn.orderReference', { id: orderId }) }}</p>
        <router-link class="btn btn-primary mt-3" to="/">{{ $t('paymentReturn.backToDashboard') }}</router-link>
      </div>

    </div>
  </div>
</template>

<script>
import { sofbox } from '../../config/pluginInit'

const POLL_INTERVAL_MS = 5000 // check every 5 s
const POLL_MAX_ATTEMPTS = 12 // give up after 60 s (5 × 12)

export default {
  name: 'PaymentReturn',
  data () {
    return {
      loading: true,
      success: false,
      pending: false,
      errorMessage: '',
      orderId: null,
      purpose: null,
      // polling
      pollAttempts: 0,
      pollTimer: null,
      pollDots: ''
    }
  },
  computed: {
    redirectTo () {
      if (this.purpose === 'MEDIATOR_PRO') return '/user/profile-edit'
      return '/'
    }
  },
  async mounted () {
    sofbox.index()
    const q = this.$route.query
    this.orderId = q.order_id || q.orderId
    const statusHint = (q.status || '').toLowerCase()

    if (statusHint === 'failed' && !this.orderId) {
      this.loading = false
      this.errorMessage = this.$t('paymentReturn.cancelledOrFailed')
      return
    }

    if (!this.orderId) {
      this.loading = false
      this.errorMessage = this.$t('paymentReturn.missingReference')
      return
    }

    await this.verifyOnce()
  },
  beforeUnmount () {
    this.stopPolling()
  },
  methods: {
    async verifyOnce () {
      try {
        const res = await this.$store.dispatch('verifyPayment', {
          orderId: this.orderId,
          gatewayPayload: { gateway: this.$route.query.gateway }
        })

        if (res.pending) {
          // Payment is still in-flight — show the pending screen and start polling.
          this.pending = true
          this.startPolling()
          return
        }

        this.success = res.success
        this.purpose = res.purpose || res.data?.purpose
        if (!this.success) {
          this.errorMessage = res.error?.message || this.$t('paymentReturn.verificationFailed')
        } else {
          this.$store.commit('invalidateDashboardCaches')
        }
      } catch (e) {
        this.success = false
        this.errorMessage = e.message || this.$t('paymentReturn.verificationFailed')
      } finally {
        this.loading = false
      }
    },

    startPolling () {
      // Animate the "Checking status..." dots while polling.
      let dotCount = 0
      this._dotsTimer = setInterval(() => {
        dotCount = (dotCount + 1) % 4
        this.pollDots = '.'.repeat(dotCount)
      }, 500)

      this.pollTimer = setInterval(async () => {
        this.pollAttempts += 1
        if (this.pollAttempts > POLL_MAX_ATTEMPTS) {
          this.stopPolling()
          // Still pending after max wait — leave the pending screen up but
          // stop the spinner and tell the user to check their dashboard.
          this.pollDots = ''
          return
        }

        try {
          const res = await this.$store.dispatch('verifyPayment', {
            orderId: this.orderId,
            gatewayPayload: { gateway: this.$route.query.gateway }
          })

          if (res.pending) return // still waiting — keep polling

          // Terminal state reached.
          this.stopPolling()
          this.pending = false
          this.success = res.success
          this.purpose = res.purpose || res.data?.purpose
          if (this.success) {
            this.$store.commit('invalidateDashboardCaches')
          } else {
            this.errorMessage = res.error?.message || this.$t('paymentReturn.paymentNotCompleted')
          }
        } catch {
          // Network hiccup — keep polling, don't flip to error state yet.
        }
      }, POLL_INTERVAL_MS)
    },

    stopPolling () {
      if (this.pollTimer) {
        clearInterval(this.pollTimer)
        this.pollTimer = null
      }
      if (this._dotsTimer) {
        clearInterval(this._dotsTimer)
        this._dotsTimer = null
      }
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
  background: var(--kadr-bg-surface);
  border-radius: 12px;
  padding: 2rem;
  max-width: 480px;
  width: 100%;
  box-shadow: var(--kadr-shadow-md);
}
.payment-return-icon {
  font-size: 3rem;
  display: block;
  margin-bottom: 1rem;
}
</style>
