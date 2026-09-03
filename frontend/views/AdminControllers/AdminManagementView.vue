<template>
  <b-container fluid>
    <b-row>
      <b-col sm="12">
        <iq-card>
          <template v-slot:headerTitle>
            <h4 class="card-title">{{ $t('adminManagement.title') }}</h4>
          </template>
          <template v-slot:body>
            <div class="mb-3" v-if="!isMasterAdmin">
              <b-alert model-value variant="info">{{ $t('adminManagement.viewOnlyNotice') }}</b-alert>
            </div>

            <b-row class="mb-4" v-if="isMasterAdmin">
              <b-col md="12" class="mb-2">
                <h6 class="mb-2">{{ $t('adminManagement.newAdmin') }}</h6>
              </b-col>
              <b-col md="3"><b-form-input v-model="newAdmin.name" :placeholder="$t('adminManagement.namePlaceholder')" /></b-col>
              <b-col md="3"><b-form-input v-model="newAdmin.email" :placeholder="$t('adminManagement.emailPlaceholder')" /></b-col>
              <b-col md="3"><b-form-input v-model="newAdmin.phone_number" :placeholder="$t('adminManagement.phonePlaceholder')" /></b-col>
              <b-col md="2">
                <b-form-checkbox v-model="newAdmin.master" switch @change="onNewMasterToggle">{{ $t('adminManagement.masterAdmin') }}</b-form-checkbox>
              </b-col>
              <b-col md="1"><b-button variant="primary" @click="createAdmin">{{ $t('adminManagement.create') }}</b-button></b-col>
            </b-row>

            <b-row class="mb-4" v-if="isMasterAdmin && !newAdmin.master">
              <b-col md="7">
                <div class="perm-section-title mb-2">{{ $t('adminManagement.pagesTheyCanOpen') }}</div>
                <p class="small text-muted mb-2">{{ $t('adminManagement.pagesHint') }}</p>
                <AdminPagePermissionGroups v-model="newAdminPermissions.pages" />
              </b-col>
              <b-col md="5">
                <div class="perm-section-title">{{ $t('adminManagement.dashboardWidgets') }}</div>
                <b-form-checkbox-group
                  v-model="newAdminPermissions.components"
                  :options="componentCheckboxOptions"
                  stacked
                />
              </b-col>
            </b-row>

            <b-table :items="admins" :fields="fields" small responsive>
              <template #cell(master)="row">
                <b-form-checkbox
                  :model-value="row.item.master"
                  switch
                  :disabled="!isMasterAdmin"
                  @update:model-value="onMasterChange(row.item, $event)"
                />
              </template>
              <template #cell(active)="row">
                <span :class="row.item.active ? 'text-success' : 'text-danger'">{{ row.item.active ? $t('adminManagement.active') : $t('adminManagement.inactive') }}</span>
              </template>
              <template #cell(permissions)="row">
                <span v-if="row.item.master" class="text-muted">{{ $t('adminManagement.fullAccess') }}</span>
                <span v-else class="text-muted small">{{ permissionSummary(row.item) }}</span>
              </template>
              <template #cell(actions)="row">
                <b-button size="sm" variant="outline-secondary" :disabled="!isMasterAdmin" @click="openPermissionModal(row.item)">{{ $t('adminManagement.access') }}</b-button>
                <b-button size="sm" variant="outline-primary" class="ms-1" :disabled="!isMasterAdmin" @click="saveAdmin(row.item)">{{ $t('adminManagement.save') }}</b-button>
                <b-button
                  size="sm"
                  class="ms-1"
                  :variant="row.item.active ? 'outline-danger' : 'outline-success'"
                  :disabled="!isMasterAdmin"
                  @click="toggleAdminActive(row.item)"
                >
                  {{ row.item.active ? $t('adminManagement.inactivate') : $t('adminManagement.activate') }}
                </b-button>
              </template>
            </b-table>
          </template>
        </iq-card>
      </b-col>
    </b-row>

    <b-modal v-model="permModalOpen" :title="$t('adminManagement.adminAccess')" @ok="savePermissionsFromModal" :ok-title="$t('adminManagement.saveAccess')">
      <div v-if="permEditRow">
        <p class="small text-muted mb-3">{{ $t('adminManagement.permEditHint', { name: permEditRow.name }) }}</p>
        <div v-if="permEditRow.master">
          {{ $t('adminManagement.masterFullAccess') }}
        </div>
        <div v-else>
          <p class="small text-muted mb-2">{{ $t('adminManagement.groupedNav') }}</p>
          <AdminPagePermissionGroups v-model="permModalPayload.pages" class="mb-3" />
          <div class="perm-section-title">{{ $t('adminManagement.dashboardWidgets') }}</div>
          <b-form-checkbox-group v-model="permModalPayload.components" :options="componentCheckboxOptions" stacked />
        </div>
      </div>
    </b-modal>
  </b-container>
</template>

