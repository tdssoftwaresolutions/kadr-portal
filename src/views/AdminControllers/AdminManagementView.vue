<template>
  <b-container fluid>
    <b-row>
      <b-col sm="12">
        <iq-card>
          <template v-slot:headerTitle>
            <h4 class="card-title">Admin Profile Management</h4>
          </template>
          <template v-slot:body>
            <div class="mb-3" v-if="!isMasterAdmin">
              <b-alert show variant="info">You have view-only access. Only master admins can create/edit/inactivate admins.</b-alert>
            </div>

            <b-row class="mb-4" v-if="isMasterAdmin">
              <b-col md="3"><b-form-input v-model="newAdmin.name" placeholder="Name" /></b-col>
              <b-col md="3"><b-form-input v-model="newAdmin.email" placeholder="Email" /></b-col>
              <b-col md="3"><b-form-input v-model="newAdmin.phone_number" placeholder="Phone" /></b-col>
              <b-col md="2">
                <b-form-checkbox v-model="newAdmin.master" switch>Master admin</b-form-checkbox>
              </b-col>
              <b-col md="1"><b-button variant="primary" @click="createAdmin">Create</b-button></b-col>
            </b-row>

            <b-table :items="admins" :fields="fields" small responsive>
              <template #cell(master)="row">
                <b-form-checkbox
                  :checked="row.item.master"
                  switch
                  :disabled="!isMasterAdmin"
                  @change="onMasterChange(row.item, $event)"
                />
              </template>
              <template #cell(active)="row">
                <span :class="row.item.active ? 'text-success' : 'text-danger'">{{ row.item.active ? 'Active' : 'Inactive' }}</span>
              </template>
              <template #cell(actions)="row">
                <b-button size="sm" variant="outline-primary" :disabled="!isMasterAdmin" @click="saveAdmin(row.item)">Save</b-button>
                <b-button
                  size="sm"
                  class="ml-2"
                  :variant="row.item.active ? 'outline-danger' : 'outline-success'"
                  :disabled="!isMasterAdmin"
                  @click="toggleAdminActive(row.item)"
                >
                  {{ row.item.active ? 'Inactivate' : 'Activate' }}
                </b-button>
              </template>
            </b-table>
          </template>
        </iq-card>
      </b-col>
    </b-row>
  </b-container>
</template>

<script>
import { sofbox } from '../../config/pluginInit'

export default {
  name: 'AdminManagementView',
  props: {
    user: {
      type: Object,
      default: () => ({})
    }
  },
  data () {
    return {
      admins: [],
      fields: [
        { key: 'name', label: 'Name' },
        { key: 'email', label: 'Email' },
        { key: 'phone_number', label: 'Phone' },
        { key: 'master', label: 'Master' },
        { key: 'active', label: 'Status' },
        { key: 'actions', label: 'Actions' }
      ],
      newAdmin: {
        name: '',
        email: '',
        phone_number: '',
        master: false
      }
    }
  },
  computed: {
    isMasterAdmin () {
      return Boolean(this.user && this.user.master)
    }
  },
  mounted () {
    sofbox.index()
    this.fetchAdmins()
  },
  methods: {
    async fetchAdmins () {
      const response = await this.$store.dispatch('getAdminUsers')
      if (response.success) {
        this.admins = response.data.admins || []
      }
    },
    onMasterChange (item, value) {
      item.master = value
    },
    async createAdmin () {
      if (!this.isMasterAdmin) return
      const response = await this.$store.dispatch('createAdminUser', this.newAdmin)
      if (response.success) {
        this.newAdmin = { name: '', email: '', phone_number: '', master: false }
        this.fetchAdmins()
      }
    },
    async saveAdmin (item) {
      if (!this.isMasterAdmin) return
      const payload = {
        userId: item.id,
        name: item.name,
        email: item.email,
        phone_number: item.phone_number,
        master: item.master
      }
      const response = await this.$store.dispatch('updateAdminUser', payload)
      if (response.success) this.fetchAdmins()
    },
    async toggleAdminActive (item) {
      if (!this.isMasterAdmin) return
      const response = await this.$store.dispatch('setAdminUserActive', { userId: item.id, active: !item.active })
      if (response.success) this.fetchAdmins()
    }
  }
}
</script>
