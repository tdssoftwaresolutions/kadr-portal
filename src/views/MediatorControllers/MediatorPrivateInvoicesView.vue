<template>
  <b-container fluid>
    <Alert :message="alert.message" :type="alert.type" v-model="alert.visible" :timeout="alert.timeout" />
    <b-row>
      <b-col lg="5" class="mb-4">
        <iq-card>
          <template v-slot:headerTitle><h4 class="card-title mb-0">Invoice branding</h4></template>
          <template v-slot:body>
            <b-form @submit.prevent="saveSettings">
              <b-form-group label="Business name"><b-form-input v-model="settings.business_name" /></b-form-group>
              <b-form-group label="GSTIN"><b-form-input v-model="settings.gstin" /></b-form-group>
              <b-form-group label="Email"><b-form-input v-model="settings.email" /></b-form-group>
              <b-form-group label="Phone"><b-form-input v-model="settings.phone" /></b-form-group>
              <b-form-group label="Address"><b-form-textarea v-model="settings.address" rows="2" /></b-form-group>
              <b-form-group label="Terms & conditions"><b-form-textarea v-model="settings.terms" rows="3" /></b-form-group>

              <b-form-group label="Logo">
                <div class="invoice-asset-upload">
                  <img v-if="settings.logo_url" :src="settings.logo_url" alt="Logo preview" class="invoice-asset-preview mb-2" />
                  <b-button size="sm" variant="outline-primary" :disabled="uploadingLogo" @click.prevent="triggerAssetPick('logo')">
                    {{ uploadingLogo ? 'Uploading…' : (settings.logo_url ? 'Replace logo' : 'Upload logo') }}
                  </b-button>
                  <input ref="logoInput" type="file" accept="image/*" class="d-none" @change="onAssetSelected($event, 'logo')" />
                </div>
              </b-form-group>

              <b-form-group label="Signature">
                <div class="invoice-asset-upload">
                  <img v-if="settings.signature_url" :src="settings.signature_url" alt="Signature preview" class="invoice-asset-preview invoice-asset-preview--sig mb-2" />
                  <b-button size="sm" variant="outline-primary" :disabled="uploadingSignature" @click.prevent="triggerAssetPick('signature')">
                    {{ uploadingSignature ? 'Uploading…' : (settings.signature_url ? 'Replace signature' : 'Upload signature') }}
                  </b-button>
                  <input ref="signatureInput" type="file" accept="image/*" class="d-none" @change="onAssetSelected($event, 'signature')" />
                </div>
              </b-form-group>

              <b-button type="submit" variant="primary" size="sm">Save settings</b-button>
            </b-form>
          </template>
        </iq-card>
      </b-col>
      <b-col lg="7">
        <iq-card>
          <template v-slot:headerTitle><h4 class="card-title mb-0">Private invoices</h4></template>
          <template v-slot:headerAction>
            <b-button size="sm" variant="primary" @click="openCreate">New invoice</b-button>
          </template>
          <template v-slot:body>
            <b-table v-if="invoices.length" :items="invoices" :fields="invFields" small responsive>
              <template #cell(status)="row">
                <b-badge :variant="privateStatusVariant(row.item.status)">{{ privateStatusLabel(row.item.status) }}</b-badge>
              </template>
              <template #cell(grand_total)="row">
                ₹{{ formatMoney(row.item.grand_total) }}
              </template>
              <template #cell(actions)="row">
                <b-button size="sm" variant="outline-primary" class="mr-1" @click="editInvoice(row.item)">Edit</b-button>
                <b-button size="sm" variant="outline-secondary" @click="downloadPdf(row.item.id)">PDF</b-button>
              </template>
            </b-table>
            <p v-else class="text-muted mb-0">No private invoices yet.</p>
          </template>
        </iq-card>
      </b-col>
    </b-row>

    <b-modal v-model="editorVisible" size="lg" title="Private invoice" @ok.prevent="saveInvoice">
      <b-form-group label="Client name"><b-form-input v-model="form.client_name" required /></b-form-group>
      <b-form-group label="Client email"><b-form-input v-model="form.client_email" /></b-form-group>
      <b-form-group label="Issue date"><b-form-input v-model="form.issue_date" type="date" /></b-form-group>

      <h6 class="mt-3 mb-2">Line items</h6>
      <p class="small text-muted mb-2">Each row: description, quantity, rate (before tax), then CGST % and SGST % for that line.</p>

      <div v-for="(line, idx) in form.line_items" :key="idx" class="invoice-line-card border rounded p-3 mb-2">
        <div class="d-flex justify-content-between align-items-center mb-2">
          <span class="small font-weight-bold text-muted">Line {{ idx + 1 }}</span>
          <b-button
            v-if="form.line_items.length > 1"
            size="sm"
            variant="link"
            class="text-danger p-0"
            @click="form.line_items.splice(idx, 1)"
          >
            Remove
          </b-button>
        </div>
        <b-form-group label="Description" label-size="sm" class="mb-2">
          <b-form-input v-model="line.description" placeholder="e.g. Mediation session fee" />
        </b-form-group>
        <b-row>
          <b-col cols="6" md="3">
            <b-form-group label="Quantity" label-size="sm" class="mb-md-0">
              <b-form-input v-model.number="line.quantity" type="number" min="1" step="1" />
            </b-form-group>
          </b-col>
          <b-col cols="6" md="3">
            <b-form-group label="Rate (₹)" label-size="sm" class="mb-md-0">
              <b-form-input v-model.number="line.unit_amount" type="number" min="0" step="0.01" />
            </b-form-group>
          </b-col>
          <b-col cols="6" md="3">
            <b-form-group label="CGST %" label-size="sm" class="mb-md-0">
              <b-form-input v-model.number="line.cgst_pct" type="number" min="0" step="0.01" />
            </b-form-group>
          </b-col>
          <b-col cols="6" md="3">
            <b-form-group label="SGST %" label-size="sm" class="mb-0">
              <b-form-input v-model.number="line.sgst_pct" type="number" min="0" step="0.01" />
            </b-form-group>
          </b-col>
        </b-row>
      </div>
      <b-button size="sm" variant="outline-secondary" @click="form.line_items.push(defaultLine())">Add line item</b-button>
    </b-modal>
  </b-container>
