<template>
  <b-container fluid>
    <iq-card>
      <template v-slot:headerTitle>
        <h4 class="card-title mb-0">{{ $t('adminRewardOrders.title') }}</h4>
      </template>
      <template v-slot:body>
        <b-row class="mb-3">
          <b-col md="4">
            <label class="small text-muted">{{ $t('adminRewardOrders.status') }}</label>
            <b-form-select v-model="statusFilter" :options="statusOptions" @change="load(1)" />
          </b-col>
        </b-row>

        <b-table :items="orders" :fields="orderFields" small responsive striped>
          <template #cell(created_at)="row">{{ formatDate(row.item.created_at) }}</template>
          <template #cell(mediator)="row">
            <div>{{ row.item.user?.name || '—' }}</div>
            <small class="text-muted d-block">{{ row.item.user?.email }}</small>
            <small class="text-muted d-block">{{ row.item.user?.phone_number || '—' }}</small>
          </template>
          <template #cell(reward)="row">
            <strong>{{ row.item.catalog_item?.title }}</strong>
            <small v-if="row.item.catalog_item?.description" class="d-block text-muted">{{ row.item.catalog_item.description }}</small>
          </template>
          <template #cell(points_spent)="row">
            <span class="text-danger">−{{ row.item.points_spent.toLocaleString() }}</span>
          </template>
          <template #cell(status)="row">
            <b-badge :variant="row.item.status === 'FULFILLED' ? 'success' : 'warning'">{{ row.item.status }}</b-badge>
          </template>
          <template #cell(actions)="row">
            <b-button
              v-if="row.item.status === 'PENDING'"
              size="sm"
              variant="primary"
              @click="openFulfill(row.item)"
            >
              {{ $t('adminRewardOrders.markFulfilled') }}
            </b-button>
            <span v-else class="small text-muted">{{ $t('adminRewardOrders.doneAt', { date: formatDate(row.item.fulfilled_at) }) }}</span>
          </template>
        </b-table>
        <b-pagination
          v-if="total > perPage"
          v-model="page"
          :total-rows="total"
          :per-page="perPage"
          align="center"
          class="mt-3"
          @change="load"
        />

        <b-modal v-model="fulfillVisible" :title="$t('adminRewardOrders.fulfillOrderTitle')" @hidden="fulfillNotes = ''">
          <div v-if="selectedOrder" class="mb-3">
            <p class="mb-1"><strong>{{ $t('adminRewardOrders.mediator') }}:</strong> {{ selectedOrder.user?.name }} ({{ selectedOrder.user?.email }})</p>
            <p class="mb-1"><strong>{{ $t('adminRewardOrders.phone') }}:</strong> {{ selectedOrder.user?.phone_number || '—' }}</p>
            <p class="mb-1"><strong>{{ $t('adminRewardOrders.reward') }}:</strong> {{ selectedOrder.catalog_item?.title }}</p>
            <p class="mb-0"><strong>{{ $t('adminRewardOrders.points') }}:</strong> {{ selectedOrder.points_spent }}</p>
          </div>
          <b-form-group :label="$t('adminRewardOrders.fulfillmentNotes')" label-size="sm">
            <b-form-textarea v-model="fulfillNotes" rows="3" :placeholder="$t('adminRewardOrders.fulfillmentNotesPlaceholder')" />
          </b-form-group>
          <p class="small text-muted mb-0">{{ $t('adminRewardOrders.confirmAfterDelivery') }}</p>
          <template #footer>
            <b-button variant="secondary" @click="fulfillVisible = false">{{ $t('adminRewardOrders.cancel') }}</b-button>
            <b-button variant="success" @click="submitFulfill">{{ $t('adminRewardOrders.markAsFulfilled') }}</b-button>
          </template>
        </b-modal>
      </template>
    </iq-card>
  </b-container>
</template>

<script>
import { sofbox } from '../../config/pluginInit'

export default {
  name: 'AdminRewardOrdersView',
  data () {
    return {
      orders: [],
      total: 0,
      page: 1,
      perPage: 20,
      statusFilter: '',
      fulfillVisible: false,
      fulfillNotes: '',
      selectedOrder: null
    }
  },
  computed: {
    statusOptions () {
      return [
        { value: '', text: this.$t('adminRewardOrders.allOrders') },
        { value: 'PENDING', text: this.$t('adminRewardOrders.pending') },
        { value: 'FULFILLED', text: this.$t('adminRewardOrders.fulfilled') }
      ]
    },
    orderFields () {
      return [
        { key: 'created_at', label: this.$t('adminRewardOrders.colOrdered') },
        { key: 'mediator', label: this.$t('adminRewardOrders.colMediator') },
        { key: 'reward', label: this.$t('adminRewardOrders.colReward') },
        { key: 'points_spent', label: this.$t('adminRewardOrders.colPoints'), class: 'text-end' },
        { key: 'status', label: this.$t('adminRewardOrders.colStatus') },
        { key: 'actions', label: '' }
      ]
    }
  },
  mounted () {
    sofbox.index()
    this.load(1)
  },
  methods: {
    formatDate (v) {
      return this.$formatDateTime(v)
    },
    async load (page) {
      this.page = page || this.page
      const res = await this.$store.dispatch('getRewardOrdersAdmin', {
        page: this.page,
        status: this.statusFilter || undefined
      })
      if (res.success && res.data) {
        this.orders = res.data.orders || []
        this.total = res.data.total || 0
      }
    },
    openFulfill (order) {
      this.selectedOrder = order
      this.fulfillNotes = order.admin_notes || ''
      this.fulfillVisible = true
    },
    async submitFulfill () {
      if (!this.selectedOrder) return
      const res = await this.$store.dispatch('fulfillRewardOrder', {
        id: this.selectedOrder.id,
        admin_notes: this.fulfillNotes
      })
      if (res.success) {
        this.fulfillVisible = false
        this.load(this.page)
      }
    }
  }
}
</script>
