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
            <div v-if="loading" class="admin-users-loading">
              <kadr-spinner size="lg" />
            </div>
            <b-tabs v-else card>
              <b-tab :title="$t('adminUsers.clientsTab', { count: activeClientsData.total })" active>
                <b-row v-if="filteredClients.length > 0">
                  <b-col md="6" v-for="user in filteredClients" :key="user.userId" class="mb-3">
                    <b-card class="h-100 user-card">
                      <b-card-body class="d-flex flex-column">
                        <div class="d-flex align-items-center mb-3">
                          <img
                            v-if="user.profile_image || user.profile_picture_url"
                            :src="user.profile_image || user.profile_picture_url"
                            class="rounded-circle me-3"
                            width="48"
                            height="48"
                            alt=""
                          />
                          <div>
                            <h5 class="mb-1">{{ user.name || $t('adminUsers.na') }}</h5>
                            <p class="mb-0 text-muted small">{{ user.email || $t('adminUsers.na') }}</p>
                          </div>
                        </div>
                        <div class="mb-3">
                          <b-badge variant="secondary" class="me-1">{{ roleLabel(user) }}</b-badge>
                          <b-badge :variant="statusVariant(user)">{{ statusLabel(user) }}</b-badge>
                        </div>
                        <div class="mt-auto d-flex flex-wrap justify-content-end">
                          <b-button variant="outline-primary" size="sm" class="me-1 mb-1" @click="openModal(user)">{{ $t('adminUsers.view') }}</b-button>
                          <b-button
                            v-if="!user.is_deleted"
                            size="sm"
                            class="mb-1"
                            variant="outline-danger"
                            @click="deleteUser(user)"
                          >
                            {{ $t('adminUsers.remove') }}
                          </b-button>
                          <b-button
                            v-else
                            size="sm"
                            class="mb-1"
                            variant="outline-success"
                            @click="restoreUser(user)"
                          >
                            {{ $t('adminUsers.restore') }}
                          </b-button>
                        </div>
                      </b-card-body>
                    </b-card>
                  </b-col>
                </b-row>
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
                <b-row v-if="filteredMediators.length > 0">
                  <b-col md="6" v-for="user in filteredMediators" :key="user.userId" class="mb-3">
                    <b-card class="h-100 user-card">
                      <b-card-body class="d-flex flex-column">
                        <div class="d-flex align-items-center mb-3">
                          <img
                            v-if="user.profile_image || user.profile_picture_url"
                            :src="user.profile_image || user.profile_picture_url"
                            class="rounded-circle me-3"
                            width="48"
                            height="48"
                            alt=""
                          />
                          <div>
                            <h5 class="mb-1">{{ user.name || $t('adminUsers.na') }}</h5>
                            <p class="mb-0 text-muted small">{{ user.email || $t('adminUsers.na') }}</p>
                          </div>
                        </div>
                        <div class="mb-3">
                          <b-badge variant="info" class="me-1">{{ roleLabel(user) }}</b-badge>
                          <b-badge :variant="statusVariant(user)">{{ statusLabel(user) }}</b-badge>
                        </div>
                        <div class="mt-auto d-flex flex-wrap justify-content-end">
                          <b-button variant="outline-primary" size="sm" class="me-1 mb-1" @click="openModal(user)">{{ $t('adminUsers.view') }}</b-button>
                          <b-button size="sm" class="me-1 mb-1" variant="outline-info" @click="openMediator360(user)">360°</b-button>
                          <b-button
                            v-if="!user.is_deleted"
                            size="sm"
                            class="mb-1"
                            variant="outline-danger"
                            @click="deleteMediator(user)"
                          >
                            {{ $t('adminUsers.remove') }}
                          </b-button>
                          <b-button
                            v-else
                            size="sm"
                            class="mb-1"
                            variant="outline-success"
                            @click="restoreUser(user)"
                          >
                            {{ $t('adminUsers.restore') }}
                          </b-button>
                        </div>
                      </b-card-body>
                    </b-card>
                  </b-col>
                </b-row>
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
    <b-modal v-model="modalVisible" size="xl" :title="$t('adminUsers.userDetails')" no-footer @hidden="cancelEdit">
      <div v-if="selectedUser" class="user-modal-layout">
        <div class="user-modal-main">
          <kadr-section-card v-if="!editMode" :title="$t('adminUsers.profileSectionTitle')" icon="ri-user-line">
            <div class="quick-info-grid">
              <div class="info-card">
                <label>{{ $t('adminUsers.colName') }}</label>
                <strong>{{ selectedUser.name || $t('adminUsers.na') }}</strong>
              </div>
              <div class="info-card">
                <label>{{ $t('adminUsers.colEmail') }}</label>
                <strong>{{ selectedUser.email || $t('adminUsers.na') }}</strong>
              </div>
              <template v-for="(value, key) in filteredItem(selectedUser)" :key="key">
                <div v-if="!isURL(value)" class="info-card">
                  <label>{{ formatKey(key) }}</label>
                  <strong v-if="key === 'preferred_languages' || key === 'preferred_language'">{{ getFullLanguages(value) }}</strong>
                  <strong v-else-if="isArrayValue(value)">{{ convertToCommaSeparated(value) }}</strong>
                  <strong v-else>{{ capitalizeWord(value) }}</strong>
                </div>
              </template>
            </div>
          </kadr-section-card>

          <kadr-section-card v-else :title="$t('adminUsers.editUserDetails')" icon="ri-edit-line">
            <b-row>
              <b-col md="6" class="mb-3">
                <kadr-form-field :label="$t('adminUsers.colName')" id="editUserName">
                  <template v-slot="{ id }">
                    <b-form-input :id="id" v-model="editForm.name" />
                  </template>
                </kadr-form-field>
              </b-col>
              <b-col md="6" class="mb-3">
                <kadr-form-field
                  :label="$t('adminUsers.colEmail')"
                  id="editUserEmail"
                  :hint="editErrors.email ? '' : $t('adminUsers.emailChangeWarning')"
                  :error="editErrors.email"
                >
                  <template v-slot="{ id }">
                    <b-form-input :id="id" v-model="editForm.email" type="email" @input="editErrors.email = ''" />
                  </template>
                </kadr-form-field>
              </b-col>
              <b-col md="6" class="mb-3">
                <kadr-form-field
                  :label="$t('common.phone')"
                  id="editUserPhone"
                  :hint="editErrors.phone_number ? '' : $t('profileEdit.phoneHint')"
                  :error="editErrors.phone_number"
                >
                  <template v-slot="{ id }">
                    <b-form-input :id="id" v-model="editForm.phone_number" maxlength="10" @input="onEditPhoneInput" />
                  </template>
                </kadr-form-field>
              </b-col>
              <b-col md="6" class="mb-3">
                <kadr-form-field :label="$t('auth.signup.cityLabel')" id="editUserCity">
                  <template v-slot="{ id }">
                    <b-form-input :id="id" v-model="editForm.city" />
                  </template>
                </kadr-form-field>
              </b-col>
              <b-col md="6" class="mb-3">
                <kadr-form-field :label="$t('auth.signup.stateLabel')" id="editUserState">
                  <template v-slot="{ id }">
                    <b-form-input :id="id" v-model="editForm.state" />
                  </template>
                </kadr-form-field>
              </b-col>
              <b-col md="6" class="mb-3">
                <kadr-form-field :label="$t('auth.signup.pincodeLabel')" id="editUserPincode">
                  <template v-slot="{ id }">
                    <b-form-input :id="id" v-model="editForm.pincode" maxlength="6" />
                  </template>
                </kadr-form-field>
              </b-col>
              <template v-if="selectedUser.user_type === 'MEDIATOR'">
                <b-col md="6" class="mb-3">
                  <kadr-form-field :label="$t('mediatorSignup.collegeName')" id="editUserLlbCollege">
                    <template v-slot="{ id }">
                      <b-form-input :id="id" v-model="editForm.llb_college" />
                    </template>
                  </kadr-form-field>
                </b-col>
                <b-col md="6" class="mb-3">
                  <kadr-form-field :label="$t('mediatorSignup.university')" id="editUserLlbUniversity">
                    <template v-slot="{ id }">
                      <b-form-input :id="id" v-model="editForm.llb_university" />
                    </template>
                  </kadr-form-field>
                </b-col>
                <b-col md="6" class="mb-3">
                  <kadr-form-field :label="$t('adminUsers.llbYear')" id="editUserLlbYear">
                    <template v-slot="{ id }">
                      <b-form-input :id="id" v-model="editForm.llb_year" type="number" />
                    </template>
                  </kadr-form-field>
                </b-col>
                <b-col md="6" class="mb-3">
                  <kadr-form-field :label="$t('adminUsers.mediatorCourseYear')" id="editUserCourseYear">
                    <template v-slot="{ id }">
                      <b-form-input :id="id" v-model="editForm.mediator_course_year" type="number" />
                    </template>
                  </kadr-form-field>
                </b-col>
                <b-col md="12" class="mb-3">
                  <kadr-form-field :label="$t('mediatorSignup.barEnrollmentNumber')" id="editUserBarNo">
                    <template v-slot="{ id }">
                      <b-form-input :id="id" v-model="editForm.bar_enrollment_no" />
                    </template>
                  </kadr-form-field>
                </b-col>
              </template>
            </b-row>
          </kadr-section-card>

          <kadr-section-card v-if="!editMode && certificateFields.length" :title="$t('adminUsers.documents')" icon="ri-file-list-3-line">
            <div class="docs-grid">
              <FilePreview
                v-for="(doc, index) in certificateFields"
                :key="doc.value"
                :url="doc.value"
                :name="formatKey(doc.key)"
              />
            </div>
          </kadr-section-card>

          <kadr-section-card v-if="!editMode && selectedUser.cases && selectedUser.cases.length > 0" :title="$t('adminUsers.cases')" icon="ri-briefcase-4-line">
            <div class="admin-case-list">
              <div v-for="(caseItem, index) in selectedUser.cases" :key="index" class="party-card admin-case-card">
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
                      <span class="status-chip" :class="caseItem.firstPartyRep.active ? 'success' : 'warning'">
                        {{ caseItem.firstPartyRep.active ? $t('adminUsers.repActive') : $t('adminUsers.repPending') }}
                      </span>
                    </p>
                    <p class="mb-1">{{ caseItem.firstPartyRep.email }}</p>
                    <p v-if="caseItem.firstPartyRep.phone_number" class="mb-2">{{ caseItem.firstPartyRep.phone_number }}</p>
                  </template>
                  <template v-if="caseItem.secondPartyRep">
                    <p class="mb-1 small text-muted">{{ $t('adminUsers.respondentRep') }}</p>
                    <p class="mb-1">{{ caseItem.secondPartyRep.name || $t('adminUsers.na') }}
                      <span class="status-chip" :class="caseItem.secondPartyRep.active ? 'success' : 'warning'">
                        {{ caseItem.secondPartyRep.active ? $t('adminUsers.repActive') : $t('adminUsers.repPending') }}
                      </span>
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
            </div>
          </kadr-section-card>
        </div>

        <div class="user-modal-side">
          <div class="section-card user-modal-profile-card">
            <img
              :src="selectedUser.profile_image || selectedUser.profile_picture_url || defaultAvatar"
              class="user-modal-avatar"
              alt="Profile"
            />
            <h5 class="user-modal-name">{{ selectedUser.name || $t('adminUsers.na') }}</h5>
            <p class="user-modal-email">{{ selectedUser.email || $t('adminUsers.na') }}</p>
            <div class="user-modal-chips">
              <span class="status-chip secondary">{{ roleLabel(selectedUser) }}</span>
              <span class="status-chip" :class="statusVariant(selectedUser)">{{ statusLabel(selectedUser) }}</span>
            </div>
          </div>
        </div>
      </div>

      <div v-if="selectedUser" class="d-flex justify-content-end mt-3">
        <template v-if="editMode">
          <b-button variant="secondary" class="me-2" :disabled="savingEdit" @click="cancelEdit">{{ $t('common.cancel') }}</b-button>
          <b-button variant="primary" :disabled="savingEdit" @click="saveEdit">{{ $t('common.save') }}</b-button>
        </template>
        <template v-else>
          <b-button
            v-if="selectedUser.user_type === 'CLIENT' || selectedUser.user_type === 'MEDIATOR'"
            variant="outline-primary"
            class="me-2"
            @click="startEdit"
          >{{ $t('adminUsers.edit') }}</b-button>
          <b-button variant="secondary" @click="modalVisible = false">{{ $t('common.close') }}</b-button>
        </template>
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
import KadrFormField from '../../components/kadr/KadrFormField.vue'
import KadrSectionCard from '../../components/kadr/KadrSectionCard.vue'
import { isValidPhoneNumber, sanitizeDigits } from '../../utils/phoneValidation'
import defaultAvatar from '../../assets/images/default_avatar.jpeg'

