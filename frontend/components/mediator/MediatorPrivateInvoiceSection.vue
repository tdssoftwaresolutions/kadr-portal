<template>
  <div>
    <b-modal v-model="templateModalVisible" size="lg" title="Invoice template" scrollable @ok.prevent="saveSettings">
      <p class="small text-muted">Logo, signature, and business details appear on private invoice PDFs.</p>
      <b-form @submit.prevent="saveSettings">
        <b-row>
          <b-col md="6"><b-form-group label="Business name"><b-form-input v-model="settings.business_name" /></b-form-group></b-col>
          <b-col md="6"><b-form-group label="GSTIN"><b-form-input v-model="settings.gstin" /></b-form-group></b-col>
          <b-col md="6"><b-form-group label="Email"><b-form-input v-model="settings.email" /></b-form-group></b-col>
          <b-col md="6"><b-form-group label="Phone"><b-form-input v-model="settings.phone" /></b-form-group></b-col>
          <b-col cols="12"><b-form-group label="Address"><b-form-textarea v-model="settings.address" rows="2" /></b-form-group></b-col>
          <b-col cols="12"><b-form-group label="Terms & conditions"><b-form-textarea v-model="settings.terms" rows="2" /></b-form-group></b-col>
          <b-col md="6">
            <b-form-group label="Logo">
              <img v-if="settings.logo_url" :src="settings.logo_url" alt="" class="invoice-asset-preview mb-2" />
              <b-button size="sm" variant="outline-primary" :disabled="uploadingLogo" @click.prevent="triggerAssetPick('logo')">
                {{ uploadingLogo ? 'Uploading…' : 'Upload logo' }}
              </b-button>
              <input ref="logoInput" type="file" accept="image/*" class="d-none" @change="onAssetSelected($event, 'logo')" />
            </b-form-group>
          </b-col>
          <b-col md="6">
            <b-form-group label="Signature">
              <img v-if="settings.signature_url" :src="settings.signature_url" alt="" class="invoice-asset-preview invoice-asset-preview--sig mb-2" />
              <b-button size="sm" variant="outline-primary" :disabled="uploadingSignature" @click.prevent="triggerAssetPick('signature')">
                {{ uploadingSignature ? 'Uploading…' : 'Upload signature' }}
              </b-button>
              <input ref="signatureInput" type="file" accept="image/*" class="d-none" @change="onAssetSelected($event, 'signature')" />
            </b-form-group>
          </b-col>
        </b-row>
      </b-form>
      <template #footer>
        <b-button variant="secondary" @click="templateModalVisible = false">Close</b-button>
        <b-button variant="primary" @click="saveSettings">Save template</b-button>
      </template>
    </b-modal>

    <b-modal v-model="editorVisible" size="lg" title="Private invoice" @ok.prevent="saveInvoice">
      <b-form-group label="Client name"><b-form-input v-model="form.client_name" required /></b-form-group>
      <b-form-group label="Client email"><b-form-input v-model="form.client_email" /></b-form-group>
      <b-form-group label="Issue date"><b-form-input v-model="form.issue_date" type="date" /></b-form-group>
      <b-form-group label="Status" label-size="sm">
        <b-form-select v-model="form.status" :options="statusOptions" size="sm" />
      </b-form-group>

      <h6 class="mt-3 mb-2">Line items</h6>
      <p class="small text-muted mb-2">Description, quantity, rate (₹, before tax), CGST % and SGST % per line.</p>
      <div v-for="(line, idx) in form.line_items" :key="idx" class="invoice-line-card border rounded p-3 mb-2">
        <div class="d-flex justify-content-between align-items-center mb-2">
          <span class="small font-weight-bold text-muted">Line {{ idx + 1 }}</span>
          <b-button v-if="form.line_items.length > 1" size="sm" variant="link" class="text-danger p-0" @click="form.line_items.splice(idx, 1)">Remove</b-button>
        </div>
        <b-form-group label="Description" label-size="sm" class="mb-2">
          <b-form-input v-model="line.description" />
        </b-form-group>
        <b-row>
          <b-col cols="6" md="3">
            <b-form-group label="Quantity" label-size="sm"><b-form-input v-model.number="line.quantity" type="number" min="1" /></b-form-group>
          </b-col>
          <b-col cols="6" md="3">
            <b-form-group label="Rate (₹)" label-size="sm"><b-form-input v-model.number="line.unit_amount" type="number" min="0" step="0.01" /></b-form-group>
          </b-col>
          <b-col cols="6" md="3">
            <b-form-group label="CGST %" label-size="sm"><b-form-input v-model.number="line.cgst_pct" type="number" min="0" step="0.01" /></b-form-group>
          </b-col>
          <b-col cols="6" md="3">
            <b-form-group label="SGST %" label-size="sm"><b-form-input v-model.number="line.sgst_pct" type="number" min="0" step="0.01" /></b-form-group>
          </b-col>
        </b-row>
      </div>
      <b-button size="sm" variant="outline-secondary" @click="form.line_items.push(defaultLine())">Add line item</b-button>
    </b-modal>
  </div>
