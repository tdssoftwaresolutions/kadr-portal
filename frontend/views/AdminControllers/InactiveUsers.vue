<template>
  <div class="kadr-animate-in">
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

    <b-modal
      v-model="modalVisible"
      size="lg"
      centered
      scrollable
      no-header
      no-footer
      no-header-close
      body-class="p-0"
      dialog-class="review-modal"
    >
      <div v-if="selectedUser" class="review">
        <!-- Header -->
        <header class="review__header">
          <div class="review__identity">
            <div class="review__avatar">
              <img
                v-if="selectedUser.profile_picture_url"
                :src="selectedUser.profile_picture_url"
                alt="Profile"
              />
              <span v-else class="review__avatar-fallback">{{ initials(selectedUser.name) }}</span>
            </div>
            <div class="review__identity-text">
              <h2 class="review__name">{{ selectedUser.name || $t('adminInactiveUsers.na') }}</h2>
              <div class="review__meta">
                <span class="review__badge">{{ typeLabel }}</span>
                <span class="review__pending">
                  <i class="fas fa-clock" aria-hidden="true"></i>
                  {{ $t('adminInactiveUsers.pendingApproval') }}
                </span>
              </div>
            </div>
          </div>
          <button type="button" class="review__close" @click="modalVisible = false" :aria-label="$t('adminInactiveUsers.close')">
            <i class="fas fa-times" aria-hidden="true"></i>
          </button>
        </header>

        <!-- Body -->
        <div class="review__body">
          <!-- Contact -->
          <section class="review__section">
            <h3 class="review__section-title">{{ $t('adminInactiveUsers.sectionContact') }}</h3>
            <dl class="review__facts">
              <div class="review__fact">
                <dt>{{ $t('adminInactiveUsers.email') }}</dt>
                <dd>
                  <a v-if="selectedUser.email" :href="`mailto:${selectedUser.email}`">{{ selectedUser.email }}</a>
                  <span v-else>{{ $t('adminInactiveUsers.na') }}</span>
                </dd>
              </div>
              <div class="review__fact">
                <dt>{{ $t('adminInactiveUsers.state') }}</dt>
                <dd>{{ selectedUser.state || $t('adminInactiveUsers.na') }}</dd>
              </div>
              <div v-if="selectedUser.preferred_languages" class="review__fact">
                <dt>{{ $t('adminInactiveUsers.language') }}</dt>
                <dd>{{ getFullLanguages(selectedUser.preferred_languages) || $t('adminInactiveUsers.na') }}</dd>
              </div>
              <div class="review__fact">
                <dt>{{ $t('adminInactiveUsers.created') }}</dt>
                <dd>{{ formatDate(selectedUser.created_at) }}</dd>
              </div>
            </dl>
          </section>

          <!-- Additional details -->
          <section class="review__section">
            <h3 class="review__section-title">{{ $t('adminInactiveUsers.sectionAdditional') }}</h3>
            <dl v-if="additionalFacts.length" class="review__facts">
              <div v-for="fact in additionalFacts" :key="fact.key" class="review__fact">
                <dt>{{ fact.label }}</dt>
                <dd>{{ fact.value }}</dd>
              </div>
            </dl>
            <p v-else class="review__empty">{{ $t('adminInactiveUsers.noAdditionalDetails') }}</p>
          </section>

          <!-- Case details (clients) -->
          <template v-if="type === 'CLIENT' && selectedUser.cases && selectedUser.cases.length">
            <section
              v-for="(caseItem, index) in selectedUser.cases"
              :key="index"
              class="review__section"
            >
              <h3 class="review__section-title">
                {{ $t('adminInactiveUsers.sectionCase') }}
                <span v-if="selectedUser.cases.length > 1" class="review__section-count">
                  {{ $t('adminInactiveUsers.sectionCaseCount', { index: index + 1, total: selectedUser.cases.length }) }}
                </span>
              </h3>
              <dl class="review__facts">
                <div class="review__fact">
                  <dt>{{ $t('adminInactiveUsers.caseId') }}</dt>
                  <dd>{{ caseItem.caseId || $t('adminInactiveUsers.na') }}</dd>
                </div>
                <div class="review__fact">
                  <dt>{{ $t('adminInactiveUsers.complaintCategory') }}</dt>
                  <dd>{{ caseItem.category || $t('adminInactiveUsers.na') }}</dd>
                </div>
              </dl>
              <div class="review__note">
                <span class="review__note-label">{{ $t('adminInactiveUsers.disputeDescription') }}</span>
                <p class="review__note-text">{{ caseItem.description || $t('adminInactiveUsers.na') }}</p>
              </div>

              <template v-if="caseItem.secondParty">
                <h4 class="review__subheading">{{ $t('adminInactiveUsers.sectionOppositeParty') }}</h4>
                <dl class="review__facts">
                  <div class="review__fact">
                    <dt>{{ $t('adminInactiveUsers.oppositePartyName') }}</dt>
                    <dd>{{ caseItem.secondParty.name || $t('adminInactiveUsers.na') }}</dd>
                  </div>
                  <div class="review__fact">
                    <dt>{{ $t('adminInactiveUsers.oppositePartyEmail') }}</dt>
                    <dd>{{ caseItem.secondParty.email || $t('adminInactiveUsers.na') }}</dd>
                  </div>
                  <div class="review__fact">
                    <dt>{{ $t('adminInactiveUsers.oppositePartyPhone') }}</dt>
                    <dd>{{ caseItem.secondParty.phone_number || $t('adminInactiveUsers.na') }}</dd>
                  </div>
                </dl>
              </template>

              <template v-if="caseItem.firstPartyRep || caseItem.secondPartyRep">
                <h4 class="review__subheading">{{ $t('adminInactiveUsers.sectionRepresentatives') }}</h4>
                <dl class="review__facts">
                  <template v-if="caseItem.firstPartyRep">
                    <div class="review__fact">
                      <dt>{{ $t('adminInactiveUsers.firstPartyRepName') }}</dt>
                      <dd>
                        {{ caseItem.firstPartyRep.name || $t('adminInactiveUsers.na') }}
                        <b-badge :variant="caseItem.firstPartyRep.active ? 'success' : 'warning'" class="ms-1">
                          {{ caseItem.firstPartyRep.active ? $t('adminInactiveUsers.repActive') : $t('adminInactiveUsers.repPending') }}
                        </b-badge>
                      </dd>
                    </div>
                    <div class="review__fact">
                      <dt>{{ $t('adminInactiveUsers.firstPartyRepEmail') }}</dt>
                      <dd>{{ caseItem.firstPartyRep.email || $t('adminInactiveUsers.na') }}</dd>
                    </div>
                    <div v-if="caseItem.firstPartyRep.phone_number" class="review__fact">
                      <dt>{{ $t('adminInactiveUsers.firstPartyRepPhone') }}</dt>
                      <dd>{{ caseItem.firstPartyRep.phone_number }}</dd>
                    </div>
                  </template>
                  <template v-if="caseItem.secondPartyRep">
                    <div class="review__fact">
                      <dt>{{ $t('adminInactiveUsers.secondPartyRepName') }}</dt>
                      <dd>
                        {{ caseItem.secondPartyRep.name || $t('adminInactiveUsers.na') }}
                        <b-badge :variant="caseItem.secondPartyRep.active ? 'success' : 'warning'" class="ms-1">
                          {{ caseItem.secondPartyRep.active ? $t('adminInactiveUsers.repActive') : $t('adminInactiveUsers.repPending') }}
                        </b-badge>
                      </dd>
                    </div>
                    <div class="review__fact">
                      <dt>{{ $t('adminInactiveUsers.secondPartyRepEmail') }}</dt>
                      <dd>{{ caseItem.secondPartyRep.email || $t('adminInactiveUsers.na') }}</dd>
                    </div>
                    <div v-if="caseItem.secondPartyRep.phone_number" class="review__fact">
                      <dt>{{ $t('adminInactiveUsers.secondPartyRepPhone') }}</dt>
                      <dd>{{ caseItem.secondPartyRep.phone_number }}</dd>
                    </div>
                  </template>
                </dl>
              </template>

              <div v-if="caseItem.evidence_document_url" class="review__docs">
                <FilePreview
                  :url="caseItem.evidence_document_url"
                  :name="$t('adminInactiveUsers.evidenceDocument')"
                />
              </div>
            </section>
          </template>

          <!-- Documents & certificates -->
          <section v-if="certificateFields.length > 0" class="review__section">
            <h3 class="review__section-title">{{ $t('adminInactiveUsers.sectionDocuments') }}</h3>
            <div class="review__docs">
              <FilePreview
                v-for="(field, index) in certificateFields"
                :key="index"
                :url="field.value"
                :name="formatKey(field.key)"
              />
            </div>
          </section>
        </div>

        <!-- Footer / actions -->
        <footer class="review__footer">
          <div v-if="type === 'CLIENT'" class="review__casetype">
            <label class="review__casetype-label" :for="`case-type-${selectedUser.userId}`">
              {{ $t('adminInactiveUsers.caseType') }}
            </label>
            <b-form-select
              :id="`case-type-${selectedUser.userId}`"
              v-model="selectedUser.case_type"
              :options="categoryOptions"
              size="sm"
              :disabled="selectedUser.approved"
            />
            <span v-if="!selectedUser.case_type && !selectedUser.approved" class="review__hint">
              {{ $t('adminInactiveUsers.reviewCaseTypeHint') }}
            </span>
          </div>
          <div class="review__actions">
            <b-button variant="outline-secondary" @click="modalVisible = false">
              {{ $t('adminInactiveUsers.close') }}
            </b-button>
            <b-button
              variant="success"
              :disabled="selectedUser.approved || approving || (type === 'CLIENT' && !selectedUser.case_type)"
              @click="approve(selectedUser)"
            >
              <i class="fas fa-check me-1" aria-hidden="true"></i>
              {{ approving ? $t('adminInactiveUsers.approving') : $t('adminInactiveUsers.approve') }}
            </b-button>
          </div>
        </footer>
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
    typeLabel () {
      return this.type === 'MEDIATOR'
        ? this.$t('adminInactiveUsers.typeMediator')
        : this.$t('adminInactiveUsers.typeClient')
    },
    additionalFacts () {
      if (!this.selectedUser) return []
      // Keys already shown in dedicated sections of the modal.
      const handledKeys = ['state', 'preferred_languages', 'profile_picture_url', 'phone_number']
      return Object.entries(this.filteredItem(this.selectedUser))
        .filter(([key, value]) => !handledKeys.includes(key) && !this.isURL(value))
        .map(([key, value]) => {
          let display
          if (key === 'preferred_area_of_practice' || this.isArrayValue(value)) {
            display = this.convertToCommaSeparated(value)
          } else {
            display = this.capitalizeWord(value)
          }
          return { key, label: this.formatKey(key), value: display }
        })
        .filter(fact => fact.value !== '' && fact.value !== null && fact.value !== undefined)
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
    initials (name) {
      if (!name || typeof name !== 'string') return '?'
      return name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map(part => part.charAt(0).toUpperCase())
        .join('') || '?'
    },
    async approve (item) {
      if (this.type === 'CLIENT' && !item.case_type) {
        this.showAlert(this.$t('adminInactiveUsers.selectCaseTypeAlert'), 'danger')
        return
      }
      this.approving = true
      try {
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
      } finally {
        this.approving = false
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
      modalVisible: false,
      selectedUser: null,
      languages: {},
      approving: false
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
  background-color: var(--kadr-bg-surface) !important;
  border: 1px solid var(--kadr-border) !important;
}

.card {
  transition: transform var(--kadr-duration-fast) var(--kadr-ease);
}

.card:hover {
  transform: translateY(-2px);
  box-shadow: var(--kadr-shadow-md);
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

/* ---- Review modal ---------------------------------------------------- */
.review-modal .modal-content {
  border: none;
  border-radius: var(--kadr-radius-lg, 12px);
  overflow: hidden;
  box-shadow: var(--kadr-shadow-lg, 0 12px 30px rgba(31, 36, 50, 0.12));
}

.review {
  display: flex;
  flex-direction: column;
  background-color: var(--kadr-bg-surface, #fff);
  color: var(--kadr-text-primary, #1f2432);
}

.review__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--kadr-space-3, 12px);
  padding: var(--kadr-space-5, 24px);
  background: linear-gradient(135deg, var(--kadr-hero-from, #4b3fbf), var(--kadr-hero-to, #7b6ef0));
  color: var(--kadr-text-on-primary, #fff);
}

.review__identity {
  display: flex;
  align-items: center;
  gap: var(--kadr-space-4, 16px);
  min-width: 0;
}

.review__avatar {
  flex: 0 0 auto;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  overflow: hidden;
  background-color: rgba(255, 255, 255, 0.2);
  border: 2px solid rgba(255, 255, 255, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
}

.review__avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.review__avatar-fallback {
  font-size: 1.25rem;
  font-weight: 600;
  color: #fff;
}

.review__identity-text {
  min-width: 0;
}

.review__name {
  margin: 0 0 6px;
  font-size: 1.35rem;
  font-weight: 600;
  line-height: 1.2;
  color: #fff;
  word-break: break-word;
}

.review__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--kadr-space-2, 8px);
}

.review__badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 10px;
  border-radius: 999px;
  background-color: rgba(255, 255, 255, 0.9);
  color: var(--kadr-primary, #5a4bd4);
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.review__pending {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 0.78rem;
  color: rgba(255, 255, 255, 0.9);
}

.review__close {
  flex: 0 0 auto;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background-color: rgba(255, 255, 255, 0.18);
  color: #fff;
  font-size: 0.95rem;
  cursor: pointer;
  transition: background-color var(--kadr-duration-fast, 150ms) var(--kadr-ease, ease);
}

.review__close:hover {
  background-color: rgba(255, 255, 255, 0.32);
}

.review__body {
  padding: var(--kadr-space-5, 24px);
  display: flex;
  flex-direction: column;
  gap: var(--kadr-space-5, 24px);
}

.review__section {
  padding-bottom: var(--kadr-space-5, 24px);
  border-bottom: 1px solid var(--kadr-border, #e9eaf2);
}

.review__section:last-child {
  padding-bottom: 0;
  border-bottom: none;
}

.review__section-title {
  margin: 0 0 var(--kadr-space-3, 12px);
  font-size: 0.78rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--kadr-text-label, #8b92a6);
}

.review__section-count {
  text-transform: none;
  letter-spacing: 0;
  font-weight: 500;
  color: var(--kadr-text-muted, #737b90);
}

.review__subheading {
  margin: var(--kadr-space-4, 16px) 0 var(--kadr-space-2, 8px);
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--kadr-text-secondary, #4a5163);
}

.review__facts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
  gap: var(--kadr-space-3, 12px) var(--kadr-space-5, 24px);
  margin: 0;
}

.review__fact {
  margin: 0;
  min-width: 0;
}

.review__fact dt {
  margin: 0 0 2px;
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--kadr-text-label, #8b92a6);
}

.review__fact dd {
  margin: 0;
  font-size: 0.92rem;
  color: var(--kadr-text-primary, #1f2432);
  word-break: break-word;
}

.review__fact dd a {
  color: var(--kadr-primary, #5a4bd4);
  text-decoration: none;
}

.review__fact dd a:hover {
  text-decoration: underline;
}

.review__note {
  margin-top: var(--kadr-space-3, 12px);
  padding: var(--kadr-space-3, 12px) var(--kadr-space-4, 16px);
  background-color: var(--kadr-surface-muted, #f7f8fc);
  border: 1px solid var(--kadr-border, #e9eaf2);
  border-radius: var(--kadr-radius, 8px);
}

.review__note-label {
  display: block;
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--kadr-text-label, #8b92a6);
  margin-bottom: 4px;
}

.review__note-text {
  margin: 0;
  font-size: 0.92rem;
  line-height: 1.5;
  color: var(--kadr-text-secondary, #4a5163);
  white-space: pre-line;
}

.review__empty {
  margin: 0;
  font-size: 0.9rem;
  color: var(--kadr-text-muted, #737b90);
  font-style: italic;
}

.review__docs {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--kadr-space-3, 12px);
  margin-top: var(--kadr-space-3, 12px);
}

.review__footer {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--kadr-space-3, 12px);
  padding: var(--kadr-space-4, 16px) var(--kadr-space-5, 24px);
  background-color: var(--kadr-surface-muted, #f7f8fc);
  border-top: 1px solid var(--kadr-border, #e9eaf2);
}

.review__casetype {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 220px;
}

.review__casetype-label {
  margin: 0;
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--kadr-text-label, #8b92a6);
}

.review__hint {
  font-size: 0.75rem;
  color: var(--kadr-warning, #c98a2b);
}

.review__actions {
  display: flex;
  gap: var(--kadr-space-2, 8px);
  margin-left: auto;
}

@media (max-width: 575.98px) {
  .review__header,
  .review__body,
  .review__footer {
    padding-left: var(--kadr-space-4, 16px);
    padding-right: var(--kadr-space-4, 16px);
  }

  .review__actions {
    width: 100%;
  }

  .review__actions .btn {
    flex: 1;
  }
}
</style>
