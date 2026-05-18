<template>
  <div>
    <iq-card class="reward-store-card mb-4">
      <template v-slot:headerTitle>
        <h4 class="card-title mb-0">Reward Store</h4>
      </template>
      <template v-slot:body>
        <div class="reward-balance-banner mb-4">
          <div>
            <span class="balance-label">Your balance</span>
            <div class="balance-value">{{ balance.toLocaleString() }} <small>pts</small></div>
          </div>
        </div>

        <div class="referral-block mb-4 p-3 border rounded">
          <h6 class="mb-2">Invite a mediator</h6>
          <p class="small text-muted mb-2">
            Share your referral code. When they sign up and are approved, you earn referral points.
          </p>
          <div class="d-flex flex-wrap align-items-center">
            <code class="referral-code mr-2 mb-2">{{ referralCode || '—' }}</code>
            <b-button size="sm" variant="outline-primary" class="mb-2" @click="copyReferral">
              {{ copied ? 'Copied' : 'Copy code' }}
            </b-button>
          </div>
        </div>
      </template>
    </iq-card>

    <h5 class="mb-3">Redeem rewards</h5>
    <p v-if="loading" class="text-muted">Loading rewards…</p>
    <div v-else-if="sortedCatalog.length" class="reward-catalog-grid">
      <div
        v-for="item in sortedCatalog"
        :key="item.id"
        class="reward-catalog-card"
        :class="{ 'reward-catalog-card--locked': !item.eligible }"
      >
        <div class="reward-catalog-card__inner">
          <h6 class="reward-catalog-card__title">{{ item.title }}</h6>
          <p v-if="item.description" class="reward-catalog-card__desc small text-muted">{{ item.description }}</p>
          <p class="reward-catalog-card__cost mb-2"><strong>{{ item.points_cost.toLocaleString() }}</strong> points</p>
          <b-button
            v-if="item.eligible"
            size="sm"
            variant="primary"
            :disabled="redeemingId === item.id"
            @click="redeem(item)"
          >
            Redeem
          </b-button>
          <div v-if="!item.eligible" class="reward-catalog-card__locked">
            Need {{ (item.points_cost - balance).toLocaleString() }} more pts to redeem
          </div>
        </div>
      </div>
    </div>
    <div v-else class="empty-data py-3">No rewards available yet. Check back soon.</div>

    <iq-card class="mt-4">
      <template v-slot:headerTitle>
        <h4 class="card-title mb-0">Points history</h4>
      </template>
      <template v-slot:body>
        <b-table
          v-if="transactions.length"
          :items="transactions"
          :fields="tableFields"
          small
          responsive
          striped
        >
          <template #cell(points)="row">
            <span :class="row.item.points < 0 ? 'text-danger' : 'text-success'">
              {{ row.item.points > 0 ? '+' : '' }}{{ row.item.points.toLocaleString() }}
            </span>
          </template>
        </b-table>
        <div v-else class="empty-data py-3">No reward activity yet.</div>
        <b-pagination
          v-if="total > perPage"
          v-model="page"
          :total-rows="total"
          :per-page="perPage"
          align="center"
          class="mt-3"
          @change="loadRewards"
        />
      </template>
    </iq-card>
  </div>
</template>

<script>
export default {
  name: 'MediatorRewardsPanel',
  props: {
    initialBalance: { type: Number, default: 0 }
  },
  data () {
    return {
      balance: this.initialBalance,
      catalog: [],
      transactions: [],
      total: 0,
      page: 1,
      perPage: 20,
      loading: false,
      referralCode: '',
      copied: false,
      redeemingId: null,
      tableFields: [
        { key: 'created_at', label: 'Date', formatter: this.formatDate },
        { key: 'description', label: 'Activity' },
        { key: 'points', label: 'Points', class: 'text-right' }
      ]
    }
  },
  computed: {
    sortedCatalog () {
      return [...this.catalog].sort((a, b) => {
        const costA = Number(a.points_cost) || 0
        const costB = Number(b.points_cost) || 0
        if (costA !== costB) return costA - costB
        return String(a.title || '').localeCompare(String(b.title || ''))
      })
    }
  },
  mounted () {
    this.loadRewards(1)
  },
  methods: {
    formatDate (value) {
      if (!value) return '—'
      return new Date(value).toLocaleString()
    },
    async loadRewards (page) {
      this.page = page || this.page
      this.loading = true
      try {
        const res = await this.$store.dispatch('getMyRewards', { page: this.page })
        if (res.success && res.data) {
          this.balance = res.data.balance ?? this.balance
          this.catalog = res.data.catalog || []
          this.transactions = res.data.transactions || []
          this.total = res.data.total || 0
          this.referralCode = res.data.referralCode || ''
        }
      } finally {
        this.loading = false
      }
    },
    async redeem (item) {
      if (!item.eligible) return
      if (!window.confirm(`Redeem ${item.points_cost.toLocaleString()} points for "${item.title}"?`)) return
      this.redeemingId = item.id
      try {
        const res = await this.$store.dispatch('redeemReward', { catalogItemId: item.id })
        if (res.success) {
          await this.loadRewards(this.page)
        }
      } finally {
        this.redeemingId = null
      }
    },
    async copyReferral () {
      if (!this.referralCode) return
      try {
        await navigator.clipboard.writeText(this.referralCode)
        this.copied = true
        setTimeout(() => { this.copied = false }, 2000)
      } catch (e) {
        this.$store.dispatch('alert/showAlert', { message: 'Could not copy. Select and copy the code manually.', type: 'warning' }, { root: true })
      }
    }
  }
}
</script>

<style scoped>
.reward-balance-banner {
  background: linear-gradient(135deg, #1a5f9e 0%, #2d8bc9 100%);
  color: #fff;
  border-radius: 12px;
  padding: 1.25rem 1.5rem;
}
.balance-label {
  font-size: 0.85rem;
  opacity: 0.9;
}
.balance-value {
  font-size: 2rem;
  font-weight: 700;
  line-height: 1.2;
}
.referral-code {
  font-size: 0.9rem;
  padding: 0.35rem 0.6rem;
  background: #f4f6f8;
  border-radius: 6px;
  word-break: break-all;
}
.reward-catalog-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 1rem;
}
.reward-catalog-card {
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid #e2e8f0;
  background: #fff;
}
.reward-catalog-card__inner {
  padding: 1rem;
  min-height: 140px;
  display: flex;
  flex-direction: column;
}
.reward-catalog-card__title {
  margin-bottom: 0.35rem;
  font-weight: 600;
}
.reward-catalog-card__desc {
  flex: 1;
  margin-bottom: 0.5rem;
}
.reward-catalog-card--locked {
  position: relative;
  border-color: #dee2e6;
  background: #fafbfc;
}
.reward-catalog-card--locked .reward-catalog-card__inner {
  opacity: 1;
}
.reward-catalog-card__locked {
  margin-top: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: #fff3cd;
  border-radius: 8px;
  font-weight: 600;
  color: #856404;
  text-align: center;
  font-size: 0.85rem;
}
.reward-catalog-card__locked small {
  font-weight: 400;
  margin-top: 0.25rem;
}
</style>
