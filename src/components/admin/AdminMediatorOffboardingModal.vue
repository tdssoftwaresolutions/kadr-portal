<template>
  <b-modal
    :visible="visible"
    size="xl"
    title="Remove mediator from platform"
    scrollable
    @hide="$emit('close')"
  >
    <p v-if="loading" class="text-muted">Loading offboarding preview…</p>
    <template v-else-if="preview">
      <b-alert show variant="warning">
        Removing <strong>{{ preview.mediator.name }}</strong> will reassign active cases.
        Default is auto-assign using the same rules as new case assignment.
      </b-alert>

      <h6 class="mt-3">Active cases ({{ preview.activeCases.length }})</h6>
      <b-table
        v-if="preview.activeCases.length"
        :items="preview.activeCases"
        :fields="caseFields"
        small
        responsive
        class="mb-3"
      >
        <template #cell(assignee)="row">
          <b-form-select
            v-model="assignments[row.item.id]"
            :options="mediatorOptionsFor(row.item)"
            size="sm"
          />
          <small class="text-muted d-block mt-1">
            Auto: {{ row.item.suggestedMediator ? row.item.suggestedMediator.name : '— (admin may need to assign manually)' }}
          </small>
        </template>
      </b-table>
      <p v-else class="text-muted small">No active cases assigned to this mediator.</p>

      <h6>Pending Kadr payouts</h6>
      <p v-if="!preview.pendingPayouts.invoices.length" class="text-muted small">No pending payout invoices.</p>
      <ul v-else class="small mb-2">
        <li v-for="inv in preview.pendingPayouts.invoices" :key="inv.id">
          {{ inv.invoice_number }} — ₹{{ Number(inv.net_payable).toLocaleString() }}
        </li>
      </ul>
      <p v-if="preview.pendingPayouts.totalPendingAmount > 0" class="mb-2">
        <strong>Total pending:</strong> ₹{{ preview.pendingPayouts.totalPendingAmount.toLocaleString() }}
      </p>
      <b-form-checkbox v-model="ackPayouts">
        I have reviewed pending payouts for this mediator
      </b-form-checkbox>
    </template>

    <template #modal-footer>
      <b-button variant="secondary" @click="$emit('close')">Cancel</b-button>
      <b-button variant="danger" :disabled="!canSubmit || submitting" @click="submit">
        {{ submitting ? 'Removing…' : 'Confirm removal' }}
      </b-button>
    </template>
  </b-modal>
</template>

<script>
export default {
  name: 'AdminMediatorOffboardingModal',
  props: {
    visible: { type: Boolean, default: false },
    mediatorId: { type: String, default: '' }
  },
  data () {
    return {
      loading: false,
      submitting: false,
      preview: null,
      assignments: {},
      ackPayouts: false,
      availableMediators: [],
      caseFields: [
        { key: 'caseId', label: 'Case' },
        { key: 'status', label: 'Status' },
        { key: 'firstPartyName', label: 'First party' },
        { key: 'assignee', label: 'Assign to' }
      ]
    }
  },
  computed: {
    canSubmit () {
      if (!this.preview) return false
      if (this.preview.pendingPayouts.invoices.length && !this.ackPayouts) return false
      return true
    }
  },
  watch: {
    visible (v) {
      if (v && this.mediatorId) this.load()
    }
  },
  methods: {
    async load () {
      this.loading = true
      this.assignments = {}
      this.ackPayouts = false
      try {
        const [previewRes, mediatorsRes] = await Promise.all([
          this.$store.dispatch('getMediatorOffboardingPreview', { mediatorId: this.mediatorId }),
          this.$store.dispatch('getActiveUsers', { page: 1, type: 'MEDIATOR', includeInactive: false, includeDeleted: false })
        ])
        if (previewRes.success) {
          this.preview = previewRes.data || previewRes
          for (const c of this.preview.activeCases || []) {
            this.$set(this.assignments, c.id, c.suggestedMediator?.id || '')
          }
          if (!(this.preview.pendingPayouts?.invoices?.length)) {
            this.ackPayouts = true
          }
        }
        if (mediatorsRes.success) {
          this.availableMediators = (mediatorsRes.users || []).map((u) => ({
            id: u.userId || u.id,
            name: u.name,
            email: u.email
          }))
        }
      } finally {
        this.loading = false
      }
    },
    mediatorOptionsFor (caseRow) {
      const opts = [{ value: '', text: 'Auto-assign (recommended)' }]
      const exclude = this.mediatorId
      for (const m of this.availableMediators) {
        if (m.id === exclude) continue
        opts.push({ value: m.id, text: m.name || m.email })
      }
      if (caseRow.suggestedMediator && !opts.find((o) => o.value === caseRow.suggestedMediator.id)) {
        opts.push({
          value: caseRow.suggestedMediator.id,
          text: `${caseRow.suggestedMediator.name} (suggested)`
        })
      }
      return opts
    },
    async submit () {
      if (!this.canSubmit) return
      this.submitting = true
      try {
        const caseAssignments = (this.preview.activeCases || []).map((c) => ({
          caseId: c.id,
          newMediatorId: this.assignments[c.id] || null
        }))
        const res = await this.$store.dispatch('completeMediatorOffboarding', {
          mediatorId: this.mediatorId,
          caseAssignments,
          acknowledgedPendingPayouts: this.ackPayouts || !(this.preview.pendingPayouts.invoices.length)
        })
        if (res.success) {
          this.$emit('completed')
          this.$emit('close')
        }
      } finally {
        this.submitting = false
      }
    }
  }
}
</script>
