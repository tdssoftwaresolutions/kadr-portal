<template>
  <b-container fluid>
    <kadr-page-header :title="$t('adminMediator360.title')" :subtitle="$t('adminMediator360.subtitle')">
      <template #actions>
        <b-button size="sm" variant="outline-secondary" @click="$router.back()">{{ $t('adminMediator360.back') }}</b-button>
      </template>
    </kadr-page-header>
    <iq-card>
      <template v-slot:body>
        <kadr-page-loader :show="loading" :message="$t('adminMediator360.loading')">
          <template v-if="!loading && data">
            <div class="d-flex flex-wrap align-items-center mb-3">
              <div>
                <h5 class="mb-1">{{ data.mediator.name }}</h5>
                <p class="text-muted mb-0">{{ data.mediator.email }}</p>
                <b-badge v-if="data.mediator.is_deleted" variant="secondary" class="me-1">{{ $t('adminMediator360.deleted') }}</b-badge>
                <b-badge :variant="data.mediator.active ? 'success' : 'warning'">
                  {{ data.mediator.active ? $t('adminMediator360.active') : $t('adminMediator360.inactive') }}
                </b-badge>
                <b-badge variant="info" class="ms-1">{{ data.mediator.subscription_tier || $t('adminMediator360.free') }}</b-badge>
              </div>
            </div>
            <b-alert model-value variant="info" class="small">{{ $t('adminMediator360.readOnlyNotice') }}</b-alert>

            <div class="mediator-360-summary mb-4">
              <div class="mediator-360-stat" v-for="stat in summaryStats" :key="stat.label">
                <span class="mediator-360-stat__value">{{ stat.value }}</span>
                <span class="mediator-360-stat__label">{{ stat.label }}</span>
              </div>
            </div>

            <b-tabs card>
              <b-tab :title="$t('adminMediator360.cases')" active>
                <div class="kadr-data-table-wrap">
                  <b-table :items="data.cases" :fields="caseFields" small responsive show-empty>
                    <template #empty>
                      <span class="text-muted">{{ $t('adminMediator360.noCases') }}</span>
                    </template>
                  </b-table>
                </div>
              </b-tab>
              <b-tab :title="$t('adminMediator360.kadrInvoices')">
                <div class="kadr-data-table-wrap">
                  <b-table :items="data.kadrInvoices" :fields="kadrInvFields" small responsive show-empty>
                    <template #empty>
                      <span class="text-muted">{{ $t('adminMediator360.noKadrInvoices') }}</span>
                    </template>
                  </b-table>
                </div>
              </b-tab>
              <b-tab :title="$t('adminMediator360.pendingPayoutsCount', { count: (data.pendingPayouts || []).length })">
                <div class="kadr-data-table-wrap">
                  <b-table :items="data.pendingPayouts" :fields="kadrInvFields" small responsive show-empty>
                    <template #empty>
                      <span class="text-muted">{{ $t('adminMediator360.noPendingPayouts') }}</span>
                    </template>
                  </b-table>
                </div>
              </b-tab>
              <b-tab :title="$t('adminMediator360.privateInvoices')">
                <div class="kadr-data-table-wrap">
                  <b-table :items="data.privateInvoices" :fields="privateInvFields" small responsive show-empty>
                    <template #empty>
                      <span class="text-muted">{{ $t('adminMediator360.noPrivateInvoices') }}</span>
                    </template>
                  </b-table>
                </div>
              </b-tab>
              <b-tab :title="$t('adminMediator360.rewards')">
                <div class="kadr-data-table-wrap">
                  <b-table :items="data.rewardOrders" :fields="rewardFields" small responsive show-empty>
                    <template #empty>
                      <span class="text-muted">{{ $t('adminMediator360.noRewardOrders') }}</span>
                    </template>
                  </b-table>
                </div>
              </b-tab>
              <b-tab :title="$t('adminMediator360.subscriptions')">
                <div class="kadr-data-table-wrap">
                  <b-table :items="data.subscriptions" :fields="subFields" small responsive show-empty>
                    <template #empty>
                      <span class="text-muted">{{ $t('adminMediator360.noSubscriptions') }}</span>
                    </template>
                  </b-table>
                </div>
              </b-tab>
              <b-tab :title="$t('adminMediator360.courtTrackers')">
                <div class="kadr-data-table-wrap">
                  <b-table :items="data.courtTrackers" :fields="trackerFields" small responsive show-empty>
                    <template #empty>
                      <span class="text-muted">{{ $t('adminMediator360.noCourtTrackers') }}</span>
                    </template>
                  </b-table>
                </div>
              </b-tab>
            </b-tabs>
          </template>
          <kadr-empty-state
            v-else-if="!loading"
            icon="fas fa-user-slash"
            :title="$t('adminMediator360.notFound')"
            :description="$t('adminMediator360.notFoundDescription')"
          />
        </kadr-page-loader>
      </template>
    </iq-card>
  </b-container>
