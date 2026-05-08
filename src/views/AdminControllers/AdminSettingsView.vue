<template>
  <b-container fluid>
    <b-row>
      <b-col sm="12" lg="8">
        <iq-card>
          <template v-slot:headerTitle>
            <h4 class="card-title mb-0">Settings</h4>
          </template>
          <template v-slot:body>
            <p class="text-muted">Configure settings records using label, key, and value.</p>
            <b-form @submit.prevent="saveSettings">
              <b-table :items="settings" :fields="fields" small responsive>
                <template #cell(value)="row">
                  <b-form-input v-model="row.item.value" required />
                </template>
              </b-table>
              <b-button type="submit" variant="primary">Save settings</b-button>
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
  name: 'AdminSettingsView',
  data () {
    return {
      settings: [],
      fields: [
        { key: 'label', label: 'Setting' },
        { key: 'value', label: 'Value' }
      ]
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
        this.settings = res.data.settings.map(s => ({
          id: s.id,
          label: s.label,
          key: s.key,
          value: s.value
        }))
      }
    },
    async saveSettings () {
      const res = await this.$store.dispatch('saveAdminSettings', { settings: this.settings })
      if (res.success) this.load()
    }
  }
}
</script>
