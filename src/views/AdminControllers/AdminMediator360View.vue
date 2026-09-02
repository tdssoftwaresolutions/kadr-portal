<template>
  <b-container fluid>
    <kadr-page-header :title="ADMIN.MEDIATOR_360_TITLE" :subtitle="ADMIN.MEDIATOR_360_SUBTITLE">
      <template #actions>
        <b-button size="sm" variant="outline-secondary" @click="$router.back()">Back</b-button>
      </template>
    </kadr-page-header>
    <iq-card>
      <template v-slot:body>
        <kadr-page-loader :show="loading" message="Loading mediator profile…">
          <template v-if="!loading && data">
            <div class="d-flex flex-wrap align-items-center mb-3">
              <div>
                <h5 class="mb-1">{{ data.mediator.name }}</h5>
                <p class="text-muted mb-0">{{ data.mediator.email }}</p>
                <b-badge v-if="data.mediator.is_deleted" variant="secondary" class="mr-1">Deleted</b-badge>
                <b-badge :variant="data.mediator.active ? 'success' : 'warning'">
                  {{ data.mediator.active ? 'Active' : 'Inactive' }}
                </b-badge>
                <b-badge variant="info" class="ml-1">{{ data.mediator.subscription_tier || 'FREE' }}</b-badge>
              </div>
            </div>
            <b-alert show variant="info" class="small">Read-only audit view. Data is retained for deleted mediators.</b-alert>

            <div class="mediator-360-summary mb-4">
              <div class="mediator-360-stat" v-for="stat in summaryStats" :key="stat.label">
                <span class="mediator-360-stat__value">{{ stat.value }}</span>
                <span class="mediator-360-stat__label">{{ stat.label }}</span>
              </div>
            </div>

            <b-tabs card>
              <b-tab title="Cases" active>
                <div class="kadr-data-table-wrap">
                  <b-table :items="data.cases" :fields="caseFields" small responsive show-empty>
                    <template #empty>
                      <span class="text-muted">No cases.</span>
                    </template>
                  </b-table>
                </div>
              </b-tab>
              <b-tab title="Kadr invoices">
                <div class="kadr-data-table-wrap">
                  <b-table :items="data.kadrInvoices" :fields="kadrInvFields" small responsive show-empty>
                    <template #empty>
                      <span class="text-muted">No Kadr invoices.</span>
                    </template>
                  </b-table>
                </div>
              </b-tab>
              <b-tab :title="`Pending payouts (${(data.pendingPayouts || []).length})`">
                <div class="kadr-data-table-wrap">
                  <b-table :items="data.pendingPayouts" :fields="kadrInvFields" small responsive show-empty>
                    <template #empty>
                      <span class="text-muted">No pending payouts.</span>
                    </template>
                  </b-table>
                </div>
              </b-tab>
              <b-tab title="Private invoices">
                <div class="kadr-data-table-wrap">
                  <b-table :items="data.privateInvoices" :fields="privateInvFields" small responsive show-empty>
                    <template #empty>
                      <span class="text-muted">No private invoices.</span>
                    </template>
                  </b-table>
                </div>
              </b-tab>
              <b-tab title="Rewards">
                <div class="kadr-data-table-wrap">
                  <b-table :items="data.rewardOrders" :fields="rewardFields" small responsive show-empty>
                    <template #empty>
                      <span class="text-muted">No reward orders.</span>
                    </template>
                  </b-table>
                </div>
              </b-tab>
              <b-tab title="Subscriptions">
                <div class="kadr-data-table-wrap">
                  <b-table :items="data.subscriptions" :fields="subFields" small responsive show-empty>
                    <template #empty>
                      <span class="text-muted">No subscriptions.</span>
                    </template>
                  </b-table>
                </div>
              </b-tab>
              <b-tab title="Court trackers">
                <div class="kadr-data-table-wrap">
                  <b-table :items="data.courtTrackers" :fields="trackerFields" small responsive show-empty>
                    <template #empty>
                      <span class="text-muted">No court trackers.</span>
                    </template>
                  </b-table>
                </div>
              </b-tab>
            </b-tabs>
          </template>
          <kadr-empty-state
            v-else-if="!loading"
            icon="fas fa-user-slash"
            title="Mediator not found"
            description="This mediator profile could not be loaded."
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
import { ADMIN } from '../../constants/messages'
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
      ADMIN,
      loading: false,
      data: null,
      caseFields: [
        { key: 'caseId', label: 'Case #' },
        { key: 'status', label: 'Status' },
        { key: 'updated_at', label: 'Updated', formatter: (v) => v ? formatDateTime(v) : '—' }
      ],
      kadrInvFields: [
        { key: 'invoice_number', label: 'Invoice' },
        { key: 'status', label: 'Status' },
        { key: 'net_payable', label: 'Net payable' }
      ],
      privateInvFields: [
        { key: 'invoice_number', label: 'Invoice' },
        { key: 'client_name', label: 'Client' },
        { key: 'grand_total', label: 'Total' },
        { key: 'status', label: 'Status' }
      ],
      rewardFields: [
        { key: 'catalog_item.title', label: 'Reward' },
        { key: 'points_spent', label: 'Points' },
        { key: 'status', label: 'Status' }
      ],
      subFields: [
        { key: 'tier', label: 'Tier' },
        { key: 'source', label: 'Source' },
        { key: 'expires_at', label: 'Valid through', formatter: (v) => v ? formatDate(v) : '—' }
      ],
      trackerFields: [
        { key: 'cnr', label: 'CNR' },
        { key: 'label', label: 'Label' },
        { key: 'case_status', label: 'Status' }
      ]
    }
  },
  computed: {
    summaryStats () {
      if (!this.data) return []
      return [
        { label: 'Cases', value: (this.data.cases || []).length },
        { label: 'Kadr invoices', value: (this.data.kadrInvoices || []).length },
        { label: 'Pending payouts', value: (this.data.pendingPayouts || []).length },
        { label: 'Private invoices', value: (this.data.privateInvoices || []).length },
        { label: 'Rewards', value: (this.data.rewardOrders || []).length },
        { label: 'Subscriptions', value: (this.data.subscriptions || []).length },
        { label: 'Court trackers', value: (this.data.courtTrackers || []).length }
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