</template>

<script>
import KadrPageHeader from '../../components/kadr/KadrPageHeader.vue'
import KadrPageLoader from '../../components/kadr/KadrPageLoader.vue'
import KadrEmptyState from '../../components/kadr/KadrEmptyState.vue'
import { formatDate, formatDateTime } from '../../utils/dateFormat'

export default {
  name: 'AdminMediator360View',
  components: {
    KadrPageHeader,
    KadrPageLoader,
    KadrEmptyState
  },
  data () {
    return {
      loading: false,
      data: null
    }
  },
  computed: {
    caseFields () {
      return [
        { key: 'caseId', label: this.$t('adminMediator360.colCaseNumber') },
        { key: 'status', label: this.$t('adminMediator360.colStatus') },
        { key: 'updated_at', label: this.$t('adminMediator360.colUpdated'), formatter: (v) => v ? formatDateTime(v) : '—' }
      ]
    },
    kadrInvFields () {
      return [
        { key: 'invoice_number', label: this.$t('adminMediator360.colInvoice') },
        { key: 'status', label: this.$t('adminMediator360.colStatus') },
        { key: 'net_payable', label: this.$t('adminMediator360.colNetPayable') }
      ]
    },
    privateInvFields () {
      return [
        { key: 'invoice_number', label: this.$t('adminMediator360.colInvoice') },
        { key: 'client_name', label: this.$t('adminMediator360.colClient') },
        { key: 'grand_total', label: this.$t('adminMediator360.colTotal') },
        { key: 'status', label: this.$t('adminMediator360.colStatus') }
      ]
    },
    rewardFields () {
      return [
        { key: 'catalog_item.title', label: this.$t('adminMediator360.colReward') },
        { key: 'points_spent', label: this.$t('adminMediator360.colPoints') },
        { key: 'status', label: this.$t('adminMediator360.colStatus') }
      ]
    },
    subFields () {
      return [
        { key: 'tier', label: this.$t('adminMediator360.colTier') },
        { key: 'source', label: this.$t('adminMediator360.colSource') },
        { key: 'expires_at', label: this.$t('adminMediator360.colValidThrough'), formatter: (v) => v ? formatDate(v) : '—' }
      ]
    },
    trackerFields () {
      return [
        { key: 'cnr', label: this.$t('adminMediator360.colCnr') },
        { key: 'label', label: this.$t('adminMediator360.colLabel') },
        { key: 'case_status', label: this.$t('adminMediator360.colStatus') }
      ]
    },
    summaryStats () {
      if (!this.data) return []
      return [
        { label: this.$t('adminMediator360.cases'), value: (this.data.cases || []).length },
        { label: this.$t('adminMediator360.kadrInvoices'), value: (this.data.kadrInvoices || []).length },
        { label: this.$t('adminMediator360.pendingPayouts'), value: (this.data.pendingPayouts || []).length },
        { label: this.$t('adminMediator360.privateInvoices'), value: (this.data.privateInvoices || []).length },
        { label: this.$t('adminMediator360.rewards'), value: (this.data.rewardOrders || []).length },
        { label: this.$t('adminMediator360.subscriptions'), value: (this.data.subscriptions || []).length },
        { label: this.$t('adminMediator360.courtTrackers'), value: (this.data.courtTrackers || []).length }
      ]
    }
  },
  mounted () {
    this.load()
  },
  methods: {
    async load () {
      const id = this.$route.params.mediatorId
      if (!id) return
      this.loading = true
      try {
        const res = await this.$store.dispatch('getMediator360', { mediatorId: id })
        if (res.success) this.data = res.data || res
      } finally {
        this.loading = false
      }
    }
  }
}
</script>

<style scoped>
.mediator-360-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
  gap: 0.75rem;
}

.mediator-360-stat {
  background: var(--kadr-surface-muted);
  border: 1px solid var(--kadr-border);
  border-radius: var(--kadr-radius);
  padding: 0.75rem;
  text-align: center;
}

.mediator-360-stat__value {
  display: block;
  font-size: 1.25rem;
  font-weight: 600;
  line-height: 1.2;
}

.mediator-360-stat__label {
  display: block;
  font-size: 0.75rem;
  color: var(--kadr-text-muted);
  margin-top: 0.25rem;
}
</style>
