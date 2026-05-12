<template>
  <b-container fluid>
    <b-row>
      <b-col sm="12">
        <iq-card>
          <template v-slot:headerTitle>
            <div class="d-flex justify-content-between align-items-center w-100">
              <h4 class="card-title mb-0">{{ isAdmin ? 'Payments & Invoices' : 'Invoices' }}</h4>
            </div>
          </template>
          <template v-slot:body>
            <b-row class="mb-3">
              <b-col md="4">
                <label class="small text-muted mb-1">Time range</label>
                <b-form-select v-model="filters.range" :options="rangeOptions" @change="loadInvoices" />
              </b-col>
              <b-col md="4">
                <label class="small text-muted mb-1">Payment status</label>
                <b-form-select v-model="filters.status" :options="statusOptions" @change="loadInvoices" />
              </b-col>
              <b-col md="4" v-if="isAdmin">
                <label class="small text-muted mb-1">Mediator</label>
                <b-form-select v-model="filters.mediatorId" :options="mediatorOptions" @change="loadInvoices" />
              </b-col>
            </b-row>

            <div class="mb-3">
              <b-badge variant="primary" class="mr-2">Total: INR {{ totals.total.toFixed(2) }}</b-badge>
              <b-badge variant="success" class="mr-2">Paid: INR {{ totals.paid.toFixed(2) }}</b-badge>
              <b-badge variant="warning">Pending: INR {{ totals.pending.toFixed(2) }}</b-badge>
            </div>
            <div class="mb-3" v-if="isAdmin">
              <b-badge variant="dark">Platform income: INR {{ totalIncome.toFixed(2) }}</b-badge>
            </div>

            <b-table :items="invoices" :fields="fields" striped responsive small>
              <template #cell(mediator)="row">{{ row.item.user && row.item.user.name }}</template>
              <template #cell(caseLabel)="row">{{ row.item.cases && row.item.cases.caseId }}</template>
              <template #cell(invoice_word)>Invoice</template>
              <template #cell(branding)>kADR.live</template>
              <template #cell(status)="row">
                <b-badge :variant="row.item.status === 'PAID' ? 'success' : 'warning'">{{ row.item.status }}</b-badge>
              </template>
              <template #cell(bank)="row">
                <span v-if="row.item.bank_details">
                  {{ formatBank(row.item.bank_details) }}
                </span>
                <span v-else class="text-muted">Not available</span>
              </template>
              <template #cell(actions)="row">
                <b-button size="sm" variant="outline-primary" class="mr-1" @click="downloadPdf(row.item)">PDF</b-button>
                <b-button v-if="isAdmin && row.item.status !== 'PAID'" size="sm" variant="success" @click="markPaid(row.item)">Mark paid</b-button>
              </template>
            </b-table>
          </template>
        </iq-card>
        <iq-card v-if="isAdmin">
          <template v-slot:headerTitle>
            <div class="d-flex justify-content-between align-items-center w-100">
              <h4 class="card-title mb-0">Client Transactions</h4>
            </div>
          </template>
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

export default {
  name: 'InvoicesView',
  data () {
    return {
      invoices: [],
      transactions: [],
      totalIncome: 0,
      totals: { total: 0, paid: 0, pending: 0 },
      mediators: [],
      filters: { range: 'THIS_MONTH', status: null, mediatorId: null },
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
        { value: null, text: 'All invoices' }
      ]
    },
    statusOptions () {
      return [
        { value: null, text: 'All statuses' },
        { value: 'PENDING', text: 'Pending' },
        { value: 'PAID', text: 'Paid' }
      ]
    },
    mediatorOptions () {
      return [{ value: null, text: 'All mediators' }].concat(this.mediators.map(m => ({ value: m.id, text: `${m.name} (${m.email})` })))
    }
  },
  mounted () {
    sofbox.index()
    this.loadMeta()
    this.loadInvoices()
    this.loadTransactions()
    this.loadBankDetails()
  },
  methods: {
    async loadMeta () {
      if (!this.isAdmin) return
      const res = await this.$store.dispatch('getAdminCaseManagementMeta')
      if (res.success) this.mediators = (res.data.meta && res.data.meta.mediators) || []
    },
    async loadInvoices () {
      const res = await this.$store.dispatch('getInvoices', this.filters)
      if (res.success) {
        this.invoices = (res.data && res.data.invoices) || []
        this.totals = (res.data && res.data.totals) || this.totals
      }
      if (this.isAdmin) this.loadTransactions()
    },
    async loadTransactions () {
      if (!this.isAdmin) return
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
      if (this.isAdmin) return
      const res = await this.$store.dispatch('getMediatorBankAccount')
      if (res.success && res.data.bankAccount) {
        this.bankForm = {
          bank_name: res.data.bankAccount.bank_name || '',
          account_holder: res.data.bankAccount.account_holder || '',
          account_number: res.data.bankAccount.account_number || '',
          ifsc_code: res.data.bankAccount.ifsc_code || '',
          branch_name: res.data.bankAccount.branch_name || '',
          upi_id: res.data.bankAccount.upi_id || ''
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
