<template>
  <div>
    <iq-card class="reward-store-card mb-4">
      <template v-slot:headerTitle>
        <h4 class="card-title mb-0">{{ $t('mediatorTools.rewardsStoreTitle') }}</h4>
      </template>
      <template v-slot:body>
        <div class="reward-balance-banner mb-4">
          <div>
            <span class="balance-label">{{ $t('mediatorTools.rewardsBalanceLabel') }}</span>
            <div class="balance-value">{{ balance.toLocaleString() }} <small>{{ $t('mediatorTools.rewardsPointsShort') }}</small></div>
          </div>
        </div>

        <div class="referral-block mb-4 p-3 border rounded">
          <h6 class="mb-2">{{ $t('mediatorTools.referralTitle') }}</h6>
          <p class="small text-muted mb-2">
            {{ $t('mediatorTools.referralDescription') }}
          </p>
          <div class="d-flex flex-wrap align-items-center">
            <code class="referral-code me-2 mb-2">{{ referralCode || '—' }}</code>
            <b-button size="sm" variant="outline-primary" class="mb-2" @click="copyReferral">
              {{ copied ? $t('mediatorTools.referralCopied') : $t('mediatorTools.referralCopy') }}
            </b-button>
          </div>
        </div>
      </template>
    </iq-card>

    <iq-card v-if="earningOptions.length" class="mb-4">
      <template v-slot:headerTitle>
        <h4 class="card-title mb-0">{{ $t('mediatorTools.earnTitle') }}</h4>
      </template>
      <template v-slot:body>
        <p class="small text-muted mb-3">
          {{ $t('mediatorTools.earnDescription') }}
        </p>
        <div class="earning-options-list">
          <div v-for="opt in earningOptions" :key="opt.reasonCode" class="earning-option-row">
            <div class="earning-option-row__points">+{{ opt.points.toLocaleString() }}</div>
            <div>
              <div class="earning-option-row__title">{{ opt.title }}</div>
              <div class="earning-option-row__desc small text-muted">{{ opt.description }}</div>
            </div>
          </div>
        </div>
      </template>
    </iq-card>

    <h5 class="mb-3">{{ $t('mediatorTools.redeemSectionTitle') }}</h5>
    <p v-if="loading" class="text-muted">{{ $t('mediatorTools.rewardsLoading') }}</p>
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
          <p class="reward-catalog-card__cost mb-2"><strong>{{ item.points_cost.toLocaleString() }}</strong> {{ $t('mediatorTools.rewardsPointsSuffix') }}</p>
          <b-button
            v-if="item.eligible"
            size="sm"
            variant="primary"
            :disabled="redeemingId === item.id"
            @click="redeem(item)"
          >
            {{ $t('mediatorTools.redeem') }}
          </b-button>
          <div v-if="!item.eligible" class="reward-catalog-card__locked">
            {{ $t('mediatorTools.redeemLocked', { points: (item.points_cost - balance).toLocaleString() }) }}
          </div>
        </div>
      </div>
    </div>
    <div v-else class="empty-data py-3">{{ $t('mediatorTools.rewardsEmpty') }}</div>

    <iq-card class="mt-4">
      <template v-slot:headerTitle>
        <h4 class="card-title mb-0">{{ $t('mediatorTools.historyTitle') }}</h4>
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
        <div v-else class="empty-data py-3">{{ $t('mediatorTools.historyEmpty') }}</div>
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
      earningOptions: [],
      copied: false,
      redeemingId: null
    }
  },
  computed: {
    tableFields () {
      return [
        { key: 'created_at', label: this.$t('mediatorTools.historyColDate'), formatter: this.formatDate },
        { key: 'description', label: this.$t('mediatorTools.historyColActivity') },
        { key: 'points', label: this.$t('mediatorTools.historyColPoints'), class: 'text-end' }
      ]
    },
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
      return this.$formatDateTime(value)
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
          this.earningOptions = res.data.earningOptions || []
        }
      } finally {
        this.loading = false
      }
    },
    async redeem (item) {
      if (!item.eligible) return
      if (!window.confirm(this.$t('mediatorTools.redeemConfirm', { points: item.points_cost.toLocaleString(), title: item.title }))) return
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
        this.$store.dispatch('alert/showAlert', { message: this.$t('mediatorTools.copyError'), type: 'warning' }, { root: true })
      }
    }
  }
}
</script>

<style scoped>
.reward-balance-banner {
  background: linear-gradient(135deg, var(--kadr-hero-from) 0%, var(--kadr-hero-to) 100%);
  color: var(--kadr-text-on-primary);
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
  background: var(--kadr-surface-muted);
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
  border: 1px solid var(--kadr-border-info);
  background: var(--kadr-bg-surface);
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
  border-color: var(--kadr-border-strong);
  background: var(--kadr-surface-muted);
}
.reward-catalog-card--locked .reward-catalog-card__inner {
  opacity: 1;
}
.reward-catalog-card__locked {
  margin-top: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: var(--kadr-status-warning-bg);
  border-radius: 8px;
  font-weight: 600;
  color: var(--kadr-status-warning-text);
  text-align: center;
  font-size: 0.85rem;
}
.reward-catalog-card__locked small {
  font-weight: 400;
  margin-top: 0.25rem;
}
.earning-options-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.earning-option-row {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
  padding: 0.75rem 0;
  border-bottom: 1px solid var(--kadr-border-info);
}
.earning-option-row:last-child {
  border-bottom: none;
}
.earning-option-row__points {
  min-width: 4rem;
  font-weight: 700;
  color: var(--kadr-primary);
  font-size: 1.05rem;
}
.earning-option-row__title {
  font-weight: 600;
  margin-bottom: 0.15rem;
}
</style>
