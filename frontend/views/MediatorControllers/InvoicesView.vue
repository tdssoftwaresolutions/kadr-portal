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
            <div class="income-stats-grid mb-4">
              <div class="income-stat-card income-stat-card--private">
                <span class="income-stat-label">{{ $t('mediatorInvoices.txSummaryReceived') }}</span>
                <span class="income-stat-value">₹{{ formatMoney(transactionSummary.received) }}</span>
                <span class="income-stat-sub">{{ $t('mediatorInvoices.txSummarySuccessCount', { count: transactionSummary.successfulCount }) }}</span>
              </div>
              <div class="income-stat-card">
                <span class="income-stat-label">{{ $t('mediatorInvoices.txSummaryTotal') }}</span>
                <span class="income-stat-value">{{ transactionSummary.count }}</span>
                <span class="income-stat-sub">{{ $t('mediatorInvoices.txSummaryClients', { count: transactionSummary.uniqueClients }) }}</span>
              </div>
              <div v-if="transactionSummary.failedCount" class="income-stat-card income-stat-card--pending">
                <span class="income-stat-label">{{ $t('mediatorInvoices.txSummaryFailed') }}</span>
                <span class="income-stat-value">{{ transactionSummary.failedCount }}</span>
                <span class="income-stat-sub">₹{{ formatMoney(transactionSummary.failedAmount) }}</span>
              </div>
            </div>

            <div class="d-none d-lg-block">
              <b-table
                :items="transactions"
                :fields="transactionFields"
                striped
                responsive
                small
                class="tx-table align-middle"
              >
                <template #cell(transaction_date)="row">
                  <span class="tx-date">{{ $formatDateTime(row.item.transaction_date) }}</span>
                </template>
                <template #cell(client)="row">
                  <div class="tx-client">
                    <span class="tx-client-name">{{ row.item.clientName }}</span>
                    <span v-if="row.item.clientEmail" class="tx-client-meta">{{ row.item.clientEmail }}</span>
                    <span v-if="row.item.clientPhone" class="tx-client-meta">{{ row.item.clientPhone }}</span>
                  </div>
                </template>
                <template #cell(caseId)="row">
                  <span class="tx-case">{{ $t('mediatorInvoices.caseHash', { id: row.item.caseId }) }}</span>
                </template>
                <template #cell(reason)="row">
                  <span>{{ row.item.reason || $t('mediatorInvoices.dash') }}</span>
                </template>
                <template #cell(payment_method)="row">
                  <b-badge variant="light" class="tx-method-badge">{{ paymentMethodLabel(row.item.payment_method) }}</b-badge>
                </template>
                <template #cell(amount)="row">
                  <span class="tx-amount" :class="{ 'tx-amount--failed': !row.item.isSuccess }">
                    {{ formatAmount(row.item.amountValue, row.item.currencyCode) }}
                  </span>
                </template>
                <template #cell(status)="row">
                  <b-badge :variant="row.item.isSuccess ? 'success' : 'danger'">
                    {{ row.item.isSuccess ? $t('mediatorInvoices.txStatusSuccess') : $t('mediatorInvoices.txStatusFailed') }}
                  </b-badge>
                </template>
                <template #cell(gateway)="row">
                  <div class="tx-refs">
                    <button
                      v-if="row.item.payment_id"
                      type="button"
                      class="tx-ref"
                      :title="$t('mediatorInvoices.txCopyHint')"
                      @click="copyValue(row.item.payment_id)"
                    >
                      <span class="tx-ref-label">{{ $t('mediatorInvoices.txPaymentId') }}</span>
                      <code class="tx-ref-value">{{ row.item.payment_id }}</code>
                      <i class="ri-file-copy-line" aria-hidden="true"></i>
                    </button>
                    <button
                      v-if="row.item.reference_id"
                      type="button"
                      class="tx-ref"
                      :title="$t('mediatorInvoices.txCopyHint')"
                      @click="copyValue(row.item.reference_id)"
                    >
                      <span class="tx-ref-label">{{ $t('mediatorInvoices.txReference') }}</span>
                      <code class="tx-ref-value">{{ row.item.reference_id }}</code>
                      <i class="ri-file-copy-line" aria-hidden="true"></i>
                    </button>
                    <button
                      type="button"
                      class="tx-ref tx-ref--muted"
                      :title="$t('mediatorInvoices.txCopyHint')"
                      @click="copyValue(row.item.transaction_id)"
                    >
                      <span class="tx-ref-label">{{ $t('mediatorInvoices.txTransactionId') }}</span>
                      <code class="tx-ref-value">{{ row.item.transaction_id }}</code>
                      <i class="ri-file-copy-line" aria-hidden="true"></i>
                    </button>
                  </div>
                </template>
              </b-table>
            </div>

            <div class="d-lg-none invoice-card-list">
              <div v-for="tx in transactions" :key="tx.transaction_id" class="invoice-mobile-card tx-mobile-card">
                <div class="d-flex justify-content-between align-items-start mb-2">
                  <div>
                    <div class="tx-client-name">{{ tx.clientName }}</div>
                    <div v-if="tx.clientEmail" class="tx-client-meta">{{ tx.clientEmail }}</div>
                    <div class="tx-case mt-1">{{ $t('mediatorInvoices.caseHash', { id: tx.caseId }) }}</div>
                  </div>
                  <b-badge :variant="tx.isSuccess ? 'success' : 'danger'">
                    {{ tx.isSuccess ? $t('mediatorInvoices.txStatusSuccess') : $t('mediatorInvoices.txStatusFailed') }}
                  </b-badge>
                </div>
                <div class="d-flex justify-content-between align-items-center mb-2">
                  <span class="tx-amount" :class="{ 'tx-amount--failed': !tx.isSuccess }">
                    {{ formatAmount(tx.amountValue, tx.currencyCode) }}
                  </span>
                  <b-badge variant="light" class="tx-method-badge">{{ paymentMethodLabel(tx.payment_method) }}</b-badge>
                </div>
                <div class="tx-mobile-meta">
                  <span>{{ $formatDateTime(tx.transaction_date) }}</span>
                  <span v-if="tx.reason">· {{ tx.reason }}</span>
                </div>
                <div class="tx-refs mt-2">
                  <button
                    v-if="tx.payment_id"
                    type="button"
                    class="tx-ref"
                    @click="copyValue(tx.payment_id)"
                  >
                    <span class="tx-ref-label">{{ $t('mediatorInvoices.txPaymentId') }}</span>
                    <code class="tx-ref-value">{{ tx.payment_id }}</code>
                    <i class="ri-file-copy-line" aria-hidden="true"></i>
                  </button>
                  <button
                    v-if="tx.reference_id"
                    type="button"
                    class="tx-ref"
                    @click="copyValue(tx.reference_id)"
                  >
                    <span class="tx-ref-label">{{ $t('mediatorInvoices.txReference') }}</span>
                    <code class="tx-ref-value">{{ tx.reference_id }}</code>
                    <i class="ri-file-copy-line" aria-hidden="true"></i>
                  </button>
                </div>
              </div>
            </div>

            <kadr-empty-state
              v-if="!transactions.length && !loading"
              compact
              icon=""
              :title="$t('mediatorInvoices.txEmptyTitle')"
              :description="$t('mediatorInvoices.txEmptyDescription')"
            />
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
        { key: 'transaction_date', label: this.$t('mediatorInvoices.txDate') },
        { key: 'client', label: this.$t('mediatorInvoices.txClient') },
        { key: 'caseId', label: this.$t('mediatorInvoices.txCase') },
        { key: 'reason', label: this.$t('mediatorInvoices.txReason') },
        { key: 'payment_method', label: this.$t('mediatorInvoices.txPaymentMethod') },
        { key: 'amount', label: this.$t('mediatorInvoices.txAmount'), class: 'text-end' },
        { key: 'status', label: this.$t('mediatorInvoices.txStatus') },
        { key: 'gateway', label: this.$t('mediatorInvoices.txGatewayRefs') }
      ]
    },
    transactionSummary () {
      const rows = this.transactions || []
      const successful = rows.filter(t => t.isSuccess)
      const failed = rows.filter(t => !t.isSuccess)
      const uniqueClients = new Set(rows.map(t => t.clientKey).filter(Boolean))
      const receivedByCurrency = {}
      successful.forEach(t => {
        const cur = t.currencyCode || 'INR'
        receivedByCurrency[cur] = (receivedByCurrency[cur] || 0) + Number(t.amountValue || 0)
      })
      return {
        count: rows.length,
        successfulCount: successful.length,
        failedCount: failed.length,
        uniqueClients: uniqueClients.size,
        received: Number(this.totalIncome || 0),
        failedAmount: failed.reduce((sum, t) => sum + Number(t.amountValue || 0), 0),
        receivedByCurrency
      }
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
    currencySymbol (code) {
      const map = { INR: '₹', USD: '$', EUR: '€', GBP: '£' }
      return map[String(code || 'INR').toUpperCase()] || ''
    },
    formatAmount (value, currency) {
      const code = String(currency || 'INR').toUpperCase()
      const symbol = this.currencySymbol(code)
      const amount = this.formatMoney(value)
      return symbol ? `${symbol}${amount}` : `${amount} ${code}`
    },
    paymentMethodLabel (method) {
      if (!method) return this.$t('mediatorInvoices.txMethodUnknown')
      const key = String(method).toLowerCase()
      const map = {
        upi: 'UPI',
        card: this.$t('mediatorInvoices.txMethodCard'),
        netbanking: this.$t('mediatorInvoices.txMethodNetbanking'),
        wallet: this.$t('mediatorInvoices.txMethodWallet'),
        emi: 'EMI'
      }
      return map[key] || method
    },
    async copyValue (value) {
      if (!value) return
      try {
        await navigator.clipboard.writeText(String(value))
      } catch (e) {
        // Clipboard may be unavailable (permissions / insecure context); ignore silently.
      }
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
          clientName: t.user && t.user.name ? t.user.name : this.$t('mediatorInvoices.dash'),
          clientEmail: t.user && t.user.email ? t.user.email : '',
          clientPhone: t.user && t.user.phone_number ? t.user.phone_number : '',
          clientKey: t.user ? (t.user.id || t.user.email) : null,
          caseId: t.cases && t.cases.caseId ? t.cases.caseId : this.$t('mediatorInvoices.dash'),
          amountValue: Number(t.amount || 0),
          currencyCode: (t.currency || 'INR').toUpperCase(),
          isSuccess: !!t.success
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

/* Client transactions (admin) */
.tx-table :deep(td) {
  vertical-align: middle;
}

.tx-date {
  white-space: nowrap;
  font-size: 0.82rem;
  color: var(--kadr-text-secondary);
}

.tx-client {
  display: flex;
  flex-direction: column;
  line-height: 1.25;
}

.tx-client-name {
  font-weight: 600;
  color: var(--kadr-text-primary);
}

.tx-client-meta {
  font-size: 0.75rem;
  color: var(--kadr-text-secondary);
}

.tx-case {
  font-weight: 600;
  color: var(--kadr-text-primary);
  white-space: nowrap;
}

.tx-method-badge {
  border: 1px solid var(--kadr-border);
  color: var(--kadr-text-secondary);
  font-weight: 600;
}

.tx-amount {
  font-weight: 700;
  white-space: nowrap;
  color: var(--kadr-text-primary);
}

.tx-amount--failed {
  color: var(--kadr-text-secondary);
  text-decoration: line-through;
}

.tx-refs {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.tx-ref {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  max-width: 260px;
  padding: 0.2rem 0.45rem;
  border: 1px solid var(--kadr-border);
  border-radius: 8px;
  background: var(--kadr-surface-muted);
  cursor: pointer;
  text-align: left;
  transition: border-color 0.15s ease, background 0.15s ease;
}

.tx-ref:hover {
  border-color: var(--kadr-primary-soft-border);
  background: var(--kadr-primary-soft);
}

.tx-ref--muted {
  opacity: 0.85;
}

.tx-ref-label {
  font-size: 0.62rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--kadr-text-label);
  white-space: nowrap;
}

.tx-ref-value {
  font-size: 0.74rem;
  color: var(--kadr-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.tx-ref i {
  font-size: 0.85rem;
  color: var(--kadr-text-secondary);
}

.tx-mobile-meta {
  font-size: 0.75rem;
  color: var(--kadr-text-secondary);
  display: flex;
  gap: 0.3rem;
  flex-wrap: wrap;
}
</style>
