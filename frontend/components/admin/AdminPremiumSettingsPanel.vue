<template>
  <iq-card class="admin-settings-compact mt-3">
    <template v-slot:headerTitle>
      <h4 class="card-title mb-0">{{ $t('adminPremium.title') }}</h4>
    </template>
    <template v-slot:body>
      <h6 class="mb-2">{{ $t('adminPremium.featureCatalog') }}</h6>
      <b-table :items="features" :fields="featureFields" small responsive class="mb-4">
        <template #cell(included_in_pro)="row">
          <b-form-checkbox v-model="row.item.included_in_pro" @change="saveFeature(row.item)" />
        </template>
        <template #cell(active)="row">
          <b-form-checkbox v-model="row.item.active" @change="saveFeature(row.item)" />
        </template>
      </b-table>

      <admin-reward-fulfillment-rules-panel ref="fulfillmentRules" @rules-changed="$emit('fulfillment-rules-changed')" />
    </template>
  </iq-card>
</template>

<script>
import AdminRewardFulfillmentRulesPanel from './AdminRewardFulfillmentRulesPanel.vue'

export default {
  name: 'AdminPremiumSettingsPanel',
  components: { AdminRewardFulfillmentRulesPanel },
  data () {
    return {
      features: []
    }
  },
  computed: {
    featureFields () {
      return [
        { key: 'label', label: this.$t('adminPremium.colFeature') },
        { key: 'feature_key', label: this.$t('adminPremium.colKey') },
        { key: 'included_in_pro', label: this.$t('adminPremium.colInPro') },
        { key: 'active', label: this.$t('adminPremium.colActive') }
      ]
    }
  },
  mounted () {
    this.load()
  },
  methods: {
    async load () {
      const f = await this.$store.dispatch('getPremiumFeaturesAdmin')
      if (f.success) this.features = f.data?.features || f.features || []
    },
    async saveFeature (item) {
      await this.$store.dispatch('updatePremiumFeature', {
        id: item.id,
        included_in_pro: item.included_in_pro,
        active: item.active
      })
    },
    openFulfillmentRuleEditor () {
      const panel = this.$refs.fulfillmentRules
      if (panel && typeof panel.openEditor === 'function') {
        panel.openEditor()
        this.$nextTick(() => {
          const el = panel.$el
          if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        })
      }
    },
    async reloadFulfillmentRules () {
      const panel = this.$refs.fulfillmentRules
      if (panel && typeof panel.load === 'function') {
        await panel.load()
      }
    }
  }
}
</script>
