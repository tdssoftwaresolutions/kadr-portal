<template>
  <b-container fluid class="kadr-animate-in">
    <kadr-page-header :title="$t('adminUsers.title')" :subtitle="$t('adminUsers.subtitle')" />
    <b-row>
      <b-col sm="12">
        <iq-card>
          <template v-slot:body>
            <div class="d-flex justify-content-between mb-3 flex-wrap align-items-center">
              <b-form-input
                v-model="tableFilter"
                type="search"
                :placeholder="$t('adminUsers.filterPlaceholder')"
                class="mb-2 me-2"
                style="max-width: 280px;"
              />
              <div class="d-flex flex-wrap">
                <b-form-checkbox v-model="showInactive" switch class="me-3 mb-2" @change="onToggleFilters">
                  {{ $t('adminUsers.showInactive') }}
                </b-form-checkbox>
                <b-form-checkbox v-model="showDeleted" switch class="mb-2" @change="onToggleFilters">
                  {{ $t('adminUsers.showDeleted') }}
                </b-form-checkbox>
              </div>
            </div>
            <b-tabs card>
              <b-tab :title="$t('adminUsers.clientsTab', { count: activeClientsData.total })" active>
                <div v-if="activeClientsData.total > 0" class="kadr-data-table-wrap">
                  <b-table
                    :items="activeClientsData.users"
                    :fields="clientFields"
                    :filter="tableFilter"
                    :filter-included-fields="['name', 'email']"
                    hover
                    small
                    responsive
                    striped
                    show-empty
                  >
                    <template #cell(name)="row">
                      <div class="d-flex align-items-center">
                        <img
                          v-if="row.item.profile_image || row.item.profile_picture_url"
                          :src="row.item.profile_image || row.item.profile_picture_url"
                          class="rounded-circle me-2"
                          width="32"
                          height="32"
                          alt=""
                        />
                        <span>{{ row.item.name || $t('adminUsers.na') }}</span>
                      </div>
                    </template>
                    <template #cell(role)="row">
                      <b-badge variant="secondary">{{ roleLabel(row.item) }}</b-badge>
                    </template>
                    <template #cell(status)="row">
                      <b-badge :variant="statusVariant(row.item)">{{ statusLabel(row.item) }}</b-badge>
                    </template>
                    <template #cell(actions)="row">
                      <b-button variant="outline-primary" size="sm" class="me-1 mb-1" @click="openModal(row.item)">{{ $t('adminUsers.view') }}</b-button>
                      <b-button
                        v-if="!row.item.is_deleted"
                        size="sm"
                        class="mb-1"
                        variant="outline-danger"
                        @click="deleteUser(row.item)"
                      >
                        {{ $t('adminUsers.remove') }}
                      </b-button>
                      <b-button
                        v-else
                        size="sm"
                        class="mb-1"
                        variant="outline-success"
                        @click="restoreUser(row.item)"
                      >
                        {{ $t('adminUsers.restore') }}
                      </b-button>
                    </template>
                    <template #empty>
                      <kadr-empty-state
                        :title="$t('adminUsers.noUsers')"
                        :description="$t('adminUsers.noUsersDescription')"
                      />
                    </template>
                  </b-table>
                </div>
                <kadr-empty-state
                  v-else
                  :title="$t('adminUsers.noUsers')"
                  :description="$t('adminUsers.noUsersDescription')"
                />
                <b-pagination
                  v-if="activeClientsData.total > 0"
                  v-model="activeClientsPage"
                  :total-rows="activeClientsData.total"
                  :per-page="perPage"
                  align="center"
                  class="mt-3"
                  @input="fetchActiveUsers(activeClientsPage, 'CLIENT')"
                />
              </b-tab>

              <b-tab :title="$t('adminUsers.expertsTab', { count: activeMediatorsData.total })">
                <div v-if="activeMediatorsData.total > 0" class="kadr-data-table-wrap">
                  <b-table
                    :items="activeMediatorsData.users"
                    :fields="mediatorFields"
                    :filter="tableFilter"
                    :filter-included-fields="['name', 'email']"
                    hover
                    small
                    responsive
                    striped
                    show-empty
                  >
                    <template #cell(name)="row">
                      <div class="d-flex align-items-center">
                        <img
                          v-if="row.item.profile_image || row.item.profile_picture_url"
                          :src="row.item.profile_image || row.item.profile_picture_url"
                          class="rounded-circle me-2"
                          width="32"
                          height="32"
                          alt=""
                        />
                        <span>{{ row.item.name || $t('adminUsers.na') }}</span>
                      </div>
                    </template>
                    <template #cell(role)="row">
                      <b-badge variant="info">{{ roleLabel(row.item) }}</b-badge>
                    </template>
                    <template #cell(status)="row">
                      <b-badge :variant="statusVariant(row.item)">{{ statusLabel(row.item) }}</b-badge>
                    </template>
                    <template #cell(actions)="row">
                      <b-button variant="outline-primary" size="sm" class="me-1 mb-1" @click="openModal(row.item)">{{ $t('adminUsers.view') }}</b-button>
                      <b-button size="sm" class="me-1 mb-1" variant="outline-info" @click="openMediator360(row.item)">360°</b-button>
                      <b-button
                        v-if="!row.item.is_deleted"
                        size="sm"
                        class="mb-1"
                        variant="outline-danger"
                        @click="deleteMediator(row.item)"
                      >
                        {{ $t('adminUsers.remove') }}
                      </b-button>
                      <b-button
                        v-else
                        size="sm"
                        class="mb-1"
                        variant="outline-success"
                        @click="restoreUser(row.item)"
                      >
                        {{ $t('adminUsers.restore') }}
                      </b-button>
                    </template>
                    <template #empty>
                      <kadr-empty-state
                        :title="$t('adminUsers.noUsers')"
                        :description="$t('adminUsers.noUsersDescription')"
                      />
                    </template>
                  </b-table>
                </div>
                <kadr-empty-state
                  v-else
                  :title="$t('adminUsers.noUsers')"
                  :description="$t('adminUsers.noUsersDescription')"
                />
                <b-pagination
                  v-if="activeMediatorsData.total > 0"
                  v-model="activeMediatorsPage"
                  :total-rows="activeMediatorsData.total"
                  :per-page="perPage"
                  align="center"
                  class="mt-3"
                  @input="fetchActiveUsers(activeMediatorsPage, 'MEDIATOR')"
                />
              </b-tab>
            </b-tabs>
          </template>
        </iq-card>
      </b-col>
    </b-row>
    <b-modal v-model="modalVisible" size="lg" :title="$t('adminUsers.userDetails')" no-footer>
      <div v-if="selectedUser">
        <b-row>
          <b-col :md="selectedUser.profile_image || selectedUser.profile_picture_url ? 9 : 12">
            <h4>{{ selectedUser.name || $t('adminUsers.na') }}</h4>
            <p><strong>{{ $t('adminUsers.email') }}:</strong> {{ selectedUser.email || $t('adminUsers.na') }}</p>
            <div v-for="(value, key) in filteredItem(selectedUser)" :key="key" class="mb-2">
              <strong v-if="!isURL(value)">{{ formatKey(key) }}:</strong>
              <span v-if="isURL(value)">
              </span>
              <span v-else-if="key === 'preferred_languages' || key === 'preferred_language'">
                {{ getFullLanguages(value) }}
              </span>
              <span v-else-if="isArrayValue(value)">
                {{ convertToCommaSeparated(value) }}
              </span>
              <span v-else>
                {{ capitalizeWord(value) }}
              </span>
            </div>
            <section v-if="certificateFields.length" >
              <strong>{{ $t('adminUsers.documents') }}</strong>
              <div class="docs-grid">
                  <FilePreview
                  v-for="(doc, index) in certificateFields"
                  :key="doc.value"
                  :url="doc.value"
                  :name="formatKey(doc.key)"
                />
              </div>
            </section>
            <template v-if="selectedUser.cases && selectedUser.cases.length > 0">
              <strong >{{ $t('adminUsers.cases') }}:</strong>
              <div v-for="(caseItem, index) in selectedUser.cases" :key="index" style="border:1px solid var(--kadr-border);padding:5px;margin:10px 3px;border-radius: 15px;">
                <p class="mb-2"><strong>{{ $t('adminUsers.caseId') }}:</strong> {{ caseItem.caseId || $t('adminUsers.na') }}</p>
                <p class="mb-2"><strong>{{ $t('adminUsers.complaintCategory') }}:</strong> {{ caseItem.category || $t('adminUsers.na') }}</p>
                <p class="mb-2"><strong>{{ $t('adminUsers.disputeDescription') }}:</strong> {{ caseItem.description || $t('adminUsers.na') }}</p>
                <template v-if="caseItem.secondParty">
                  <p class="mb-2"><strong>{{ $t('adminUsers.oppositePartyName') }}:</strong> {{ caseItem.secondParty.name || $t('adminUsers.na') }}</p>
                  <p class="mb-2"><strong>{{ $t('adminUsers.oppositePartyEmail') }}:</strong> {{ caseItem.secondParty.email || $t('adminUsers.na') }}</p>
                  <p class="mb-2"><strong>{{ $t('adminUsers.oppositePartyPhone') }}:</strong> {{ caseItem.secondParty.phone_number || $t('adminUsers.na') }}</p>
                </template>
                <template v-if="caseItem.firstPartyRep || caseItem.secondPartyRep">
                  <p class="mb-1 mt-2"><strong>{{ $t('adminUsers.representatives') }}</strong></p>
                  <template v-if="caseItem.firstPartyRep">
                    <p class="mb-1 small text-muted">{{ $t('adminUsers.claimantRep') }}</p>
                    <p class="mb-1">{{ caseItem.firstPartyRep.name || $t('adminUsers.na') }}
                      <b-badge :variant="caseItem.firstPartyRep.active ? 'success' : 'warning'" class="ms-1">
                        {{ caseItem.firstPartyRep.active ? $t('adminUsers.repActive') : $t('adminUsers.repPending') }}
                      </b-badge>
                    </p>
                    <p class="mb-1">{{ caseItem.firstPartyRep.email }}</p>
                    <p v-if="caseItem.firstPartyRep.phone_number" class="mb-2">{{ caseItem.firstPartyRep.phone_number }}</p>
                  </template>
                  <template v-if="caseItem.secondPartyRep">
                    <p class="mb-1 small text-muted">{{ $t('adminUsers.respondentRep') }}</p>
                    <p class="mb-1">{{ caseItem.secondPartyRep.name || $t('adminUsers.na') }}
                      <b-badge :variant="caseItem.secondPartyRep.active ? 'success' : 'warning'" class="ms-1">
                        {{ caseItem.secondPartyRep.active ? $t('adminUsers.repActive') : $t('adminUsers.repPending') }}
                      </b-badge>
                    </p>
                    <p class="mb-1">{{ caseItem.secondPartyRep.email }}</p>
                    <p v-if="caseItem.secondPartyRep.phone_number" class="mb-2">{{ caseItem.secondPartyRep.phone_number }}</p>
                  </template>
                </template>
                <div v-if="caseItem.evidence_document_url">
                  <p class="mb-2"><strong>{{ $t('adminUsers.attachments') }}:</strong></p>
                  <div class="docs-grid mt-2">
                    <FilePreview
                      :url="caseItem.evidence_document_url"
                      :name="$t('adminUsers.evidenceDocument')"
                    />
                  </div>
                </div>
              </div>
            </template>
          </b-col>
          <b-col md="3" v-if="selectedUser.profile_image || selectedUser.profile_picture_url">
            <img :src="selectedUser.profile_image || selectedUser.profile_picture_url" class="img-fluid rounded-circle mb-3" style="width: 120px; height: 120px; object-fit: cover;" alt="Profile" />
          </b-col>
        </b-row>
        <div class="d-flex justify-content-end mt-3">
          <b-button variant="secondary" @click="modalVisible = false">{{ $t('common.close') }}</b-button>
        </div>
      </div>
    </b-modal>
    <admin-mediator-offboarding-modal
      :visible="offboardingVisible"
      :mediator-id="offboardingMediatorId"
      @close="offboardingVisible = false"
      @completed="onOffboardingCompleted"
    />
  </b-container>