</template>

<script>
const MAX_ASSET_BYTES = 2 * 1024 * 1024
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

export default {
  name: 'MediatorPrivateInvoiceSection',
  data () {
    return {
      templateModalVisible: false,
      settings: {},
      editorVisible: false,
      editingId: null,
      form: this.emptyForm(),
      uploadingLogo: false,
      uploadingSignature: false,
      statusOptions: [
        { value: 'ISSUED', text: 'Unpaid' },
        { value: 'SENT', text: 'Sent to client' },
        { value: 'PAID', text: 'Paid' }
      ]
    }
  },
  mounted () {
    this.loadSettings()
  },
  methods: {
    emptyForm () {
      return {
        client_name: '',
        client_email: '',
        issue_date: new Date().toISOString().slice(0, 10),
        status: 'ISSUED',
        line_items: [this.defaultLine()]
      }
    },
    defaultLine () {
      return { description: '', quantity: 1, unit_amount: 0, cgst_pct: 9, sgst_pct: 9 }
    },
    async loadSettings () {
      const res = await this.$store.dispatch('getPrivateInvoiceSettings')
      if (res.success) this.settings = res.data?.settings || res.settings || {}
    },
    async saveSettings () {
      const res = await this.$store.dispatch('savePrivateInvoiceSettings', this.settings)
      if (res.success) {
        this.templateModalVisible = false
        this.$emit('changed')
      }
    },
    openBranding () {
      this.templateModalVisible = true
    },
    openCreate () {
      this.editingId = null
      this.form = this.emptyForm()
      this.editorVisible = true
    },
    openEdit (row) {
      this.editingId = row.id
      this.form = {
        client_name: row.client_name || row.label,
        client_email: row.client_email || '',
        issue_date: row.issue_date ? String(row.issue_date).slice(0, 10) : '',
        status: row.status === 'DRAFT' ? 'ISSUED' : (row.status || 'ISSUED'),
        line_items: (row.line_items || []).map((l) => ({
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
        this.$emit('changed')
      }
    },
    triggerAssetPick (assetType) {
      this.$refs[assetType === 'logo' ? 'logoInput' : 'signatureInput'].click()
    },
    onAssetSelected (event, assetType) {
      const file = event.target.files && event.target.files[0]
      event.target.value = ''
      if (!file) return
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) return
      if (file.size > MAX_ASSET_BYTES) return
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
          if (assetType === 'logo') this.settings.logo_url = url
          else this.settings.signature_url = url
          await this.$store.dispatch('savePrivateInvoiceSettings', this.settings)
          this.$emit('changed')
        }
      } finally {
        this[flagKey] = false
      }
    }
  }
}
</script>

<style scoped>
.invoice-line-card { background: #fafcff; }
.invoice-asset-preview {
  max-height: 48px;
  max-width: 140px;
  object-fit: contain;
  border: 1px solid #ebedf5;
  border-radius: 6px;
  padding: 4px;
  display: block;
}
.invoice-asset-preview--sig { max-height: 64px; }
</style>