<script>
import { sofbox } from '../../config/pluginInit'
import AdminPagePermissionGroups from '../../components/admin/AdminPagePermissionGroups.vue'
import {
  ADMIN_PAGE_GROUPS,
  ADMIN_COMPONENT_OPTIONS,
  defaultAdminPermissionPayload
} from '../../constants/adminPermissionCatalog'

export default {
  name: 'AdminManagementView',
  components: {
    AdminPagePermissionGroups
  },
  props: {
    user: {
      type: Object,
      default: () => ({})
    }
  },
  data () {
    return {
      admins: [],
      newAdmin: {
        name: '',
        email: '',
        phone_number: '',
        master: false
      },
      newAdminPermissions: defaultAdminPermissionPayload(),
      permModalOpen: false,
      permEditRow: null,
      permModalPayload: defaultAdminPermissionPayload()
    }
  },
  computed: {
    fields () {
      return [
        { key: 'name', label: this.$t('adminManagement.name') },
        { key: 'email', label: this.$t('adminManagement.email') },
        { key: 'phone_number', label: this.$t('adminManagement.phone') },
        { key: 'master', label: this.$t('adminManagement.master') },
        { key: 'permissions', label: this.$t('adminManagement.access') },
        { key: 'active', label: this.$t('adminManagement.status') },
        { key: 'actions', label: this.$t('adminManagement.actions') }
      ]
    },
    isMasterAdmin () {
      return Boolean(this.user && this.user.master)
    },
    componentCheckboxOptions () {
      return ADMIN_COMPONENT_OPTIONS.map((c) => ({ value: c.key, text: c.label }))
    }
  },
  mounted () {
    sofbox.index()
    this.fetchAdmins()
  },
  methods: {
    onNewMasterToggle () {
      if (this.newAdmin.master) return
      this.newAdminPermissions = defaultAdminPermissionPayload()
    },
    permissionSummary (item) {
      if (!item.admin_permissions || typeof item.admin_permissions !== 'object') return this.$t('adminManagement.noAccess')
      const p = item.admin_permissions.pages
      const c = item.admin_permissions.components
      const pages = Array.isArray(p) ? p : []
      const cn = Array.isArray(c) ? c.length : 0
      const groupBits = ADMIN_PAGE_GROUPS.map((group) => {
        const keys = group.pages.map((page) => page.key)
        const count = keys.filter((k) => pages.includes(k)).length
        if (!count) return null
        return count === keys.length ? group.label : `${group.label} (${count})`
      }).filter(Boolean)
      const pagePart = groupBits.length ? groupBits.join(', ') : this.$t('adminManagement.pageCount', { count: pages.length })
      return this.$t('adminManagement.summaryFmt', { pages: pagePart, widgets: this.$t('adminManagement.widgetCount', { count: cn }) })
    },
    openPermissionModal (item) {
      this.permEditRow = item
      if (item.master) {
        this.permModalPayload = defaultAdminPermissionPayload()
      } else {
        const base = defaultAdminPermissionPayload()
        const raw = item.admin_permissions
        if (raw && typeof raw === 'object') {
          this.permModalPayload = {
            pages: Array.isArray(raw.pages) ? [...raw.pages] : [...base.pages],
            components: Array.isArray(raw.components) ? [...raw.components] : [...base.components]
          }
        } else {
          this.permModalPayload = defaultAdminPermissionPayload()
        }
      }
      this.permModalOpen = true
    },
    async savePermissionsFromModal (bvEvt) {
      if (!this.permEditRow || this.permEditRow.master) return
      if (bvEvt && typeof bvEvt.preventDefault === 'function') bvEvt.preventDefault()
      const payload = {
        userId: this.permEditRow.id,
        name: this.permEditRow.name,
        email: this.permEditRow.email,
        phone_number: this.permEditRow.phone_number,
        master: this.permEditRow.master,
        admin_permissions: {
          pages: [...this.permModalPayload.pages],
          components: [...this.permModalPayload.components]
        }
      }
      const response = await this.$store.dispatch('updateAdminUser', payload)
      if (response.success) {
        this.permModalOpen = false
        this.fetchAdmins()
      }
    },
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
      const body = {
        name: this.newAdmin.name,
        email: this.newAdmin.email,
        phone_number: this.newAdmin.phone_number,
        master: this.newAdmin.master
      }
      if (!this.newAdmin.master) {
        body.admin_permissions = {
          pages: [...this.newAdminPermissions.pages],
          components: [...this.newAdminPermissions.components]
        }
      }
      const response = await this.$store.dispatch('createAdminUser', body)
      if (response.success) {
        this.newAdmin = { name: '', email: '', phone_number: '', master: false }
        this.newAdminPermissions = defaultAdminPermissionPayload()
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
      if (!item.master && item.admin_permissions && typeof item.admin_permissions === 'object') {
        payload.admin_permissions = {
          pages: Array.isArray(item.admin_permissions.pages) ? [...item.admin_permissions.pages] : [],
          components: Array.isArray(item.admin_permissions.components) ? [...item.admin_permissions.components] : []
        }
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

<style scoped>
.perm-section-title {
  font-weight: 600;
  margin-bottom: 0.35rem;
  font-size: 0.9rem;
}
</style>