</template>

<script>
import { sofbox } from '../../config/pluginInit'
import FilePreview from '../../components/DocumentPreview.vue'
import AdminMediatorOffboardingModal from '../../components/admin/AdminMediatorOffboardingModal.vue'
import KadrPageHeader from '../../components/kadr/KadrPageHeader.vue'
import KadrEmptyState from '../../components/kadr/KadrEmptyState.vue'

export default {
  name: 'UserList',
  components: {
    FilePreview,
    AdminMediatorOffboardingModal,
    KadrPageHeader,
    KadrEmptyState
  },
  mounted () {
    sofbox.index()
    this.fetchActiveUsers(1)
    this.fetchLanguages()
  },
  data () {
    return {
      tableFilter: '',
      activeClientsPage: 1,
      activeMediatorsPage: 1,
      perPage: 10,
      showInactive: false,
      showDeleted: false,
      activeClientsData: { users: [], total: 0 },
      activeMediatorsData: { users: [], total: 0 },
      modalVisible: false,
      selectedUser: null,
      languages: {},
      offboardingVisible: false,
      offboardingMediatorId: ''
    }
  },
  computed: {
    tableFields () {
      return [
        { key: 'name', label: this.$t('adminUsers.colName'), sortable: true },
        { key: 'email', label: this.$t('adminUsers.colEmail'), sortable: true },
        { key: 'role', label: this.$t('adminUsers.colRole'), sortable: false },
        { key: 'status', label: this.$t('adminUsers.colStatus'), sortable: false },
        { key: 'actions', label: this.$t('adminUsers.colActions'), sortable: false }
      ]
    },
    clientFields () {
      return this.tableFields
    },
    mediatorFields () {
      return this.tableFields
    },
    certificateFields () {
      if (!this.selectedUser) return []
      return Object.entries(this.selectedUser)
        .filter(([key, value]) => ['certificate', 'document'].some(certKey => key.toLowerCase().includes(certKey)) && value && this.isURL(value))
        .map(([key, value]) => ({ key, value }))
    }
  },
  methods: {
    roleLabel (user) {
      const type = (user.user_type || '').toUpperCase()
      if (type === 'MEDIATOR') return this.$t('adminUsers.roleExpert')
      if (type === 'CLIENT') return this.$t('adminUsers.roleClient')
      return type || '—'
    },
    statusLabel (user) {
      if (user.is_deleted) return this.$t('adminUsers.statusDeleted')
      if (user.active === false) return this.$t('adminUsers.statusInactive')
      return this.$t('adminUsers.statusActive')
    },
    statusVariant (user) {
      if (user.is_deleted) return 'secondary'
      if (user.active === false) return 'warning'
      return 'success'
    },
    isArrayValue (value) {
      try {
        const parsed = JSON.parse(value)
        return Array.isArray(parsed)
      } catch (e) {
        return false
      }
    },
    capitalizeWord (str) {
      if (!str) return ''
      if (typeof str !== 'string') return str
      return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
    },
    convertToCommaSeparated (value) {
      try {
        const parsed = JSON.parse(value)
        if (Array.isArray(parsed)) {
          return parsed
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(', ')
        } else {
          return ''
        }
      } catch (e) {
        return ''
      }
    },
    async fetchActiveUsers (page, type = null) {
      try {
        if (!type) {
          const [clientsResponse, mediatorsResponse] = await Promise.all([
            this.$store.dispatch('getActiveUsers', { page: 1, type: 'CLIENT', includeInactive: this.showInactive, includeDeleted: this.showDeleted }),
            this.$store.dispatch('getActiveUsers', { page: 1, type: 'MEDIATOR', includeInactive: this.showInactive, includeDeleted: this.showDeleted })
          ])

          if (clientsResponse.success) {
            this.activeClientsData = clientsResponse
          }

          if (mediatorsResponse.success) {
            this.activeMediatorsData = mediatorsResponse
          }
        } else {
          const response = await this.$store.dispatch('getActiveUsers', { page, type, includeInactive: this.showInactive, includeDeleted: this.showDeleted })
          if (response.success) {
            if (type === 'CLIENT') {
              this.activeClientsData = response
              this.activeClientsPage = page
            } else if (type === 'MEDIATOR') {
              this.activeMediatorsData = response
              this.activeMediatorsPage = page
            }
          }
        }
      } catch (error) {
        console.error('Error fetching active users:', error)
      }
    },
    onToggleFilters () {
      this.activeClientsPage = 1
      this.activeMediatorsPage = 1
      this.fetchActiveUsers(1)
    },
    async deleteUser (user) {
      if (!window.confirm(this.$t('adminUsers.confirmRemove', { name: user.name || user.email }))) return
      const response = await this.$store.dispatch('adminSetUserDeleted', { userId: user.userId, isDeleted: true })
      if (response.success) {
        this.fetchActiveUsers(user.user_type === 'CLIENT' ? this.activeClientsPage : this.activeMediatorsPage, user.user_type)
      }
    },
    deleteMediator (user) {
      this.offboardingMediatorId = user.userId || user.id
      this.offboardingVisible = true
    },
    openMediator360 (user) {
      const id = user.userId || user.id
      this.$router.push({ name: 'app.mediator-360', params: { mediatorId: id } })
    },
    onOffboardingCompleted () {
      this.fetchActiveUsers(this.activeMediatorsPage, 'MEDIATOR')
    },
    async restoreUser (user) {
      const response = await this.$store.dispatch('adminSetUserDeleted', { userId: user.userId, isDeleted: false })
      if (response.success) {
        this.fetchActiveUsers(user.user_type === 'CLIENT' ? this.activeClientsPage : this.activeMediatorsPage, user.user_type)
      }
    },
    formatDate (dateString) {
      return this.$formatDateTime(dateString)
    },
    formatKey (key) {
      return key.replace(/_/g, ' ').replace('url', '').replace(/\b\w/g, (char) => char.toUpperCase())
    },
    isURL (value) {
      const urlPattern = /^(https?:\/\/[^\s$.?#].[^\s]*)$/i
      return urlPattern.test(value)
    },
    filteredItem (item) {
      const irrelevantKeys = ['name', 'email', 'cases', '_showDetails', 'userId', 'created_at', 'active', 'otherPartyUserId', 'caseId', 'google_token', 'user_type', 'updated_at', 'is_self_signed_up', 'profile_image', 'profile_picture_url']
      return Object.fromEntries(
        Object.entries(item).filter(([key, value]) => !irrelevantKeys.includes(key) && value !== null && value !== 0)
      )
    },
    openModal (user) {
      this.selectedUser = user
      this.modalVisible = true
    },
    getLanguageName (code) {
      return this.languages[code] || code
    },
    getFullLanguages (value) {
      if (!value) return ''
      try {
        const codes = this.isArrayValue(value) ? JSON.parse(value) : value.split(',')
        return codes.map(code => this.getLanguageName(code.trim())).join(', ')
      } catch (e) {
        return value
      }
    },
    async fetchLanguages () {
      try {
        const response = await this.$store.dispatch('getAllLanguages')
        if (response.success) {
          this.languages = response.data.languages || {}
        }
      } catch (error) {
        console.error('Failed to fetch languages:', error)
      }
    },
    openCertificate (url) {
      window.open(url, '_blank', 'noopener,noreferrer')
    }
  }
}
</script>
<style scoped>
.docs-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 0.75rem;
  margin-top: 0.75rem;
}

:deep(.card-header) {
  background-color: unset !important;
  border-bottom: unset !important;
}

.rounded-circle {
  object-fit: cover;
}
</style>