const EDITABLE_USER_FIELDS = ['name', 'email', 'phone_number', 'city', 'state', 'pincode']
const EDITABLE_MEDIATOR_FIELDS = ['llb_college', 'llb_university', 'llb_year', 'mediator_course_year', 'bar_enrollment_no']

export default {
  name: 'UserList',
  components: {
    FilePreview,
    AdminMediatorOffboardingModal,
    KadrPageHeader,
    KadrEmptyState,
    KadrFormField,
    KadrSectionCard
  },
  mounted () {
    sofbox.index()
    // Only the very first load shows the full-page spinner — fetchActiveUsers
    // is reused for pagination/filter-toggle/post-edit refresh too, where
    // hiding the whole tabs UI again would be jarring, not helpful.
    Promise.all([this.fetchActiveUsers(1), this.fetchLanguages()]).finally(() => {
      this.loading = false
    })
  },
  data () {
    return {
      loading: true,
      defaultAvatar,
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
      editMode: false,
      editForm: {},
      editErrors: { email: '', phone_number: '' },
      savingEdit: false,
      languages: {},
      offboardingVisible: false,
      offboardingMediatorId: ''
    }
  },
  computed: {
    filteredClients () {
      return this.filterUsers(this.activeClientsData.users)
    },
    filteredMediators () {
      return this.filterUsers(this.activeMediatorsData.users)
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
    filterUsers (users) {
      const query = this.tableFilter.trim().toLowerCase()
      if (!query) return users
      return users.filter((user) =>
        (user.name || '').toLowerCase().includes(query) ||
        (user.email || '').toLowerCase().includes(query)
      )
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
    startEdit () {
      const fields = [...EDITABLE_USER_FIELDS, ...(this.selectedUser.user_type === 'MEDIATOR' ? EDITABLE_MEDIATOR_FIELDS : [])]
      this.editForm = fields.reduce((form, key) => {
        form[key] = this.selectedUser[key] ?? ''
        return form
      }, {})
      this.editErrors = { email: '', phone_number: '' }
      this.editMode = true
    },
    cancelEdit () {
      this.editMode = false
      this.editForm = {}
      this.editErrors = { email: '', phone_number: '' }
    },
    onEditPhoneInput (value) {
      this.editForm.phone_number = sanitizeDigits(value)
      this.editErrors.phone_number = ''
    },
    updateRowInTables (updatedUser) {
      const applyTo = (list) => {
        const idx = (list || []).findIndex((u) => u.userId === updatedUser.userId)
        if (idx !== -1) list.splice(idx, 1, { ...list[idx], ...updatedUser })
      }
      applyTo(this.activeClientsData.users)
      applyTo(this.activeMediatorsData.users)
    },
    async saveEdit () {
      this.editErrors = { email: '', phone_number: '' }
      if (!this.editForm.name) {
        this.$store.dispatch('alert/showAlert', { message: this.$t('adminUsers.editNameRequired'), type: 'danger' })
        return
      }
      if (this.editForm.phone_number && !isValidPhoneNumber(this.editForm.phone_number)) {
        this.editErrors.phone_number = this.$t('profileEdit.phoneInvalid')
        return
      }
      this.savingEdit = true
      try {
        const payload = { userId: this.selectedUser.userId, ...this.editForm }
        const response = await this.$store.dispatch('adminUpdateUserProfile', payload)
        if (response.success) {
          const updated = { ...this.selectedUser, ...response.data.user, userId: this.selectedUser.userId }
          this.selectedUser = updated
          this.updateRowInTables(updated)
          this.editMode = false
        }
      } finally {
        this.savingEdit = false
      }
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
.admin-users-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 40vh;
}
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

.user-card {
  background-color: var(--kadr-surface-info);
  border: 1px solid var(--kadr-border);
}

.rounded-circle {
  object-fit: cover;
}

.user-modal-layout {
  display: grid;
  grid-template-columns: 1.4fr 0.7fr;
  gap: 1rem;
}

.user-modal-main {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-width: 0;
}

.user-modal-side {
  position: sticky;
  top: 1rem;
  align-self: flex-start;
}

.user-modal-profile-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 1.25rem 1rem;
}

.user-modal-avatar {
  width: 96px;
  height: 96px;
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid var(--kadr-border-info);
  margin-bottom: 0.75rem;
}

.user-modal-name {
  margin: 0 0 0.15rem;
}

.user-modal-email {
  margin: 0 0 0.75rem;
  font-size: 0.85rem;
  color: var(--kadr-text-muted);
  word-break: break-all;
}

.user-modal-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  justify-content: center;
}

.admin-case-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 0.5rem;
}

.admin-case-card {
  display: block;
}

@media (max-width: 991px) {
  .user-modal-layout {
    grid-template-columns: 1fr;
  }

  .user-modal-side {
    position: static;
  }
}
</style>
