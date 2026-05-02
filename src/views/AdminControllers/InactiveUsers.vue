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
                  <img v-if="user.profile_picture_url" :src="user.profile_picture_url" class="rounded-circle mr-3" width="50" height="50" alt="Profile" />
                  <div>
                    <h5 class="mb-1">{{ user.name || 'N/A' }}</h5>
                    <p class="mb-1 text-muted">{{ user.email || 'N/A' }}</p>
                  </div>
                </div>
                <p v-if="type === 'MEDIATOR'" class="mb-2"><strong>Preferred Area:</strong> {{ convertToCommaSeparated(user.preferred_area_of_practice) }}</p>
                <p class="mb-2"><strong>State:</strong> {{ user.state || 'N/A' }}</p>
                <p class="mb-2"><strong>Created:</strong> {{ formatDate(user.created_at) }}</p>
                <p v-if="user.preferred_languages" class="mb-3"><strong>Language:</strong> {{ getFullLanguages(user.preferred_languages) }}</p>
                <div v-if="type === 'CLIENT'" class="mb-3">
                  <label class="small"><strong>Case Type:</strong></label>
                  <b-form-select v-model="user.case_type" :options="categoryOptions" size="sm" :disabled="user.approved"></b-form-select>
                </div>
                <div class="mt-auto d-flex justify-content-between">
                  <b-button variant="outline-primary" size="sm" @click="openModal(user)">View Details</b-button>
                  <b-button variant="success" size="sm" @click="approve(user)" :disabled="user.approved || (type === 'CLIENT' && !user.case_type)">Approve</b-button>
                </div>
              </b-card-body>
            </b-card>
          </b-col>
        </b-row>
        <section v-else class="empty-state">
          <i class="fas fa-folder-open fa-3x"></i>
          <h4>No record pending</h4>
          <p>There are currently no items awaiting your approval. Please check back later.</p>
        </section>
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

    <b-modal v-model="modalVisible" size="lg" title="User Details" hide-footer>
      <div v-if="selectedUser">
        <b-row>
          <b-col :md="selectedUser.profile_picture_url ? 9 : 12">
            <h4>{{ selectedUser.name || 'N/A' }}</h4>
            <p><strong>Email:</strong> {{ selectedUser.email || 'N/A' }}</p>
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
                <p class="mb-2"><strong>Case ID:</strong> {{ caseItem.caseId || 'N/A' }}</p>
                <p class="mb-2"><strong>Complaint Category:</strong> {{ caseItem.category || 'N/A' }}</p>
                <p class="mb-2"><strong>Dispute Description:</strong> {{ caseItem.description || 'N/A' }}</p>
                <template v-if="caseItem.secondParty">
                  <p class="mb-2"><strong>Opposite Party Name:</strong> {{ caseItem.secondParty.name || 'N/A' }}</p>
                  <p class="mb-2"><strong>Opposite Party Email:</strong> {{ caseItem.secondParty.email || 'N/A' }}</p>
                  <p class="mb-2"><strong>Opposite Party Phone:</strong> {{ caseItem.secondParty.phone_number || 'N/A' }}</p>
                </template>
                <div v-if="caseItem.evidence_document_url">
                  <p class="mb-2"><strong>Attachments:</strong></p>
                  <div class="docs-grid mt-2">
                    <FilePreview
                      :url="caseItem.evidence_document_url"
                      name="Evidence Document"
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
          <p class="mb-2"><strong>Attachments:</strong></p>
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
          <b-button variant="secondary" @click="modalVisible = false">Close</b-button>
        </div>
      </div>
    </b-modal>
  </div>
</template>
<script>
import { sofbox } from '../../config/pluginInit'
import Alert from '../../components/sofbox/alert/Alert.vue'
import FilePreview from '../core/DocumentPreview.vue'

export default {
  name: 'InactiveUsers',
  components: {
    Alert,
    FilePreview
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
      const date = new Date(dateString)
      return date.toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: true
      })
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
        this.showAlert('Please select Case Type', 'danger')
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
        this.$set(item, 'approved', true)
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
      console.log(code)
      console.log(this.languages)
      console.log(this.languages[code])
      return this.languages[code] || code
    },
    getFullLanguages (value) {
      if (!value) return ''
      try {
        const codes = this.isArrayValue(value) ? JSON.parse(value) : value.split(',')
        console.log(codes)
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
      categoryOptions: [
        { value: null, text: 'Please select type' },
        { value: 'Mediation', text: 'Mediation' },
        { value: 'Arbitrator', text: 'Arbitrator' },
        { value: 'Counsellor', text: 'Counsellor' }
      ],
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
  border: 2px solid #e9ecef;
}

.empty-state {
  background: #fff;
  border: 1px dashed #d7deef;
  border-radius: 12px;
  padding: 2rem 1rem;
  text-align: center;
  color: #5f6988;
}

.empty-state i {
  color: #a3acc7;
  margin-bottom: 0.7rem;
}

.certificate-card:hover {
  border-color: #007bff;
  box-shadow: 0 4px 12px rgba(0,123,255,0.15);
  transform: translateY(-2px);
}

.certificate-icon {
  color: #007bff;
}

.rounded-circle {
  object-fit: cover;
}

.text-muted {
  color: #6c757d !important;
}
</style>
