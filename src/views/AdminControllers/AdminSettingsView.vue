<template>
  <b-container fluid class="admin-settings-page">
    <b-row>
      <b-col sm="12" lg="6" class="mb-4">
        <iq-card class="mb-3 admin-settings-compact">
          <template v-slot:headerTitle>
            <h4 class="card-title mb-0">Invoice & commission settings</h4>
          </template>
          <template v-slot:body>
            <p class="text-muted compact-hint">
              Default mediator revenue share and tax percentages for invoices.
            </p>
            <b-form @submit.prevent="saveInvoiceSettings">
              <b-table :items="invoiceSettings" :fields="fields" small responsive class="compact-table">
                <template #cell(label)="row">
                  <span class="compact-label">{{ row.item.label }}</span>
                </template>
                <template #cell(value)="row">
                  <b-form-input v-model="row.item.value" type="number" min="0" step="any" size="sm" required />
                </template>
              </b-table>
              <b-button type="submit" variant="primary" size="sm" :disabled="!invoiceSettings.length">
                Save invoice settings
              </b-button>
            </b-form>
          </template>
        </iq-card>

        <iq-card class="admin-settings-compact">
          <template v-slot:headerTitle>
            <h4 class="card-title mb-0">Reward points settings</h4>
          </template>
          <template v-slot:body>
            <p class="text-muted compact-hint">
              Points earned per activity. Applies to new awards only.
            </p>
            <b-form @submit.prevent="saveRewardSettings">
              <b-table :items="rewardSettings" :fields="fields" small responsive class="compact-table">
                <template #cell(label)="row">
                  <span class="compact-label">{{ row.item.label }}</span>
                </template>
                <template #cell(value)="row">
                  <b-form-input v-model="row.item.value" type="number" min="0" step="1" size="sm" required />
                </template>
              </b-table>
              <b-button type="submit" variant="primary" size="sm" :disabled="!rewardSettings.length">
                Save reward settings
              </b-button>
            </b-form>
          </template>
        </iq-card>
      </b-col>

      <b-col sm="12" lg="6" class="mb-4">
        <admin-reward-catalog-panel
          ref="rewardCatalog"
          @create-fulfillment-rule="openFulfillmentRuleEditor"
          @fulfillment-rules-changed="onFulfillmentRulesChanged"
        />
        <admin-premium-settings-panel ref="premiumPanel" @fulfillment-rules-changed="onFulfillmentRulesChanged" />
        <div class="text-end mt-2">
          <router-link :to="{ name: 'app.reward-orders' }" class="btn btn-sm btn-outline-secondary">
            View redemption orders →
          </router-link>
        </div>
      </b-col>
    </b-row>
  </b-container>
</template>

<script>
import { sofbox } from '../../config/pluginInit'
import AdminRewardCatalogPanel from './AdminRewardCatalogPanel.vue'
import AdminPremiumSettingsPanel from '../../components/admin/AdminPremiumSettingsPanel.vue'

const INVOICE_SETTING_KEYS = new Set([
  'mediator_commission',
  'invoice_gst_percentage',
  'invoice_tax_percentage',
  'premium_pro_monthly_price_inr'
])

function isRewardSetting (key) {
  const k = String(key || '')
  return k.startsWith('reward_points_')
}

function isPremiumSetting (key) {
  return String(key || '').startsWith('premium_')
}

function mapSettingRow (s) {
  return {
    id: s.id,
    label: s.label,
    key: s.key,
    value: s.value
  }
}

export default {
  name: 'AdminSettingsView',
  components: { AdminRewardCatalogPanel, AdminPremiumSettingsPanel },
  data () {
    return {
      settings: [],
      fields: [
        { key: 'label', label: 'Setting' },
        { key: 'value', label: 'Value' }
      ]
    }
  },
  computed: {
    invoiceSettings () {
      return this.settings.filter(s => INVOICE_SETTING_KEYS.has(s.key) || isPremiumSetting(s.key))
    },
    rewardSettings () {
      return this.settings.filter(s => isRewardSetting(s.key))
    }
  },
  mounted () {
    sofbox.index()
    this.load()
  },
  methods: {
    async load () {
      const res = await this.$store.dispatch('getAdminSettings')
      if (res.success && res.data && Array.isArray(res.data.settings)) {
        this.settings = res.data.settings.map(mapSettingRow)
      }
    },
    async saveInvoiceSettings () {
      await this.saveSubset(this.invoiceSettings)
    },
    async saveRewardSettings () {
      await this.saveSubset(this.rewardSettings)
    },
    async saveSubset (rows) {
      if (!rows.length) return
      const res = await this.$store.dispatch('saveAdminSettings', { settings: rows })
      if (res.success) this.load()
    },
    onFulfillmentRulesChanged () {
      const catalog = this.$refs.rewardCatalog
      if (catalog && typeof catalog.loadRules === 'function') {
        catalog.loadRules()
      }
      const premium = this.$refs.premiumPanel
      if (premium && typeof premium.reloadFulfillmentRules === 'function') {
        premium.reloadFulfillmentRules()
      }
    },
    openFulfillmentRuleEditor () {
      const premium = this.$refs.premiumPanel
      if (premium && typeof premium.openFulfillmentRuleEditor === 'function') {
        premium.openFulfillmentRuleEditor()
      }
    }
  }
}
</script>

<style scoped>
.admin-settings-page {
  max-width: 1400px;
}
.compact-hint {
  font-size: 0.85rem;
  margin-bottom: 0.75rem;
}
.compact-label {
  font-size: 0.82rem;
  line-height: 1.3;
  display: block;
}
.admin-settings-compact >>> .table td,
.admin-settings-compact >>> .table th {
  padding: 0.35rem 0.5rem;
  vertical-align: middle;
}
.admin-settings-compact >>> .card-body {
  padding-top: 0.75rem;
}
</style>
