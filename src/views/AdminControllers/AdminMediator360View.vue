<template>
  <b-container fluid>
    <iq-card>
      <template v-slot:headerTitle>
        <h4 class="card-title mb-0">Mediator 360° view</h4>
      </template>
      <template v-slot:body>
        <p v-if="loading" class="text-muted">Loading…</p>
        <template v-else-if="data">
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
            <b-button size="sm" variant="outline-secondary" class="ml-auto" @click="$router.back()">Back</b-button>
          </div>
          <b-alert show variant="info" class="small">Read-only audit view. Data is retained for deleted mediators.</b-alert>

          <b-tabs card>
            <b-tab title="Cases" active>
              <b-table :items="data.cases" :fields="caseFields" small responsive />
            </b-tab>
            <b-tab title="Kadr invoices">
              <b-table :items="data.kadrInvoices" :fields="kadrInvFields" small responsive />
            </b-tab>
            <b-tab :title="`Pending payouts (${data.pendingPayouts.length})`">
              <b-table :items="data.pendingPayouts" :fields="kadrInvFields" small responsive />
            </b-tab>
            <b-tab title="Private invoices">
              <b-table :items="data.privateInvoices" :fields="privateInvFields" small responsive />
            </b-tab>
            <b-tab title="Rewards">
              <b-table :items="data.rewardOrders" :fields="rewardFields" small responsive />
            </b-tab>
            <b-tab title="Subscriptions">
              <b-table :items="data.subscriptions" :fields="subFields" small responsive />
            </b-tab>
            <b-tab title="Court trackers">
              <b-table :items="data.courtTrackers" :fields="trackerFields" small responsive />
            </b-tab>
          </b-tabs>
        </template>
      </template>
    </iq-card>
  </b-container>
</template>

<script>
export default {
  name: 'AdminMediator360View',
  data () {
    return {
      loading: false,
      data: null,
      caseFields: [
        { key: 'caseId', label: 'Case #' },
        { key: 'status', label: 'Status' },
        { key: 'updated_at', label: 'Updated', formatter: (v) => v ? new Date(v).toLocaleString() : '—' }
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
        { key: 'expires_at', label: 'Valid through', formatter: (v) => v ? new Date(v).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }) : '—' }
      ],
      trackerFields: [
        { key: 'cnr', label: 'CNR' },
        { key: 'label', label: 'Label' },
        { key: 'case_status', label: 'Status' }
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
