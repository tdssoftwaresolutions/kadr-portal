<template>
  <b-container fluid>
    <b-row>
      <b-col sm="12">
        <iq-card>
          <template v-slot:headerTitle>
            <h4 class="card-title">Clients & Experts</h4>
          </template>
          <template v-slot:body>
            <b-tabs card>
              <!-- Active Clients Tab -->
              <b-tab :title="'Clients ('+activeClientsData.total+')'"  active>
                <b-row v-if="activeClientsData.total > 0">
                  <b-col md="6" v-for="user in activeClientsData.users" :key="`client-${user.userId || user.email}`" class="mb-3">
                    <b-card class="h-100 user-card">
                      <b-card-body class="d-flex flex-column">
                        <div class="d-flex align-items-center mb-3">
                          <img v-if="user.profile_image || user.profile_picture_url" :src="user.profile_image || user.profile_picture_url" class="rounded-circle mr-3" width="50" height="50" alt="Profile" />
                          <div>
                            <h5 class="mb-1">{{ user.name || 'N/A' }}</h5>
                            <p class="mb-1 text-muted">{{ user.email || 'N/A' }}</p>
                          </div>
                        </div>
                        <p class="mb-2"><strong>Created:</strong> {{ formatDate(user.created_at) }}</p>
                        <p v-if="user.case_type" class="mb-2"><strong>Case Type:</strong> {{ capitalizeWord(user.case_type) }}</p>
                        <p v-if="user.preferred_languages || user.preferred_language" class="mb-3"><strong>Language:</strong> {{ getFullLanguages(user.preferred_languages || user.preferred_language) }}</p>
                        <div class="mt-auto text-right">
                          <b-button variant="outline-primary" size="sm" @click="openModal(user)">View Details</b-button>
                        </div>
                      </b-card-body>
                    </b-card>
                  </b-col>
                </b-row>
                <div v-else class="text-center py-4">
                  <h5>No clients found.</h5>
                </div>
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

              <!-- Active Mediators Tab -->
              <b-tab  :title="'Dispute Resolution Experts ('+activeMediatorsData.total+')'">
                <b-row v-if="activeMediatorsData.total > 0">
                  <b-col md="6" v-for="user in activeMediatorsData.users" :key="`mediator-${user.userId || user.email}`" class="mb-3">
                    <b-card class="h-100 user-card">
                      <b-card-body class="d-flex flex-column">
                        <div class="d-flex align-items-center mb-3">
                          <img v-if="user.profile_image || user.profile_picture_url" :src="user.profile_image || user.profile_picture_url" class="rounded-circle mr-3" width="50" height="50" alt="Profile" />
                          <div>
                            <h5 class="mb-1">{{ user.name || 'N/A' }}</h5>
                            <p class="mb-1 text-muted">{{ user.email || 'N/A' }}</p>
                          </div>
                        </div>
                        <p class="mb-2"><strong>Phone:</strong> {{ user.phone_number || 'N/A' }}</p>
                        <p class="mb-2"><strong>State:</strong> {{ user.state || 'N/A' }}</p>
                        <p class="mb-2"><strong>Preferred Area:</strong> {{ convertToCommaSeparated(user.preferred_area_of_practice) }}</p>
                        <p v-if="user.preferred_languages || user.preferred_language" class="mb-3"><strong>Language:</strong> {{ getFullLanguages(user.preferred_languages || user.preferred_language) }}</p>
                        <div class="mt-auto text-right">
                          <b-button variant="outline-primary" size="sm" @click="openModal(user)">View Details</b-button>
                        </div>
                      </b-card-body>
                    </b-card>
                  </b-col>
                </b-row>
                <div v-else class="text-center py-4">
                  <h5>No experts found.</h5>
                </div>
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
    <b-modal v-model="modalVisible" size="lg" title="User Details" hide-footer>
      <div v-if="selectedUser">
        <b-row>
          <b-col :md="selectedUser.profile_image || selectedUser.profile_picture_url ? 9 : 12">
            <h4>{{ selectedUser.name || 'N/A' }}</h4>
            <p><strong>Email:</strong> {{ selectedUser.email || 'N/A' }}</p>
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
          </b-col>
          <b-col md="3" v-if="selectedUser.profile_image || selectedUser.profile_picture_url">
            <img :src="selectedUser.profile_image || selectedUser.profile_picture_url" class="img-fluid rounded-circle mb-3" style="width: 120px; height: 120px; object-fit: cover;" alt="Profile" />
          </b-col>
        </b-row>
        <section v-if="certificateFields.length" >
          <strong>Documents</strong>
          <div class="docs-grid">
              <FilePreview
              v-for="(doc, index) in certificateFields"
              :key="doc.value"
              :url="doc.value"
              :name="formatKey(doc.key)"
            />
          </div>
        </section>
        <div class="d-flex justify-content-end mt-3">
          <b-button variant="secondary" @click="modalVisible = false">Close</b-button>
        </div>
      </div>
    </b-modal>
  </b-container>
