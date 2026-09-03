<template>
  <div>
    <b-row>
      <Alert :message="alert.message" :type="alert.type" v-model="alert.visible" :timeout="alert.timeout"></Alert>
      <b-col md="12">
        <b-row v-if="paginatedData.total > 0">
          <b-col md="6" v-for="user in paginatedData.users" :key="user.userId" class="mb-3">
            <b-card class="h-100 user-card">
              <b-card-body class="d-flex flex-column">
                <div class="d-flex align-items-center mb-3">
                  <img v-if="user.profile_picture_url" :src="user.profile_picture_url" class="rounded-circle me-3" width="50" height="50" alt="Profile" />
                  <div>
                    <h5 class="mb-1">{{ user.name || $t('adminInactiveUsers.na') }}</h5>
                    <p class="mb-1 text-muted">{{ user.email || $t('adminInactiveUsers.na') }}</p>
                  </div>
                </div>
                <p v-if="type === 'MEDIATOR'" class="mb-2"><strong>{{ $t('adminInactiveUsers.preferredArea') }}:</strong> {{ convertToCommaSeparated(user.preferred_area_of_practice) }}</p>
                <p class="mb-2"><strong>{{ $t('adminInactiveUsers.state') }}:</strong> {{ user.state || $t('adminInactiveUsers.na') }}</p>
                <p class="mb-2"><strong>{{ $t('adminInactiveUsers.created') }}:</strong> {{ formatDate(user.created_at) }}</p>
                <p v-if="user.preferred_languages" class="mb-3"><strong>{{ $t('adminInactiveUsers.language') }}:</strong> {{ getFullLanguages(user.preferred_languages) }}</p>
                <div v-if="type === 'CLIENT'" class="mb-3">
                  <label class="small"><strong>{{ $t('adminInactiveUsers.caseType') }}:</strong></label>
                  <b-form-select v-model="user.case_type" :options="categoryOptions" size="sm" :disabled="user.approved"></b-form-select>
                </div>
                <div class="mt-auto d-flex justify-content-between">
                  <b-button variant="outline-primary" size="sm" @click="openModal(user)">{{ $t('adminInactiveUsers.viewDetails') }}</b-button>
                  <b-button variant="success" size="sm" @click="approve(user)" :disabled="user.approved || (type === 'CLIENT' && !user.case_type)">{{ $t('adminInactiveUsers.approve') }}</b-button>
                </div>
              </b-card-body>
            </b-card>
          </b-col>
        </b-row>
        <kadr-empty-state
          v-else
          icon="fas fa-folder-open"
          :title="$t('adminInactiveUsers.noPending')"
          :description="$t('adminInactiveUsers.noPendingDescription')"
        />
        <b-pagination
          v-if="paginatedData.total > 0"
          v-model="currentPage"
          :total-rows="paginatedData.total"
          :per-page="perPage"
          align="center"
          class="mt-3"
          @input="fetchUsers"
        />
      </b-col>
    </b-row>

    <b-modal v-model="modalVisible" size="lg" :title="$t('adminInactiveUsers.userDetails')" no-footer>
      <div v-if="selectedUser">
        <b-row>
          <b-col :md="selectedUser.profile_picture_url ? 9 : 12">
            <h4>{{ selectedUser.name || $t('adminInactiveUsers.na') }}</h4>
            <p><strong>{{ $t('adminInactiveUsers.email') }}:</strong> {{ selectedUser.email || $t('adminInactiveUsers.na') }}</p>
            <div v-for="(value, key) in filteredItem(selectedUser)" :key="key" class="mb-2">
              <strong v-if="!isURL(value)">{{ formatKey(key) }}:</strong>
              <span v-if="isURL(value)">
              </span>
              <span v-else-if="key === 'preferred_languages'">
                {{ getFullLanguages(value) }}
              </span>
              <span v-else-if="isArrayValue(value)">
                {{ convertToCommaSeparated(value) }}
              </span>
              <span v-else>
                {{ capitalizeWord(value) }}
              </span>
            </div>
            <template v-if="type === 'CLIENT' && selectedUser.cases.length">
              <div v-for="(caseItem, index) in selectedUser.cases" :key="index">
                <p class="mb-2"><strong>{{ $t('adminInactiveUsers.caseId') }}:</strong> {{ caseItem.caseId || $t('adminInactiveUsers.na') }}</p>
                <p class="mb-2"><strong>{{ $t('adminInactiveUsers.complaintCategory') }}:</strong> {{ caseItem.category || $t('adminInactiveUsers.na') }}</p>
                <p class="mb-2"><strong>{{ $t('adminInactiveUsers.disputeDescription') }}:</strong> {{ caseItem.description || $t('adminInactiveUsers.na') }}</p>
                <template v-if="caseItem.secondParty">
                  <p class="mb-2"><strong>{{ $t('adminInactiveUsers.oppositePartyName') }}:</strong> {{ caseItem.secondParty.name || $t('adminInactiveUsers.na') }}</p>
                  <p class="mb-2"><strong>{{ $t('adminInactiveUsers.oppositePartyEmail') }}:</strong> {{ caseItem.secondParty.email || $t('adminInactiveUsers.na') }}</p>
                  <p class="mb-2"><strong>{{ $t('adminInactiveUsers.oppositePartyPhone') }}:</strong> {{ caseItem.secondParty.phone_number || $t('adminInactiveUsers.na') }}</p>
                </template>
                <div v-if="caseItem.evidence_document_url">
                  <p class="mb-2"><strong>{{ $t('adminInactiveUsers.attachments') }}:</strong></p>
                  <div class="docs-grid mt-2">
                    <FilePreview
                      :url="caseItem.evidence_document_url"
                      :name="$t('adminInactiveUsers.evidenceDocument')"
                    />
                  </div>
                </div>
              </div>
            </template>
          </b-col>
          <b-col md="3" v-if="selectedUser.profile_picture_url">
            <img :src="selectedUser.profile_picture_url" class="img-fluid mb-3 avatar-120 rounded-circle" alt="Profile" />
          </b-col>
        </b-row>
        <div v-if="certificateFields.length > 0" class="mt-4">
          <p class="mb-2"><strong>{{ $t('adminInactiveUsers.attachments') }}:</strong></p>
          <div v-if="certificateFields.length" class="docs-grid">
               <FilePreview
                  v-for="(field, index) in certificateFields"
                  :key="index"
                  :url="field.value"
                  :name="formatKey(field.key)"
                />
          </div>
        </div>
        <div class="d-flex justify-content-end mt-3">
          <b-button variant="secondary" @click="modalVisible = false">{{ $t('adminInactiveUsers.close') }}</b-button>
        </div>
      </div>
    </b-modal>
  </div>
