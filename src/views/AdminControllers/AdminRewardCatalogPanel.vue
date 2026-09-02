<template>
  <iq-card class="h-100 admin-settings-compact">
    <template v-slot:headerTitle>
      <h4 class="card-title mb-0">Reward catalog</h4>
    </template>
    <template v-slot:body>
      <p class="text-muted compact-hint mb-2">
        Items mediators can redeem with points (e.g. 2000 pts → ₹500 Amazon gift card).
      </p>
      <b-button size="sm" variant="primary" class="mb-3" @click="openForm()">Add reward item</b-button>

      <b-table :items="items" :fields="catalogFields" small responsive class="compact-table">
        <template #cell(active)="row">
          <b-badge :variant="row.item.active ? 'success' : 'secondary'">{{ row.item.active ? 'Active' : 'Hidden' }}</b-badge>
        </template>
        <template #cell(actions)="row">
          <b-button size="sm" variant="outline-primary" class="me-1" @click="openForm(row.item)">Edit</b-button>
          <b-button size="sm" variant="outline-danger" @click="removeItem(row.item)">Remove</b-button>
        </template>
      </b-table>
      <div v-if="!items.length && !loading" class="text-muted small py-2">No catalog items yet.</div>

      <b-modal v-model="formVisible" :title="form.id ? 'Edit reward' : 'Add reward'" @hidden="resetForm">
        <b-form @submit.prevent="saveItem">
          <b-form-group label="Title" label-size="sm">
            <b-form-input v-model="form.title" required placeholder="₹500 Amazon gift card" />
          </b-form-group>
          <b-form-group label="Description" label-size="sm">
            <b-form-textarea v-model="form.description" rows="2" placeholder="Optional details for mediators" />
          </b-form-group>
          <b-form-group label="Points required" label-size="sm">
            <b-form-input v-model.number="form.points_cost" type="number" min="1" required />
          </b-form-group>
          <b-form-group label="Sort order" label-size="sm">
            <b-form-input v-model.number="form.sort_order" type="number" min="0" />
          </b-form-group>
          <b-form-checkbox v-model="form.active">Visible in mediator store</b-form-checkbox>
          <b-form-group label="Fulfillment" label-size="sm" class="mt-2">
            <b-form-select v-model="form.fulfillment_type" :options="fulfillmentTypeOptions" />
          </b-form-group>
          <div v-if="form.fulfillment_type === 'AUTO'" class="fulfillment-rule-picker mt-2">
            <b-form-group label="Fulfillment rule" label-size="sm" class="mb-2">
              <b-form-select v-model="form.fulfillment_rule_id" :options="ruleOptions">
                <template #first>
                  <b-form-select-option :value="null">Select rule…</b-form-select-option>
                </template>
              </b-form-select>
            </b-form-group>
            <p v-if="!fulfillmentRules.length" class="small text-warning mb-2">
              No fulfillment rules yet. Create one to define what runs when this reward is redeemed (e.g. extend Pro, send email).
            </p>
            <div class="d-flex flex-wrap align-items-center">
              <b-button size="sm" variant="outline-primary" class="me-2 mb-1" @click="requestCreateRule">
                Create new rule
              </b-button>
              <b-button size="sm" variant="link" class="p-0 mb-1" @click="loadRules">
                Refresh rules
              </b-button>
            </div>
            <p class="small text-muted mb-0 mt-1">
              Rules are built in the section below (Pro features &amp; reward automation). After saving a rule, refresh and select it here.
            </p>
          </div>
        </b-form>
        <template #modal-footer>
          <b-button variant="secondary" @click="formVisible = false">Cancel</b-button>
          <b-button variant="primary" @click="saveItem">Save</b-button>
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
      fulfillmentRules: [],
      fulfillmentTypeOptions: [
        { value: 'MANUAL', text: 'Manual (admin fulfills order)' },
        { value: 'AUTO', text: 'Automatic (run fulfillment rule)' }
      ],
      catalogFields: [
        { key: 'title', label: 'Reward' },
        { key: 'points_cost', label: 'Points', class: 'text-end' },
        { key: 'sort_order', label: 'Order', class: 'text-center' },
        { key: 'active', label: 'Status' },
        { key: 'actions', label: '' }
      ]
    }
  },
  computed: {
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
      if (!window.confirm(`Remove "${item.title}" from the catalog?`)) return
      const res = await this.$store.dispatch('deleteRewardCatalogItem', { id: item.id })
      if (res.success) this.load()
    }
  }
}
</script>