</template>

<script>
import { sofbox } from '../../config/pluginInit'
import FilePreview from '../core/DocumentPreview.vue'

export default {
  name: 'UserList',
  components: {
    FilePreview
  },
  mounted () {
    sofbox.index()
    this.fetchActiveUsers(1) // Fetch both clients and mediators for page 1 on load
    this.fetchLanguages()
  },
  data () {
    return {
      activeClientsPage: 1,
      activeMediatorsPage: 1,
      perPage: 10,
      activeClientsData: { users: [], total: 0 },
      activeMediatorsData: { users: [], total: 0 },
      modalVisible: false,
      selectedUser: null,
      languages: {}
    }
  },
  computed: {
    certificateFields () {
      if (!this.selectedUser) return []
      return Object.entries(this.selectedUser)
        .filter(([key, value]) => ['certificate', 'document'].some(certKey => key.toLowerCase().includes(certKey)) && value && this.isURL(value))
        .map(([key, value]) => ({ key, value }))
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
      // alert(typeof str)
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
          // Fetch both clients and mediators for page 1 on load
          const [clientsResponse, mediatorsResponse] = await Promise.all([
            this.$store.dispatch('getActiveUsers', { page: 1, type: 'CLIENT' }),
            this.$store.dispatch('getActiveUsers', { page: 1, type: 'MEDIATOR' })
          ])

          if (clientsResponse.success) {
            this.activeClientsData = clientsResponse
          }

          if (mediatorsResponse.success) {
            this.activeMediatorsData = mediatorsResponse
          }
        } else {
          // Fetch data for a specific user type on pagination
          const response = await this.$store.dispatch('getActiveUsers', { page, type })
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
      return key.replace(/_/g, ' ').replace('url', '').replace(/\b\w/g, (char) => char.toUpperCase())
    },
    isURL (value) {
      const urlPattern = /^(https?:\/\/[^\s$.?#].[^\s]*)$/i
      return urlPattern.test(value)
    },
    filteredItem (item) {
      const irrelevantKeys = ['name', 'email', 'cases', '_showDetails', 'userId', 'created_at', 'active', 'otherPartyUserId', 'caseId', 'google_token', 'user_type', 'updated_at', 'is_self_signed_up', 'name', 'email', 'profile_image', 'profile_picture_url']
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

.section-card {
  border: 1px solid #ebeffa;
  border-radius: 12px;
  padding: 0.9rem;
}

.section-head h5 {
  margin: 0;
}

.section-head small {
  color: #6d7693;
}

.section-icon {
  font-size: 1rem;
  color: #d94430;
}

.docs-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 0.75rem;
  margin-top: 0.75rem;
}

.action-required-section .section-head h5,
.documents-section .section-head h5 {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

::v-deep .card-header {
  background-color: unset !important;
  border-bottom: unset !important;
}
.user-card {
  background-color: #fcfdff;
  border: 1px solid #dee2e6;
}

.certificate-card {
  transition: all 0.3s ease;
  border: 2px solid #e9ecef;
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
