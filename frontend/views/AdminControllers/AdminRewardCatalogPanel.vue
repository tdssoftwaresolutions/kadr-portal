<template>
  <iq-card class="h-100 admin-settings-compact">
    <template v-slot:headerTitle>
      <h4 class="card-title mb-0">{{ $t('adminRewardCatalog.title') }}</h4>
    </template>
    <template v-slot:body>
      <p class="text-muted compact-hint mb-2">
        {{ $t('adminRewardCatalog.hint') }}
      </p>
      <b-button size="sm" variant="primary" class="mb-3" @click="openForm()">{{ $t('adminRewardCatalog.addRewardItem') }}</b-button>

      <b-table :items="items" :fields="catalogFields" small responsive class="compact-table">
        <template #cell(active)="row">
          <b-badge :variant="row.item.active ? 'success' : 'secondary'">{{ row.item.active ? $t('adminRewardCatalog.active') : $t('adminRewardCatalog.hidden') }}</b-badge>
        </template>
        <template #cell(actions)="row">
          <b-button size="sm" variant="outline-primary" class="me-1" @click="openForm(row.item)">{{ $t('adminRewardCatalog.edit') }}</b-button>
          <b-button size="sm" variant="outline-danger" @click="removeItem(row.item)">{{ $t('adminRewardCatalog.remove') }}</b-button>
        </template>
      </b-table>
      <div v-if="!items.length && !loading" class="text-muted small py-2">{{ $t('adminRewardCatalog.noItems') }}</div>

      <b-modal v-model="formVisible" :title="form.id ? $t('adminRewardCatalog.editReward') : $t('adminRewardCatalog.addReward')" @hidden="resetForm">
        <b-form @submit.prevent="saveItem">
          <b-form-group :label="$t('adminRewardCatalog.titleLabel')" label-size="sm">
            <b-form-input v-model="form.title" required :placeholder="$t('adminRewardCatalog.titlePlaceholder')" />
          </b-form-group>
          <b-form-group :label="$t('adminRewardCatalog.description')" label-size="sm">
            <b-form-textarea v-model="form.description" rows="2" :placeholder="$t('adminRewardCatalog.descriptionPlaceholder')" />
          </b-form-group>
          <b-form-group :label="$t('adminRewardCatalog.pointsRequired')" label-size="sm">
            <b-form-input v-model.number="form.points_cost" type="number" min="1" required />
          </b-form-group>
          <b-form-group :label="$t('adminRewardCatalog.sortOrder')" label-size="sm">
            <b-form-input v-model.number="form.sort_order" type="number" min="0" />
          </b-form-group>
          <b-form-checkbox v-model="form.active">{{ $t('adminRewardCatalog.visibleInStore') }}</b-form-checkbox>
          <b-form-group :label="$t('adminRewardCatalog.fulfillment')" label-size="sm" class="mt-2">
            <b-form-select v-model="form.fulfillment_type" :options="fulfillmentTypeOptions" />
          </b-form-group>
          <div v-if="form.fulfillment_type === 'AUTO'" class="fulfillment-rule-picker mt-2">
            <b-form-group :label="$t('adminRewardCatalog.fulfillmentRule')" label-size="sm" class="mb-2">
              <b-form-select v-model="form.fulfillment_rule_id" :options="ruleOptions">
                <template #first>
                  <b-form-select-option :value="null">{{ $t('adminRewardCatalog.selectRule') }}</b-form-select-option>
                </template>
              </b-form-select>
            </b-form-group>
            <p v-if="!fulfillmentRules.length" class="small text-warning mb-2">
              {{ $t('adminRewardCatalog.noRulesYet') }}
            </p>
            <div class="d-flex flex-wrap align-items-center">
              <b-button size="sm" variant="outline-primary" class="me-2 mb-1" @click="requestCreateRule">
                {{ $t('adminRewardCatalog.createNewRule') }}
              </b-button>
              <b-button size="sm" variant="link" class="p-0 mb-1" @click="loadRules">
                {{ $t('adminRewardCatalog.refreshRules') }}
              </b-button>
            </div>
            <p class="small text-muted mb-0 mt-1">
              {{ $t('adminRewardCatalog.rulesBuiltBelow') }}
            </p>
          </div>
        </b-form>
        <template #footer>
          <b-button variant="secondary" @click="formVisible = false">{{ $t('adminRewardCatalog.cancel') }}</b-button>
          <b-button variant="primary" @click="saveItem">{{ $t('adminRewardCatalog.save') }}</b-button>
        </template>
      </b-modal>
    </template>
  </iq-card>
</template>

<script>
export default {
  name: 'AdminRewardCatalogPanel',
  data () {
    return {
      items: [],
      loading: false,
      formVisible: false,
      form: this.emptyForm(),
      fulfillmentRules: []
    }
  },
  computed: {
    fulfillmentTypeOptions () {
      return [
        { value: 'MANUAL', text: this.$t('adminRewardCatalog.fulfillManual') },
        { value: 'AUTO', text: this.$t('adminRewardCatalog.fulfillAuto') }
      ]
    },
    catalogFields () {
      return [
        { key: 'title', label: this.$t('adminRewardCatalog.colReward') },
        { key: 'points_cost', label: this.$t('adminRewardCatalog.colPoints'), class: 'text-end' },
        { key: 'sort_order', label: this.$t('adminRewardCatalog.colOrder'), class: 'text-center' },
        { key: 'active', label: this.$t('adminRewardCatalog.colStatus') },
        { key: 'actions', label: '' }
      ]
    },
    ruleOptions () {
      return this.fulfillmentRules.map((r) => ({ value: r.id, text: r.name }))
    }
  },
  mounted () {
    this.load()
    this.loadRules()
  },
  methods: {
    emptyForm () {
      return {
        id: null,
        title: '',
        description: '',
        points_cost: 1000,
        active: true,
        sort_order: 0,
        fulfillment_type: 'MANUAL',
        fulfillment_rule_id: null
      }
    },
    resetForm () {
      this.form = this.emptyForm()
    },
    async loadRules () {
      const res = await this.$store.dispatch('getRewardFulfillmentRules')
      if (res.success) this.fulfillmentRules = res.data?.rules || res.rules || []
    },
    requestCreateRule () {
      this.$emit('create-fulfillment-rule')
    },
    async load () {
      this.loading = true
      try {
        const res = await this.$store.dispatch('getRewardCatalogAdmin')
        if (res.success && res.data) this.items = res.data.items || []
      } finally {
        this.loading = false
      }
    },
    openForm (item) {
      if (item) {
        this.form = {
          id: item.id,
          title: item.title,
          description: item.description || '',
          points_cost: item.points_cost,
          active: item.active,
          sort_order: item.sort_order || 0,
          fulfillment_type: item.fulfillment_type || 'MANUAL',
          fulfillment_rule_id: item.fulfillment_rule_id || null
        }
      } else {
        this.form = this.emptyForm()
      }
      this.formVisible = true
    },
    async saveItem () {
      const res = await this.$store.dispatch('saveRewardCatalogItem', { ...this.form })
      if (res.success) {
        this.formVisible = false
        this.load()
      }
    },
    async removeItem (item) {
      if (!window.confirm(this.$t('adminRewardCatalog.confirmRemove', { title: item.title }))) return
      const res = await this.$store.dispatch('deleteRewardCatalogItem', { id: item.id })
      if (res.success) this.load()
    }
  }
}
</script>
