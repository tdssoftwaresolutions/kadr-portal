<template>
  <b-container fluid>
    <kadr-page-header
      :title="isAdmin ? ADMIN.INVOICES_TITLE_ADMIN : ADMIN.INVOICES_TITLE"
      :subtitle="ADMIN.INVOICES_SUBTITLE"
    >
      <template v-if="!isAdmin && hasPrivateInvoices" #actions>
        <b-button size="sm" variant="outline-secondary" class="me-1" @click="openBranding">
          Invoice template
        </b-button>
        <b-button size="sm" variant="primary" @click="openPrivateCreate">
          New private invoice
        </b-button>
      </template>
    </kadr-page-header>
    <b-row>
      <b-col sm="12">
        <iq-card>
          <template v-slot:body>
            <!-- Mediator: income 360 -->
            <template v-if="!isAdmin">
              <div class="income-stats-grid mb-4">
                <div class="income-stat-card">
                  <span class="income-stat-label">Total income</span>
                  <span class="income-stat-value">₹{{ formatMoney(summary.combined.total) }}</span>
                </div>
                <div class="income-stat-card income-stat-card--kadr">
                  <span class="income-stat-label">From Kadr</span>
                  <span class="income-stat-value">₹{{ formatMoney(summary.earnedFromKadr) }}</span>
                  <span class="income-stat-sub">Transferred: ₹{{ formatMoney(summary.transferredToAccount) }}</span>
                </div>
                <div class="income-stat-card income-stat-card--pending">
                  <span class="income-stat-label">Pending from Kadr</span>
                  <span class="income-stat-value">₹{{ formatMoney(summary.pendingFromKadr) }}</span>
                </div>
                <div v-if="hasPrivateInvoices" class="income-stat-card income-stat-card--private">
                  <span class="income-stat-label">Private practice</span>
                  <span class="income-stat-value">₹{{ formatMoney(summary.earnedPrivate) }}</span>
                  <span class="income-stat-sub">Paid: ₹{{ formatMoney(summary.private.paid) }} · Open: ₹{{ formatMoney(summary.private.pending) }}</span>
                </div>
              </div>

              <b-alert v-if="!hasPrivateInvoices" model-value variant="light" class="small border mb-3">
                <router-link :to="{ name: 'app.edit' }">Upgrade to Pro</router-link> to create private invoices with your branding and GST line items.
              </b-alert>

              <mediator-private-invoice-section
                v-if="hasPrivateInvoices"
                ref="privateSection"
                @changed="loadIncome"
              />

              <b-row class="mb-3">
                <b-col md="3" sm="6" class="mb-2">
                  <label class="small text-muted mb-1">Time range</label>
                  <b-form-select v-model="filters.range" :options="rangeOptions" @change="loadIncome" />
                </b-col>
                <b-col md="3" sm="6" class="mb-2">
                  <label class="small text-muted mb-1">Source</label>
                  <b-form-select v-model="filters.source" :options="sourceOptions" @change="loadIncome" />
                </b-col>
                <b-col md="3" sm="6" class="mb-2">
                  <label class="small text-muted mb-1">Payment status</label>
                  <b-form-select v-model="filters.status" :options="statusOptions" @change="loadIncome" />
                </b-col>
              </b-row>

              <div class="d-none d-md-block">
                <b-table :items="incomeItems" :fields="mediatorFields" striped responsive small>
                  <template #cell(source)="row">
                    <b-badge :variant="row.item.source === 'KADR' ? 'primary' : 'info'">
                      {{ row.item.source === 'KADR' ? 'Kadr' : 'Private' }}
                    </b-badge>
                  </template>
                  <template #cell(amount)="row">₹{{ formatMoney(row.item.amount) }}</template>
                  <template #cell(issue_date)="row">{{ formatDate(row.item.issue_date) }}</template>
                  <template #cell(status)="row">
                    <b-badge :variant="statusVariant(row.item)">{{ incomeStatusLabel(row.item) }}</b-badge>
                  </template>
                  <template #cell(actions)="row">
                    <b-button size="sm" variant="outline-primary" class="me-1" @click="downloadRowPdf(row.item)">PDF</b-button>
                    <b-button
                      v-if="row.item.source === 'PRIVATE' && hasPrivateInvoices"
                      size="sm"
                      variant="outline-secondary"
                      class="me-1"
                      @click="editPrivateRow(row.item)"
                    >
                      Edit
                    </b-button>
                    <b-button
                      v-if="row.item.source === 'PRIVATE' && row.item.status !== 'PAID'"
                      size="sm"
                      variant="success"
                      @click="markPrivatePaid(row.item)"
                    >
                      Mark paid
                    </b-button>
                  </template>
                </b-table>
              </div>

              <div class="d-md-none invoice-card-list">
                <div
                  v-for="item in incomeItems"
                  :key="item.id || item.invoice_number"
                  class="invoice-mobile-card"
                >
                  <div class="d-flex justify-content-between align-items-start mb-2">
                    <div>
                      <div class="font-weight-bold">{{ item.invoice_number || '—' }}</div>
                      <div class="small text-muted">{{ item.label || '—' }}</div>
                    </div>
                    <b-badge :variant="item.source === 'KADR' ? 'primary' : 'info'">
                      {{ item.source === 'KADR' ? 'Kadr' : 'Private' }}
                    </b-badge>
                  </div>
                  <div class="d-flex justify-content-between align-items-center mb-2">
                    <span class="font-weight-bold">₹{{ formatMoney(item.amount) }}</span>
                    <b-badge :variant="statusVariant(item)">{{ incomeStatusLabel(item) }}</b-badge>
                  </div>
                  <div class="small text-muted mb-2">{{ formatDate(item.issue_date) }}</div>
                  <div class="d-flex flex-wrap">
                    <b-button size="sm" variant="outline-primary" class="me-1 mb-1" @click="downloadRowPdf(item)">PDF</b-button>
                    <b-button
                      v-if="item.source === 'PRIVATE' && hasPrivateInvoices"
                      size="sm"
                      variant="outline-secondary"
                      class="me-1 mb-1"
                      @click="editPrivateRow(item)"
                    >
                      Edit
                    </b-button>
                    <b-button
                      v-if="item.source === 'PRIVATE' && item.status !== 'PAID'"
                      size="sm"
                      variant="success"
                      class="mb-1"
                      @click="markPrivatePaid(item)"
                    >
                      Mark paid
                    </b-button>
                  </div>
                </div>
              </div>
              <kadr-empty-state
                v-if="!incomeItems.length && !loading"
                compact
                icon=""
                :title="ADMIN.NO_INVOICES"
                :description="ADMIN.NO_INVOICES_DESCRIPTION"
              />
            </template>

            <!-- Admin: existing -->
            <template v-else>
              <b-row class="mb-3">
                <b-col md="4">
                  <label class="small text-muted mb-1">Time range</label>
                  <b-form-select v-model="filters.range" :options="rangeOptions" @change="loadInvoices" />
                </b-col>
                <b-col md="4">
                  <label class="small text-muted mb-1">Payment status</label>
                  <b-form-select v-model="filters.status" :options="statusOptions" @change="loadInvoices" />
                </b-col>
                <b-col md="4">
                  <label class="small text-muted mb-1">Mediator</label>
                  <b-form-select v-model="filters.mediatorId" :options="mediatorOptions" @change="loadInvoices" />
                </b-col>
              </b-row>

              <div class="mb-3">
                <b-badge variant="primary" class="me-2">Total: INR {{ totals.total.toFixed(2) }}</b-badge>
                <b-badge variant="success" class="me-2">Paid: INR {{ totals.paid.toFixed(2) }}</b-badge>
                <b-badge variant="warning">Pending: INR {{ totals.pending.toFixed(2) }}</b-badge>
              </div>
              <div class="mb-3">
                <b-badge variant="dark">Platform income: INR {{ totalIncome.toFixed(2) }}</b-badge>
              </div>

              <b-table :items="invoices" :fields="fields" striped responsive small>
                <template #cell(mediator)="row">{{ row.item.user && row.item.user.name }}</template>
                <template #cell(caseLabel)="row">{{ row.item.cases && row.item.cases.caseId }}</template>
                <template #cell(status)="row">
                  <b-badge :variant="row.item.status === 'PAID' ? 'success' : 'warning'">{{ row.item.status }}</b-badge>
                </template>
                <template #cell(bank)="row">
                  <span v-if="row.item.bank_details">{{ formatBank(row.item.bank_details) }}</span>
                  <span v-else class="text-muted">Not available</span>
                </template>
                <template #cell(actions)="row">
                  <b-button size="sm" variant="outline-primary" class="me-1" @click="downloadPdf(row.item)">PDF</b-button>
                  <b-button v-if="row.item.status !== 'PAID'" size="sm" variant="success" @click="markPaid(row.item)">Mark paid</b-button>
                </template>
              </b-table>
              <kadr-empty-state
                v-if="!invoices.length && !loading"
                compact
                icon=""
                :title="ADMIN.NO_INVOICES"
                :description="ADMIN.NO_INVOICES_DESCRIPTION"
              />
            </template>
          </template>
        </iq-card>

        <iq-card v-if="isAdmin">
          <template v-slot:headerTitle><h4 class="card-title mb-0">Client Transactions</h4></template>
          <template v-slot:body>
            <b-table :items="transactions" :fields="transactionFields" striped responsive small />
          </template>
        </iq-card>
      </b-col>
    </b-row>

    <b-row v-if="!isAdmin">
      <b-col sm="12" lg="8">
        <iq-card>
          <template v-slot:headerTitle><h5 class="mb-0">Bank Account Details</h5></template>
          <template v-slot:body>
            <b-form @submit.prevent="saveBankDetails">
              <b-row>
                <b-col md="6"><b-form-group label="Bank name"><b-form-input v-model="bankForm.bank_name" required /></b-form-group></b-col>
                <b-col md="6"><b-form-group label="Account holder"><b-form-input v-model="bankForm.account_holder" required /></b-form-group></b-col>
                <b-col md="6"><b-form-group label="Account number"><b-form-input v-model="bankForm.account_number" required /></b-form-group></b-col>
                <b-col md="6"><b-form-group label="IFSC code"><b-form-input v-model="bankForm.ifsc_code" required /></b-form-group></b-col>
                <b-col md="6"><b-form-group label="Branch"><b-form-input v-model="bankForm.branch_name" /></b-form-group></b-col>
                <b-col md="6"><b-form-group label="UPI ID"><b-form-input v-model="bankForm.upi_id" /></b-form-group></b-col>
              </b-row>
              <b-button type="submit" variant="primary">Save bank details</b-button>
            </b-form>
          </template>
        </iq-card>
      </b-col>
    </b-row>
  </b-container>
