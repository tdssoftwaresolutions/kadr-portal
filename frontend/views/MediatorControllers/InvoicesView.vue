<template>
  <b-container fluid class="kadr-animate-in">
    <kadr-page-header
      :title="isAdmin ? $t('mediatorInvoices.titleAdmin') : $t('mediatorInvoices.titleMediator')"
      :subtitle="$t('mediatorInvoices.subtitle')"
    >
      <template v-if="!isAdmin && hasPrivateInvoices" #actions>
        <b-button size="sm" variant="outline-secondary" class="me-1" @click="openBranding">
          {{ $t('mediatorInvoices.invoiceTemplate') }}
        </b-button>
        <b-button size="sm" variant="primary" @click="openPrivateCreate">
          {{ $t('mediatorInvoices.newPrivateInvoice') }}
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
                  <span class="income-stat-label">{{ $t('mediatorInvoices.totalIncome') }}</span>
                  <span class="income-stat-value">₹{{ formatMoney(summary.combined.total) }}</span>
                </div>
                <div class="income-stat-card income-stat-card--kadr">
                  <span class="income-stat-label">{{ $t('mediatorInvoices.fromKadr') }}</span>
                  <span class="income-stat-value">₹{{ formatMoney(summary.earnedFromKadr) }}</span>
                  <span class="income-stat-sub">{{ $t('mediatorInvoices.transferred', { amount: formatMoney(summary.transferredToAccount) }) }}</span>
                </div>
                <div class="income-stat-card income-stat-card--pending">
                  <span class="income-stat-label">{{ $t('mediatorInvoices.pendingFromKadr') }}</span>
                  <span class="income-stat-value">₹{{ formatMoney(summary.pendingFromKadr) }}</span>
                </div>
                <div v-if="hasPrivateInvoices" class="income-stat-card income-stat-card--private">
                  <span class="income-stat-label">{{ $t('mediatorInvoices.privatePractice') }}</span>
                  <span class="income-stat-value">₹{{ formatMoney(summary.earnedPrivate) }}</span>
                  <span class="income-stat-sub">{{ $t('mediatorInvoices.privatePaidOpen', { paid: formatMoney(summary.private.paid), open: formatMoney(summary.private.pending) }) }}</span>
                </div>
              </div>

              <b-alert v-if="!hasPrivateInvoices" model-value variant="light" class="small border mb-3">
                <router-link :to="{ name: 'app.edit' }">{{ $t('mediatorInvoices.upgradeLink') }}</router-link> {{ $t('mediatorInvoices.upgradePrompt') }}
              </b-alert>

              <mediator-private-invoice-section
                v-if="hasPrivateInvoices"
                ref="privateSection"
                @changed="loadIncome"
              />

              <b-row class="mb-3">
                <b-col md="3" sm="6" class="mb-2">
                  <label class="small text-muted mb-1">{{ $t('mediatorInvoices.timeRange') }}</label>
                  <b-form-select v-model="filters.range" :options="rangeOptions" @change="loadIncome" />
                </b-col>
                <b-col md="3" sm="6" class="mb-2">
                  <label class="small text-muted mb-1">{{ $t('mediatorInvoices.source') }}</label>
                  <b-form-select v-model="filters.source" :options="sourceOptions" @change="loadIncome" />
                </b-col>
                <b-col md="3" sm="6" class="mb-2">
                  <label class="small text-muted mb-1">{{ $t('mediatorInvoices.paymentStatus') }}</label>
                  <b-form-select v-model="filters.status" :options="statusOptions" @change="loadIncome" />
                </b-col>
              </b-row>

              <div class="d-none d-md-block">
                <b-table :items="incomeItems" :fields="mediatorFields" striped responsive small>
                  <template #cell(source)="row">
                    <b-badge :variant="row.item.source === 'KADR' ? 'primary' : 'info'">
                      {{ row.item.source === 'KADR' ? $t('mediatorInvoices.kadr') : $t('mediatorInvoices.private') }}
                    </b-badge>
                  </template>
                  <template #cell(amount)="row">₹{{ formatMoney(row.item.amount) }}</template>
                  <template #cell(issue_date)="row">{{ formatDate(row.item.issue_date) }}</template>
                  <template #cell(status)="row">
                    <b-badge :variant="statusVariant(row.item)">{{ incomeStatusLabel(row.item) }}</b-badge>
                  </template>
                  <template #cell(actions)="row">
                    <b-button size="sm" variant="outline-primary" class="me-1" @click="downloadRowPdf(row.item)">{{ $t('mediatorInvoices.pdf') }}</b-button>
                    <b-button
                      v-if="row.item.source === 'PRIVATE' && hasPrivateInvoices"
                      size="sm"
                      variant="outline-secondary"
                      class="me-1"
                      @click="editPrivateRow(row.item)"
                    >
                      {{ $t('mediatorInvoices.edit') }}
                    </b-button>
                    <b-button
                      v-if="row.item.source === 'PRIVATE' && row.item.status !== 'PAID'"
                      size="sm"
                      variant="success"
                      @click="markPrivatePaid(row.item)"
                    >
                      {{ $t('mediatorInvoices.markPaid') }}
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
                      <div class="font-weight-bold">{{ item.invoice_number || $t('mediatorInvoices.dash') }}</div>
                      <div class="small text-muted">{{ item.label || $t('mediatorInvoices.dash') }}</div>
                    </div>
                    <b-badge :variant="item.source === 'KADR' ? 'primary' : 'info'">
                      {{ item.source === 'KADR' ? $t('mediatorInvoices.kadr') : $t('mediatorInvoices.private') }}
                    </b-badge>
                  </div>
                  <div class="d-flex justify-content-between align-items-center mb-2">
                    <span class="font-weight-bold">₹{{ formatMoney(item.amount) }}</span>
                    <b-badge :variant="statusVariant(item)">{{ incomeStatusLabel(item) }}</b-badge>
                  </div>
                  <div class="small text-muted mb-2">{{ formatDate(item.issue_date) }}</div>
                  <div class="d-flex flex-wrap">
                    <b-button size="sm" variant="outline-primary" class="me-1 mb-1" @click="downloadRowPdf(item)">{{ $t('mediatorInvoices.pdf') }}</b-button>
                    <b-button
                      v-if="item.source === 'PRIVATE' && hasPrivateInvoices"
                      size="sm"
                      variant="outline-secondary"
                      class="me-1 mb-1"
                      @click="editPrivateRow(item)"
                    >
                      {{ $t('mediatorInvoices.edit') }}
                    </b-button>
                    <b-button
                      v-if="item.source === 'PRIVATE' && item.status !== 'PAID'"
                      size="sm"
                      variant="success"
                      class="mb-1"
                      @click="markPrivatePaid(item)"
                    >
                      {{ $t('mediatorInvoices.markPaid') }}
                    </b-button>
                  </div>
                </div>
              </div>
              <kadr-empty-state
                v-if="!incomeItems.length && !loading"
                compact
                icon=""
                :title="$t('mediatorInvoices.noInvoicesTitle')"
                :description="$t('mediatorInvoices.noInvoicesDescription')"
              />
            </template>

            <!-- Admin: existing -->
            <template v-else>
              <b-row class="mb-3">
                <b-col md="4">
                  <label class="small text-muted mb-1">{{ $t('mediatorInvoices.timeRange') }}</label>
                  <b-form-select v-model="filters.range" :options="rangeOptions" @change="loadInvoices" />
                </b-col>
                <b-col md="4">
                  <label class="small text-muted mb-1">{{ $t('mediatorInvoices.paymentStatus') }}</label>
                  <b-form-select v-model="filters.status" :options="statusOptions" @change="loadInvoices" />
                </b-col>
                <b-col md="4">
                  <label class="small text-muted mb-1">{{ $t('mediatorInvoices.mediator') }}</label>
                  <b-form-select v-model="filters.mediatorId" :options="mediatorOptions" @change="loadInvoices" />
                </b-col>
              </b-row>

              <div class="mb-3">
                <b-badge variant="primary" class="me-2">{{ $t('mediatorInvoices.totalBadge', { amount: totals.total.toFixed(2) }) }}</b-badge>
                <b-badge variant="success" class="me-2">{{ $t('mediatorInvoices.paidBadge', { amount: totals.paid.toFixed(2) }) }}</b-badge>
                <b-badge variant="warning">{{ $t('mediatorInvoices.pendingBadge', { amount: totals.pending.toFixed(2) }) }}</b-badge>
              </div>
              <div class="mb-3">
                <b-badge variant="dark">{{ $t('mediatorInvoices.platformIncome', { amount: totalIncome.toFixed(2) }) }}</b-badge>
              </div>

              <b-table :items="invoices" :fields="fields" striped responsive small>
                <template #cell(mediator)="row">{{ row.item.user && row.item.user.name }}</template>
                <template #cell(caseLabel)="row">{{ row.item.cases && row.item.cases.caseId }}</template>
                <template #cell(status)="row">
                  <b-badge :variant="row.item.status === 'PAID' ? 'success' : 'warning'">{{ row.item.status }}</b-badge>
                </template>
                <template #cell(bank)="row">
                  <span v-if="row.item.bank_details">{{ formatBank(row.item.bank_details) }}</span>
                  <span v-else class="text-muted">{{ $t('mediatorInvoices.notAvailable') }}</span>
                </template>
                <template #cell(actions)="row">
                  <b-button size="sm" variant="outline-primary" class="me-1" @click="downloadPdf(row.item)">{{ $t('mediatorInvoices.pdf') }}</b-button>
                  <b-button v-if="row.item.status !== 'PAID'" size="sm" variant="success" @click="markPaid(row.item)">{{ $t('mediatorInvoices.markPaid') }}</b-button>
                </template>
              </b-table>
              <kadr-empty-state
                v-if="!invoices.length && !loading"
                compact
                icon=""
                :title="$t('mediatorInvoices.noInvoicesTitle')"
                :description="$t('mediatorInvoices.noInvoicesDescription')"
              />
            </template>
          </template>
        </iq-card>

        <iq-card v-if="isAdmin">
          <template v-slot:headerTitle><h4 class="card-title mb-0">{{ $t('mediatorInvoices.clientTransactions') }}</h4></template>
          <template v-slot:body>
            <b-table :items="transactions" :fields="transactionFields" striped responsive small />
          </template>
        </iq-card>
      </b-col>
    </b-row>

    <b-row v-if="!isAdmin">
      <b-col sm="12" lg="8">
        <iq-card>
          <template v-slot:headerTitle><h5 class="mb-0">{{ $t('mediatorInvoices.bankAccountDetails') }}</h5></template>
          <template v-slot:body>
            <b-form @submit.prevent="saveBankDetails">
              <b-row>
                <b-col md="6"><b-form-group :label="$t('mediatorInvoices.bankName')"><b-form-input v-model="bankForm.bank_name" required /></b-form-group></b-col>
                <b-col md="6"><b-form-group :label="$t('mediatorInvoices.accountHolder')"><b-form-input v-model="bankForm.account_holder" required /></b-form-group></b-col>
                <b-col md="6"><b-form-group :label="$t('mediatorInvoices.accountNumber')"><b-form-input v-model="bankForm.account_number" required /></b-form-group></b-col>
                <b-col md="6"><b-form-group :label="$t('mediatorInvoices.ifscCode')"><b-form-input v-model="bankForm.ifsc_code" required /></b-form-group></b-col>
                <b-col md="6"><b-form-group :label="$t('mediatorInvoices.branch')"><b-form-input v-model="bankForm.branch_name" /></b-form-group></b-col>
                <b-col md="6"><b-form-group :label="$t('mediatorInvoices.upiId')"><b-form-input v-model="bankForm.upi_id" /></b-form-group></b-col>
              </b-row>
              <b-button type="submit" variant="primary">{{ $t('mediatorInvoices.saveBankDetails') }}</b-button>
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
      bankForm: { bank_name: '', account_holder: '', account_number: '', ifsc_code: '', branch_name: '', upi_id: '' }
    }
  },
  computed: {
    isAdmin () {
      return this.$store.state.currentUser && this.$store.state.currentUser.type === 'ADMIN'
    },
    transactionFields () {
      return [
        { key: 'payment_id', label: this.$t('mediatorInvoices.txPaymentId') },
        { key: 'transaction_id', label: this.$t('mediatorInvoices.txTransactionId') },
        { key: 'clientName', label: this.$t('mediatorInvoices.txClient') },
        { key: 'clientEmail', label: this.$t('mediatorInvoices.txClientEmail') },
        { key: 'caseId', label: this.$t('mediatorInvoices.txCase') },
        { key: 'amount', label: this.$t('mediatorInvoices.txAmount') },
        { key: 'currency', label: this.$t('mediatorInvoices.txCurrency') },
        { key: 'reason', label: this.$t('mediatorInvoices.txReason') },
        { key: 'payment_method', label: this.$t('mediatorInvoices.txPaymentMethod') },
        { key: 'reference_id', label: this.$t('mediatorInvoices.txReference') },
        { key: 'success', label: this.$t('mediatorInvoices.txSuccess') },
        { key: 'transaction_date', label: this.$t('mediatorInvoices.txDate') }
      ]
    },
    mediatorFields () {
      return [
        { key: 'invoice_number', label: this.$t('mediatorInvoices.fieldInvoiceNumber') },
        { key: 'source', label: this.$t('mediatorInvoices.fieldSource') },
        { key: 'label', label: this.$t('mediatorInvoices.fieldCaseClient') },
        { key: 'amount', label: this.$t('mediatorInvoices.fieldAmount'), class: 'text-end' },
        { key: 'issue_date', label: this.$t('mediatorInvoices.fieldDate') },
        { key: 'status', label: this.$t('mediatorInvoices.fieldStatus') },
        { key: 'actions', label: '' }
      ]
    },
    fields () {
      const fields = [
        { key: 'invoice_number', label: this.$t('mediatorInvoices.fieldInvoiceNumber') },
        { key: 'caseLabel', label: this.$t('mediatorInvoices.fieldCase') },
        { key: 'mediation_amount', label: this.$t('mediatorInvoices.fieldMediationAmount') },
        { key: 'commission_amount', label: this.$t('mediatorInvoices.fieldMediatorRevenue') },
        { key: 'gst_amount', label: this.$t('mediatorInvoices.fieldGst') },
        { key: 'tax_amount', label: this.$t('mediatorInvoices.fieldTax') },
        { key: 'net_payable', label: this.$t('mediatorInvoices.fieldNetPayable') },
        { key: 'status', label: this.$t('mediatorInvoices.fieldStatus') }
      ]
      if (this.isAdmin) {
        fields.push({ key: 'mediator', label: this.$t('mediatorInvoices.fieldMediator') })
        fields.push({ key: 'bank', label: this.$t('mediatorInvoices.fieldBankDetails') })
      }
      fields.push({ key: 'actions', label: this.$t('mediatorInvoices.fieldActions') })
      return fields
    },
    rangeOptions () {
      return [
        { value: 'THIS_MONTH', text: this.$t('mediatorInvoices.rangeThisMonth') },
        { value: 'LAST_MONTH', text: this.$t('mediatorInvoices.rangeLastMonth') },
        { value: 'LAST_3_MONTHS', text: this.$t('mediatorInvoices.rangeLast3Months') },
        { value: 'LAST_6_MONTHS', text: this.$t('mediatorInvoices.rangeLast6Months') },
        { value: null, text: this.$t('mediatorInvoices.rangeAllTime') }
      ]
    },
    statusOptions () {
      const opts = [
        { value: null, text: this.$t('mediatorInvoices.statusAll') },
        { value: 'PENDING', text: this.$t('mediatorInvoices.statusPending') },
        { value: 'PAID', text: this.$t('mediatorInvoices.statusPaid') }
      ]
      if (this.hasPrivateInvoices && (!this.filters.source || this.filters.source === 'PRIVATE' || this.filters.source === 'ALL')) {
        opts.push(
          { value: 'ISSUED', text: this.$t('mediatorInvoices.statusPrivateUnpaid') },
          { value: 'SENT', text: this.$t('mediatorInvoices.statusPrivateSent') }
        )
      }
      return opts
    },
    sourceOptions () {
      const opts = [
        { value: null, text: this.$t('mediatorInvoices.sourceAll') },
        { value: 'KADR', text: this.$t('mediatorInvoices.sourceKadr') }
      ]
      if (this.hasPrivateInvoices) {
        opts.push({ value: 'PRIVATE', text: this.$t('mediatorInvoices.sourcePrivate') })
      }
      return opts
    },
    mediatorOptions () {
      return [{ value: null, text: this.$t('mediatorInvoices.mediatorAll') }].concat(this.mediators.map(m => ({ value: m.id, text: this.$t('mediatorInvoices.mediatorOption', { name: m.name, email: m.email }) })))
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
      if (item.status === 'PENDING') return this.$t('mediatorInvoices.incomeStatusPendingTransfer')
      if (item.status === 'PAID') return this.$t('mediatorInvoices.incomeStatusTransferred')
      return item.status || this.$t('mediatorInvoices.dash')
    },
    privateStatusLabel (status) {
      const key = String(status || '').toUpperCase()
      if (key === 'PAID') return this.$t('mediatorInvoices.privateStatusPaid')
      if (key === 'SENT') return this.$t('mediatorInvoices.privateStatusSent')
      if (key === 'ISSUED' || key === 'DRAFT') return this.$t('mediatorInvoices.privateStatusUnpaid')
      return status || this.$t('mediatorInvoices.dash')
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
          clientName: t.user ? t.user.name : this.$t('mediatorInvoices.dash'),
          clientEmail: t.user ? t.user.email : this.$t('mediatorInvoices.dash'),
          caseId: t.cases ? t.cases.caseId : this.$t('mediatorInvoices.dash'),
          success: t.success ? this.$t('mediatorInvoices.yes') : this.$t('mediatorInvoices.no')
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
  background: var(--kadr-surface-muted);
  border: 1px solid var(--kadr-border);
  border-radius: 12px;
  padding: 0.85rem 1rem;
  display: flex;
  flex-direction: column;
}

.income-stat-card--kadr {
  background: linear-gradient(135deg, var(--kadr-primary-soft) 0%, var(--kadr-surface-info) 100%);
  border-color: var(--kadr-primary-soft-border);
}

.income-stat-card--pending {
  background: var(--kadr-status-warning-bg);
  border-color: #eed6a6;
}

.income-stat-card--private {
  background: var(--kadr-status-success-bg);
  border-color: #bfe6d2;
}

.income-stat-label {
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--kadr-text-label);
  margin-bottom: 0.25rem;
}

.income-stat-value {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--kadr-text-primary);
}

.income-stat-sub {
  font-size: 0.75rem;
  color: var(--kadr-text-secondary);
  margin-top: 0.2rem;
}

.invoice-card-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.invoice-mobile-card {
  background: var(--kadr-bg-surface);
  border: 1px solid var(--kadr-border);
  border-radius: 12px;
  padding: 0.9rem 1rem;
}
</style>