</template>

<script>
import Alert from '../../components/sofbox/alert/Alert.vue'

const MAX_ASSET_BYTES = 2 * 1024 * 1024
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

export default {
  name: 'MediatorPrivateInvoicesView',
  components: { Alert },
  data () {
    return {
      alert: { message: '', type: 'success', visible: false, timeout: 4000 },
      settings: {},
      invoices: [],
      editorVisible: false,
      editingId: null,
      form: this.emptyForm(),
      uploadingLogo: false,
      uploadingSignature: false,
      invFields: [
        { key: 'invoice_number', label: '#' },
        { key: 'client_name', label: 'Client' },
        { key: 'grand_total', label: 'Total' },
        { key: 'status', label: 'Status' },
        { key: 'actions', label: '' }
      ]
    }
  },
  mounted () {
    this.load()
  },
  methods: {
    emptyForm () {
      return {
        client_name: '',
        client_email: '',
        issue_date: new Date().toISOString().slice(0, 10),
        line_items: [this.defaultLine()]
      }
    },
    defaultLine () {
      return { description: '', quantity: 1, unit_amount: 0, cgst_pct: 9, sgst_pct: 9 }
    },
    formatMoney (value) {
      return Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    },
    privateStatusLabel (status) {
      const key = String(status || '').toUpperCase()
      if (key === 'PAID') return 'Paid'
      if (key === 'SENT') return 'Sent to client'
      if (key === 'ISSUED' || key === 'DRAFT') return 'Unpaid'
      return status || '—'
    },
    privateStatusVariant (status) {
      const key = String(status || '').toUpperCase()
      if (key === 'PAID') return 'success'
      if (key === 'SENT') return 'info'
      return 'warning'
    },
    async load () {
      const [s, list] = await Promise.all([
        this.$store.dispatch('getPrivateInvoiceSettings'),
        this.$store.dispatch('listPrivateInvoices')
      ])
      if (s.success) this.settings = s.data?.settings || s.settings || {}
      if (list.success) this.invoices = list.data?.items || list.items || []
    },
    async saveSettings () {
      const res = await this.$store.dispatch('savePrivateInvoiceSettings', this.settings)
      if (res.success) this.showAlert('Settings saved', 'success')
    },
    triggerAssetPick (assetType) {
      const refName = assetType === 'logo' ? 'logoInput' : 'signatureInput'
      this.$refs[refName].click()
    },
    onAssetSelected (event, assetType) {
      const file = event.target.files && event.target.files[0]
      event.target.value = ''
      if (!file) return
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        this.showAlert('Use JPEG, PNG, WebP, or GIF.', 'danger')
        return
      }
      if (file.size > MAX_ASSET_BYTES) {
        this.showAlert('Image must be 2 MB or smaller.', 'danger')
        return
      }
      const reader = new FileReader()
      reader.onload = (e) => this.uploadAsset(e.target.result, assetType)
      reader.readAsDataURL(file)
    },
    async uploadAsset (fileContent, assetType) {
      const flagKey = assetType === 'logo' ? 'uploadingLogo' : 'uploadingSignature'
      this[flagKey] = true
      try {
        const res = await this.$store.dispatch('uploadPrivateInvoiceAsset', { fileContent, assetType })
        const url = res.url || res.data?.url
        if (res.success && url) {
          if (assetType === 'logo') this.$set(this.settings, 'logo_url', url)
          else this.$set(this.settings, 'signature_url', url)
          const saveRes = await this.$store.dispatch('savePrivateInvoiceSettings', this.settings)
          if (saveRes.success) {
            this.showAlert(`${assetType === 'logo' ? 'Logo' : 'Signature'} uploaded and saved.`, 'success')
          }
        }
      } finally {
        this[flagKey] = false
      }
    },
    openCreate () {
      this.editingId = null
      this.form = this.emptyForm()
      this.editorVisible = true
    },
    editInvoice (inv) {
      this.editingId = inv.id
      this.form = {
        client_name: inv.client_name,
        client_email: inv.client_email || '',
        issue_date: inv.issue_date ? String(inv.issue_date).slice(0, 10) : '',
        line_items: (inv.line_items || []).map((l) => ({
          description: l.description,
          quantity: Number(l.quantity),
          unit_amount: Number(l.unit_amount),
          cgst_pct: Number(l.cgst_pct),
          sgst_pct: Number(l.sgst_pct)
        }))
      }
      if (!this.form.line_items.length) this.form.line_items = [this.defaultLine()]
      this.editorVisible = true
    },
    async saveInvoice () {
      const payload = { ...this.form }
      const res = this.editingId
        ? await this.$store.dispatch('updatePrivateInvoice', { id: this.editingId, payload })
        : await this.$store.dispatch('createPrivateInvoice', payload)
      if (res.success) {
        this.editorVisible = false
        await this.load()
      }
    },
    async downloadPdf (id) {
      await this.$store.dispatch('downloadPrivateInvoicePdf', { id })
    },
    showAlert (message, type) {
      this.alert = { message, type, visible: true, timeout: 4000 }
    }
  }
}
</script>

<style scoped>
.invoice-line-card {
  background: #fafcff;
}

.invoice-asset-upload {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.invoice-asset-preview {
  max-height: 56px;
  max-width: 160px;
  object-fit: contain;
  border: 1px solid #ebedf5;
  border-radius: 6px;
  padding: 4px;
  background: #fff;
}

.invoice-asset-preview--sig {
  max-height: 72px;
}
</style>