</template>

<script>
import { sofbox } from '../../config/pluginInit'
import MediatorPrivateInvoiceSection from '../../components/mediator/MediatorPrivateInvoiceSection.vue'
import KadrEmptyState from '../../components/kadr/KadrEmptyState.vue'
import KadrPageHeader from '../../components/kadr/KadrPageHeader.vue'
import { ADMIN } from '../../constants/messages'

const EMPTY_SUMMARY = () => ({
  kadr: { total: 0, paid: 0, pending: 0 },
  private: { total: 0, paid: 0, pending: 0, enabled: false },
  combined: { total: 0, paid: 0, pending: 0 },
  transferredToAccount: 0,
  pendingFromKadr: 0,
  earnedFromKadr: 0,
  earnedPrivate: 0
})

export default {
  name: 'InvoicesView',
  components: { MediatorPrivateInvoiceSection, KadrEmptyState, KadrPageHeader },
  data () {
    return {
      ADMIN,
      loading: false,
      invoices: [],
      incomeItems: [],
      summary: EMPTY_SUMMARY(),
      hasPrivateInvoices: false,
      transactions: [],
      totalIncome: 0,
      totals: { total: 0, paid: 0, pending: 0 },
      mediators: [],
      filters: { range: 'THIS_MONTH', status: null, mediatorId: null, source: null },
      bankForm: { bank_name: '', account_holder: '', account_number: '', ifsc_code: '', branch_name: '', upi_id: '' },
      transactionFields: [
        { key: 'payment_id', label: 'Payment ID' },
        { key: 'transaction_id', label: 'Transaction ID' },
        { key: 'clientName', label: 'Client' },
        { key: 'clientEmail', label: 'Client Email' },
        { key: 'caseId', label: 'Case' },
        { key: 'amount', label: 'Amount' },
        { key: 'currency', label: 'Currency' },
        { key: 'reason', label: 'Reason' },
        { key: 'payment_method', label: 'Payment Method' },
        { key: 'reference_id', label: 'Reference' },
        { key: 'success', label: 'Success' },
        { key: 'transaction_date', label: 'Date' }
      ],
      mediatorFields: [
        { key: 'invoice_number', label: 'Invoice #' },
        { key: 'source', label: 'Source' },
        { key: 'label', label: 'Case / client' },
        { key: 'amount', label: 'Amount', class: 'text-end' },
        { key: 'issue_date', label: 'Date' },
        { key: 'status', label: 'Status' },
        { key: 'actions', label: '' }
      ]
    }
  },
  computed: {
    isAdmin () {
      return this.$store.state.user && this.$store.state.user.type === 'ADMIN'
    },
    fields () {
      const fields = [
        { key: 'invoice_number', label: 'Invoice #' },
        { key: 'caseLabel', label: 'Case' },
        { key: 'mediation_amount', label: 'Mediation amount' },
        { key: 'commission_amount', label: 'Mediator revenue (share)' },
        { key: 'gst_amount', label: 'GST' },
        { key: 'tax_amount', label: 'Tax' },
        { key: 'net_payable', label: 'Net payable' },
        { key: 'status', label: 'Status' }
      ]
      if (this.isAdmin) {
        fields.push({ key: 'mediator', label: 'Mediator' })
        fields.push({ key: 'bank', label: 'Bank details' })
      }
      fields.push({ key: 'actions', label: 'Actions' })
      return fields
    },
    rangeOptions () {
      return [
        { value: 'THIS_MONTH', text: 'This month' },
        { value: 'LAST_MONTH', text: 'Last month' },
        { value: 'LAST_3_MONTHS', text: 'Last 3 months' },
        { value: 'LAST_6_MONTHS', text: 'Last 6 months' },
        { value: null, text: 'All time' }
      ]
    },
    statusOptions () {
      const opts = [
        { value: null, text: 'All statuses' },
        { value: 'PENDING', text: 'Unpaid / pending' },
        { value: 'PAID', text: 'Paid' }
      ]
      if (this.hasPrivateInvoices && (!this.filters.source || this.filters.source === 'PRIVATE' || this.filters.source === 'ALL')) {
        opts.push(
          { value: 'ISSUED', text: 'Private — unpaid' },
          { value: 'SENT', text: 'Private — sent to client' }
        )
      }
      return opts
    },
    sourceOptions () {
      const opts = [
        { value: null, text: 'All sources' },
        { value: 'KADR', text: 'Kadr platform' }
      ]
      if (this.hasPrivateInvoices) {
        opts.push({ value: 'PRIVATE', text: 'Private practice' })
      }
      return opts
    },
    mediatorOptions () {
      return [{ value: null, text: 'All mediators' }].concat(this.mediators.map(m => ({ value: m.id, text: `${m.name} (${m.email})` })))
    }
  },
  mounted () {
    sofbox.index()
    if (!this.$store.state.mediatorFeatures.length && !this.isAdmin) {
      this.$store.dispatch('loadMediatorSubscription')
    }
    this.hasPrivateInvoices = this.$store.getters.mediatorHasFeature('enhanced_invoices')
    if (this.isAdmin) {
      this.loadMeta()
      this.loadInvoices()
      this.loadTransactions()
    } else {
      this.loadIncome()
      this.loadBankDetails()
    }
  },
  watch: {
    '$store.state.mediatorFeatures' () {
      if (!this.isAdmin) {
        this.hasPrivateInvoices = this.$store.getters.mediatorHasFeature('enhanced_invoices')
      }
    }
  },
  methods: {
    formatMoney (v) {
      return Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    },
    formatDate (v) {
      return this.$formatDate(v)
    },
    incomeStatusLabel (item) {
      if (item.source === 'PRIVATE') {
        return item.status_label || this.privateStatusLabel(item.status)
      }
      if (item.status === 'PENDING') return 'Pending transfer'
      if (item.status === 'PAID') return 'Transferred'
      return item.status || '—'
    },
    privateStatusLabel (status) {
      const key = String(status || '').toUpperCase()
      if (key === 'PAID') return 'Paid'
      if (key === 'SENT') return 'Sent to client'
      if (key === 'ISSUED' || key === 'DRAFT') return 'Unpaid'
      return status || '—'
    },
    statusVariant (item) {
      const status = typeof item === 'object' ? item.status : item
      const source = typeof item === 'object' ? item.source : null
      if (status === 'PAID') return 'success'
      if (source === 'PRIVATE') {
        if (status === 'SENT') return 'info'
        return 'warning'
      }
      if (status === 'PENDING') return 'warning'
      return 'secondary'
    },
    async markPrivatePaid (row) {
      const res = await this.$store.dispatch('updatePrivateInvoice', {
        id: row.id,
        payload: { status: 'PAID' }
      })
      if (res.success) this.loadIncome()
    },
    async loadIncome () {
      this.loading = true
      try {
        const res = await this.$store.dispatch('getMediatorIncome', {
          range: this.filters.range,
          status: this.filters.status || null,
          source: this.filters.source || null
        })
        if (res.success) {
          this.incomeItems = res.items || res.data?.items || []
          this.summary = res.summary || res.data?.summary || EMPTY_SUMMARY()
          this.hasPrivateInvoices = res.hasPrivateInvoices ?? res.data?.hasPrivateInvoices ?? this.hasPrivateInvoices
        }
      } finally {
        this.loading = false
      }
    },
    openBranding () {
      this.$refs.privateSection && this.$refs.privateSection.openBranding()
    },
    openPrivateCreate () {
      this.$refs.privateSection && this.$refs.privateSection.openCreate()
    },
    editPrivateRow (row) {
      this.$refs.privateSection && this.$refs.privateSection.openEdit(row)
    },
    async downloadRowPdf (row) {
      if (row.source === 'PRIVATE') {
        await this.$store.dispatch('downloadPrivateInvoicePdf', {
          id: row.id,
          invoiceNumber: row.invoice_number
        })
      } else {
        await this.$store.dispatch('downloadInvoicePdf', {
          invoiceId: row.id,
          invoiceNumber: row.invoice_number
        })
      }
    },
    async loadMeta () {
      const res = await this.$store.dispatch('getAdminCaseManagementMeta')
      if (res.success) this.mediators = (res.data.meta && res.data.meta.mediators) || []
    },
    async loadInvoices () {
      const res = await this.$store.dispatch('getInvoices', this.filters)
      if (res.success) {
        this.invoices = (res.data && res.data.invoices) || []
        this.totals = (res.data && res.data.totals) || this.totals
      }
      this.loadTransactions()
    },
    async loadTransactions () {
      const res = await this.$store.dispatch('getTransactions', { range: this.filters.range })
      if (res.success && res.data) {
        this.totalIncome = Number(res.data.totalIncome || 0)
        this.transactions = (res.data.transactions || []).map(t => ({
          ...t,
          clientName: t.user ? t.user.name : '—',
          clientEmail: t.user ? t.user.email : '—',
          caseId: t.cases ? t.cases.caseId : '—',
          success: t.success ? 'Yes' : 'No'
        }))
      }
    },
    async markPaid (invoice) {
      const res = await this.$store.dispatch('markInvoicePaid', { invoiceId: invoice.id })
      if (res.success) this.loadInvoices()
    },
    async downloadPdf (invoice) {
      await this.$store.dispatch('downloadInvoicePdf', {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoice_number
      })
    },
    async loadBankDetails () {
      const res = await this.$store.dispatch('getMediatorBankAccount')
      if (res.success && res.data.bankAccount) {
        const b = res.data.bankAccount
        this.bankForm = {
          bank_name: b.bank_name || '',
          account_holder: b.account_holder || '',
          account_number: b.account_number || '',
          ifsc_code: b.ifsc_code || '',
          branch_name: b.branch_name || '',
          upi_id: b.upi_id || ''
        }
      }
    },
    async saveBankDetails () {
      const res = await this.$store.dispatch('saveMediatorBankAccount', this.bankForm)
      if (res.success) this.loadBankDetails()
    },
    formatBank (bank) {
      return `${bank.bank_name} | ${bank.account_holder} | ${bank.account_number} | ${bank.ifsc_code}${bank.branch_name ? ` | ${bank.branch_name}` : ''}${bank.upi_id ? ` | ${bank.upi_id}` : ''}`
    }
  }
}
</script>

<style scoped>
.income-stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 0.75rem;
}

.income-stat-card {
  background: #f4f6fb;
  border: 1px solid #e8ecf5;
  border-radius: 12px;
  padding: 0.85rem 1rem;
  display: flex;
  flex-direction: column;
}

.income-stat-card--kadr {
  background: linear-gradient(135deg, #eef2ff 0%, #f8f9ff 100%);
  border-color: #d8dff1;
}

.income-stat-card--pending {
  background: #fff8ee;
  border-color: #f0e4c8;
}

.income-stat-card--private {
  background: #eefaf3;
  border-color: #cce8d8;
}

.income-stat-label {
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #6f7894;
  margin-bottom: 0.25rem;
}

.income-stat-value {
  font-size: 1.25rem;
  font-weight: 700;
  color: #1e2640;
}

.income-stat-sub {
  font-size: 0.75rem;
  color: #5a6a8e;
  margin-top: 0.2rem;
}

.invoice-card-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.invoice-mobile-card {
  background: #fff;
  border: 1px solid #e8ecf5;
  border-radius: 12px;
  padding: 0.9rem 1rem;
}
</style>