</template>
<script>
import { sofbox } from '../../config/pluginInit'
import Alert from '../../components/sofbox/alert/Alert.vue'
import FilePreview from '../../components/DocumentPreview.vue'
import KadrEmptyState from '../../components/kadr/KadrEmptyState.vue'

export default {
  name: 'InactiveUsers',
  components: {
    Alert,
    FilePreview,
    KadrEmptyState
  },
  props: {
    users: {
      type: Object,
      required: true
    },
    type: {
      type: String,
      required: true
    }
  },
  mounted () {
    sofbox.index()
    this.syncWithProp()
    this.usersCache[1] = this.users
    this.fetchLanguages()
  },
  watch: {
    users: {
      immediate: true,
      handler () {
        this.syncWithProp()
      }
    }
  },
  computed: {
    categoryOptions () {
      return [
        { value: null, text: this.$t('adminInactiveUsers.selectType') },
        { value: 'Mediation', text: 'Mediation' },
        { value: 'Arbitrator', text: 'Arbitrator' },
        { value: 'Counsellor', text: 'Counsellor' }
      ]
    },
    paginatedItems () {
      const start = (this.currentPage - 1) * this.perPage
      return this.paginatedData.users.slice(start, start + this.perPage)
    },
    certificateFields () {
      if (!this.selectedUser) return []
      return Object.entries(this.selectedUser)
        .filter(([key, value]) => ['certificate', 'document'].some(certKey => key.toLowerCase().includes(certKey)) && value && this.isURL(value))
        .map(([key, value]) => ({ key, value }))
    },
    clientCases () {
      if (!this.selectedUser || !this.selectedUser.cases) return []
      if (Array.isArray(this.selectedUser.cases)) return this.selectedUser.cases
      try {
        const parsed = JSON.parse(this.selectedUser.cases)
        return Array.isArray(parsed) ? parsed : []
      } catch (e) {
        return []
      }
    }
  },
  methods: {
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
    showAlert (message, type) {
      this.alert = {
        message,
        type,
        visible: true
      }
    },
    formatDate (dateString) {
      return this.$formatDateTime(dateString)
    },
    formatKey (key) {
      if (typeof key !== 'string') return key
      return key
        .replace(/_/g, ' ')
        .replace('url', '')
        .replace(/\b\w/g, (char) => char.toUpperCase())
    },
    isURL (value) {
      const urlPattern = /^(https?:\/\/[^\s$.?#].[^\s]*)$/i
      return urlPattern.test(value)
    },
    filteredItem (item) {
      const irrelevantKeys = ['name', 'email', 'cases', '_showDetails', 'user_type', 'case_type', 'userId', 'created_at', 'active', 'otherPartyUserId', 'caseId', 'updated_at', 'is_self_signed_up', 'approved']
      return Object.fromEntries(
        Object.entries(item).filter(([key, value]) => !irrelevantKeys.includes(key) && value !== null && value !== 0)
      )
    },
    syncWithProp () {
      this.paginatedData = { ...this.users }
    },
    async approve (item) {
      if (this.type === 'CLIENT' && !item.case_type) {
        this.showAlert(this.$t('adminInactiveUsers.selectCaseTypeAlert'), 'danger')
        return
      }
      const response = await this.$store.dispatch('updateInactiveUsers', {
        isActive: true,
        caseId: item.cases && item.cases[0] ? item.cases[0].id : null,
        userId: item.userId,
        caseType: item.case_type
      })
      if (response.success) {
        this.showAlert(response.message, 'success')
        item.approved = true
        if (this.modalVisible && this.selectedUser === item) {
          this.modalVisible = false
        }
      }
    },
    async fetchUsers (newPage) {
      this.currentPage = newPage
      if (this.usersCache[this.currentPage]) {
        this.paginatedData = this.usersCache[this.currentPage]
        return
      }
      const response = await this.$store.dispatch('getInactiveUsers', {
        page: this.currentPage,
        type: this.type
      })
      this.usersCache[this.currentPage] = response.inactiveUsers
      this.paginatedData = response.inactiveUsers
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
  },
  data () {
    return {
      currentPage: 1,
      perPage: 10,
      paginatedData: {},
      usersCache: {},
      alert: {
        visible: false,
        message: '',
        timeout: 5000,
        type: 'primary'
      },
      loading: false,
      modalVisible: false,
      selectedUser: null,
      languages: {}
    }
  }
}
</script>
<style>
.docs-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 0.75rem;
  margin-top: 0.75rem;
}

.user-card {
  background-color: #fcfdff !important;
  border: 1px solid #dee2e6 !important;
}

.card {
  transition: transform 0.2s;
}

.card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
}

.certificate-card {
  transition: all 0.3s ease;
  border: 2px solid var(--kadr-border);
}

.certificate-card:hover {
  border-color: var(--kadr-primary);
  box-shadow: var(--kadr-shadow-md);
  transform: translateY(-2px);
}

.certificate-icon {
  color: var(--kadr-primary);
}

.rounded-circle {
  object-fit: cover;
}
</style>
