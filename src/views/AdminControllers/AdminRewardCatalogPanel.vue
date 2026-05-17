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
          <b-button size="sm" variant="outline-primary" class="mr-1" @click="openForm(row.item)">Edit</b-button>
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
      catalogFields: [
        { key: 'title', label: 'Reward' },
        { key: 'points_cost', label: 'Points', class: 'text-right' },
        { key: 'sort_order', label: 'Order', class: 'text-center' },
        { key: 'active', label: 'Status' },
        { key: 'actions', label: '' }
      ]
    }
  },
  mounted () {
    this.load()
  },
  methods: {
    emptyForm () {
      return { id: null, title: '', description: '', points_cost: 1000, active: true, sort_order: 0 }
    },
    resetForm () {
      this.form = this.emptyForm()
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
          sort_order: item.sort_order || 0
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
