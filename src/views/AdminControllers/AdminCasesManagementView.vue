<template>
  <b-container fluid>
    <b-row>
      <b-col sm="12">
        <iq-card>
          <template v-slot:headerTitle>
            <div class="d-flex flex-wrap align-items-center justify-content-between w-100">
              <h4 class="card-title mb-0">Case management</h4>
              <small class="text-muted" v-if="totalCases >= 0">{{ totalCases }} active case(s)</small>
            </div>
          </template>
          <template v-slot:body>
            <p class="text-muted mb-3">
              Review ongoing cases, meetings, and parties. Filter below, open a case for full detail, or assign or change a mediator when auto-assignment did not run.
            </p>

            <b-row class="mb-3">
              <b-col md="6" lg="3" class="mb-2">
                <label class="small text-muted mb-1">Mediator</label>
                <b-form-select
                  v-model="filters.mediatorId"
                  :options="mediatorFilterOptions"
                  @change="onFilterChange"
                />
              </b-col>
              <b-col md="6" lg="3" class="mb-2">
                <label class="small text-muted mb-1">First party</label>
                <b-form-select
                  v-model="filters.firstPartyId"
                  :options="firstPartyFilterOptions"
                  @change="onFilterChange"
                />
              </b-col>
              <b-col md="6" lg="3" class="mb-2">
                <label class="small text-muted mb-1">Second party</label>
                <b-form-select
                  v-model="filters.secondPartyId"
                  :options="secondPartyFilterOptions"
                  @change="onFilterChange"
                />
              </b-col>
              <b-col md="6" lg="3" class="mb-2">
                <label class="small text-muted mb-1">Status</label>
                <b-form-select
                  v-model="filters.status"
                  :options="statusFilterOptions"
                  @change="onFilterChange"
                />
              </b-col>
            </b-row>

            <b-row v-if="cases.length > 0">
              <b-col md="6" v-for="c in cases" :key="c.id" class="mb-3">
                <b-card class="h-100 user-card">
                  <b-card-body class="d-flex flex-column">
                    <div class="mb-2">
                      <h5 class="mb-1">{{ c.caseId || 'Case' }}</h5>
                      <b-badge variant="info" class="mr-1">{{ statusLabel(c) }}</b-badge>
                      <b-badge variant="secondary">{{ subStatusLabel(c) }}</b-badge>
                    </div>
                    <p class="mb-2"><strong>First party:</strong> {{ partyName(c.user_cases_first_partyTouser) }}</p>
                    <p class="mb-2"><strong>Second party:</strong> {{ partyName(c.user_cases_second_partyTouser) }}</p>
                    <p class="mb-2">
                      <strong>Mediator:</strong>
                      {{ c.user_cases_mediatorTouser ? c.user_cases_mediatorTouser.name : 'Not assigned' }}
                    </p>
                    <p class="mb-2" v-if="c.case_type">
                      <strong>Type:</strong> {{ c.case_type }}
                    </p>
                    <div class="mt-auto d-flex flex-wrap justify-content-end">
                      <b-button variant="outline-primary" size="sm" class="mr-1 mb-1" @click="openDetailModal(c)">
                        View details
                      </b-button>
                      <b-button variant="primary" size="sm" class="mb-1" @click="openAssignModal(c)">
                        {{ c.user_cases_mediatorTouser ? 'Change mediator' : 'Assign mediator' }}
                      </b-button>
                    </div>
                  </b-card-body>
                </b-card>
              </b-col>
            </b-row>
            <div v-else class="text-center py-4">
              <h5>No cases match the current filters.</h5>
            </div>

            <b-pagination
              v-if="totalCases > 0"
              v-model="currentPage"
              :total-rows="totalCases"
              :per-page="perPage"
              align="center"
              class="mt-3"
              @input="fetchCases"
            />
          </template>
        </iq-card>
      </b-col>
    </b-row>

    <b-modal
      v-model="detailModalVisible"
      size="xl"
      modal-class="case-detail-modal"
      title="Case details"
      hide-footer
      scrollable
    >
      <div v-if="selectedCase">
        <h5 class="mb-3">{{ selectedCase.caseId || 'Case' }}</h5>
        <p class="mb-2"><strong>Status: </strong> {{ statusLabel(selectedCase) }} — {{ subStatusLabel(selectedCase) }}</p>
        <p class="mb-2" v-if="selectedCase.category"><strong>Category: </strong> {{ selectedCase.category }}</p>
        <p class="mb-2" v-if="selectedCase.case_type"><strong>Case type: </strong> {{ selectedCase.case_type }}</p>
        <p class="mb-2" v-if="selectedCase.description"><strong>Description: </strong> {{ selectedCase.description }}</p>
        <p class="mb-2"><strong>First party: </strong> {{ partyDetail(selectedCase.user_cases_first_partyTouser) }}</p>
        <p class="mb-2"><strong>Second party: </strong> {{ partyDetail(selectedCase.user_cases_second_partyTouser) }}</p>
        <p class="mb-2"><strong>Mediator:</strong>
          <span v-if="selectedCase.user_cases_mediatorTouser">
            {{ partyDetail(selectedCase.user_cases_mediatorTouser) }}
          </span>
          <span v-else class="text-muted">Not assigned</span>
        </p>

        <p class="mb-2"><strong>Meetings:</strong> </p>
        <div v-if="!selectedCase.events || selectedCase.events.length === 0" class="text-muted small mb-3">No meetings scheduled yet.</div>
        <div v-else class="meeting-stack mb-4">
          <article
            v-for="meeting in meetingRows(selectedCase.events)"
            :key="meeting.id"
            class="meeting-card"
          >
            <div class="meeting-head">
              <div>
                <h6 class="mb-1">{{ meeting.title || 'Meeting' }}</h6>
                <p class="mb-0 small text-muted">Starts: {{ meeting.start }}</p>
                <p class="mb-0 small text-muted">Ends: {{ meeting.end }}</p>
              </div>
              <div class="meeting-head-actions">
                <span class="meeting-status-tag" :class="meeting.statusClass">{{ meeting.statusLabel }}</span>
                <b-button
                  v-if="meeting.meeting_link"
                  size="sm"
                  variant="primary"
                  :href="meeting.meeting_link"
                  target="_blank"
                  rel="noopener"
                >
                  Join
                </b-button>
                <b-button
                  v-if="meeting.google_calendar_link"
                  size="sm"
                  variant="outline-secondary"
                  :href="meeting.google_calendar_link"
                  target="_blank"
                  rel="noopener"
                >
                  Calendar
                </b-button>
              </div>
            </div>

            <h6 class="mt-3">Feedbacks</h6>
            <b-tabs class="feedback-tabs" content-class="pt-3" pills small>
              <b-tab title="Mediator">
                <section class="feedback-box">
                  <p><strong>Summary: </strong> {{ meeting.meeting_summary || '—' }}</p>
                  <p><strong>Next steps: </strong> {{ meeting.mediator_next_steps || '—' }}</p>
                  <p><strong>Submitted: </strong> {{ meeting.mediator_feedback_at || '—' }}</p>
                </section>
              </b-tab>
              <b-tab title="First party">
                <section class="feedback-box">
                  <p>
                    <strong>Rating: </strong>
                    <span v-if="meeting.first_party_rating != null">{{ meeting.first_party_rating }}/5 {{ meeting.first_party_stars }}</span>
                    <span v-else>—</span>
                  </p>
                  <p><strong>Next steps: </strong> {{ meeting.first_party_next_steps || '—' }}</p>
                  <p><strong>Submitted: </strong> {{ meeting.first_party_feedback_at || '—' }}</p>
                </section>
              </b-tab>
              <b-tab title="Second party">
                <section class="feedback-box">
                  <p>
                    <strong>Rating: </strong>
                    <span v-if="meeting.second_party_rating != null">{{ meeting.second_party_rating }}/5 {{ meeting.second_party_stars }}</span>
                    <span v-else>—</span>
                  </p>
                  <p><strong>Next steps: </strong> {{ meeting.second_party_next_steps || '—' }}</p>
                  <p><strong>Submitted: </strong> {{ meeting.second_party_feedback_at || '—' }}</p>
                </section>
              </b-tab>
            </b-tabs>
          </article>
        </div>

        <p class="mb-2"><strong>Case timeline:</strong> </p>
        <div v-if="!selectedCase.case_history || selectedCase.case_history.length === 0" class="text-muted small">No timeline entries.</div>
        <ul v-else class="pl-3 small">
          <li v-for="(h, idx) in selectedCase.case_history" :key="idx" class="mb-2">
            <strong>{{ (h.case_events && h.case_events.title) || 'Event' }}</strong>
            <span v-if="h.created_at"> — {{ formatDate(h.created_at) }}</span>
          </li>
        </ul>
        <strong>Documents</strong>
          <div class="docs-grid" v-if="selectedCase.evidence_document_url">
              <FilePreview
              key="Evidence Document"
              :url="selectedCase.evidence_document_url"
              name="Evidence Document"
            />
        </div>

        <div class="d-flex justify-content-end mt-3">
          <b-button variant="secondary" @click="detailModalVisible = false">Close</b-button>
          <b-button variant="primary" class="ml-2" @click="openAssignFromDetail">Assign / change mediator</b-button>
        </div>
      </div>
    </b-modal>

    <b-modal v-model="assignModalVisible" size="lg" :title="assignModalTitle" hide-footer scrollable>
      <p class="text-muted small mb-3">
        Choose an active dispute resolution expert. They will receive a notification. Calendar scheduling can still be done from the mediator workflow if needed.
      </p>
      <b-form-input v-model="mediatorSearch" placeholder="Search by name or email" class="mb-3" />
      <b-row>
        <b-col md="6" v-for="m in filteredMediators" :key="m.id" class="mb-3">
          <b-card class="h-100 user-card" :class="{ 'border-primary': selectedMediatorId === m.id }">
            <b-card-body class="d-flex flex-column">
              <div class="d-flex align-items-center mb-2">
                <img
                  v-if="m.profile_picture_url"
                  :src="m.profile_picture_url"
                  class="rounded-circle mr-2"
                  width="44"
                  height="44"
                  alt=""
                />
                <div>
                  <h6 class="mb-0">{{ m.name }}</h6>
                  <small class="text-muted">{{ m.email }}</small>
                </div>
              </div>
              <p class="mb-1 small" v-if="m.phone_number"><strong>Phone:</strong> {{ m.phone_number }}</p>
              <p class="mb-1 small" v-if="m.state"><strong>State:</strong> {{ m.state }}</p>
              <p class="mb-2 small" v-if="practiceAreas(m)"><strong>Practice areas:</strong> {{ practiceAreas(m) }}</p>
              <div class="mt-auto">
                <b-button
                  size="sm"
                  :variant="selectedMediatorId === m.id ? 'primary' : 'outline-primary'"
                  @click="selectedMediatorId = m.id"
                >
                  {{ selectedMediatorId === m.id ? 'Selected' : 'Select' }}
                </b-button>
              </div>
            </b-card-body>
          </b-card>
        </b-col>
      </b-row>
      <div v-if="filteredMediators.length === 0" class="text-center text-muted py-3">No mediators match your search.</div>
      <div class="d-flex justify-content-end mt-3">
        <b-button variant="secondary" @click="assignModalVisible = false">Cancel</b-button>
        <b-button variant="primary" class="ml-2" :disabled="!selectedMediatorId" @click="confirmAssignMediator">
          Confirm assignment
        </b-button>
      </div>
    </b-modal>
  </b-container>
</template>

<script>
import { sofbox } from '../../config/pluginInit'
import FilePreview from '../core/DocumentPreview.vue'

export default {
  name: 'AdminCasesManagementView',
  components: {
    FilePreview
  },
  mounted () {
    sofbox.index()
    this.loadMeta()
    this.fetchCases()
  },
  data () {
    return {
      meta: null,
      cases: [],
      totalCases: 0,
      currentPage: 1,
      perPage: 10,
      filters: {
        mediatorId: null,
        firstPartyId: null,
        secondPartyId: null,
        status: null
      },
      detailModalVisible: false,
      assignModalVisible: false,
      selectedCase: null,
      caseForAssign: null,
      mediatorSearch: '',
      selectedMediatorId: null,
      meetingFields: []
    }
  },
  computed: {
    mediatorFilterOptions () {
      const base = [
        { value: null, text: 'All mediators' },
        { value: '__unassigned__', text: 'Unassigned only' }
      ]
      const rest = (this.meta && this.meta.mediators ? this.meta.mediators : []).map(m => ({
        value: m.id,
        text: `${m.name} (${m.email})`
      }))
      return base.concat(rest)
    },
    firstPartyFilterOptions () {
      const base = [{ value: null, text: 'All first parties' }]
      const rest = (this.meta && this.meta.firstParties ? this.meta.firstParties : []).map(u => ({
        value: u.id,
        text: `${u.name} (${u.email})`
      }))
      return base.concat(rest)
    },
    secondPartyFilterOptions () {
      const base = [{ value: null, text: 'All second parties' }]
      const rest = (this.meta && this.meta.secondParties ? this.meta.secondParties : []).map(u => ({
        value: u.id,
        text: `${u.name} (${u.email})`
      }))
      return base.concat(rest)
    },
    statusFilterOptions () {
      const base = [{ value: null, text: 'All statuses' }]
      const rest = (this.meta && this.meta.statuses ? this.meta.statuses : []).map(s => ({
        value: s.id,
        text: s.name
      }))
      return base.concat(rest)
    },
    filteredMediators () {
      const list = (this.meta && this.meta.mediators) ? this.meta.mediators : []
      const q = (this.mediatorSearch || '').trim().toLowerCase()
      if (!q) return list
      return list.filter(m =>
        (m.name && m.name.toLowerCase().includes(q)) ||
        (m.email && m.email.toLowerCase().includes(q))
      )
    },
    assignModalTitle () {
      if (!this.caseForAssign) return 'Assign mediator'
      return this.caseForAssign.user_cases_mediatorTouser
        ? 'Change mediator'
        : 'Assign mediator'
    }
  },
  methods: {
    async loadMeta () {
      const res = await this.$store.dispatch('getAdminCaseManagementMeta')
      if (res.success && res.data && res.data.meta) {
        this.meta = res.data.meta
      }
    },
    onFilterChange () {
      this.currentPage = 1
      this.fetchCases()
    },
    async fetchCases () {
      const res = await this.$store.dispatch('getAdminActiveCases', {
        page: this.currentPage,
        mediatorId: this.filters.mediatorId || undefined,
        firstPartyId: this.filters.firstPartyId || undefined,
        secondPartyId: this.filters.secondPartyId || undefined,
        status: this.filters.status || undefined
      })
      if (res.success && res.data) {
        this.cases = res.data.casesWithEvents || []
        this.totalCases = res.data.total || 0
      }
    },
    partyName (u) {
      if (!u) return '—'
      return u.name || '—'
    },
    partyDetail (u) {
      if (!u) return '—'
      const parts = [u.name, u.email, u.phone_number].filter(Boolean)
      return parts.join(' · ')
    },
    statusLabel (c) {
      if (c.case_statuses && c.case_statuses.name) return c.case_statuses.name
      return c.status || '—'
    },
    subStatusLabel (c) {
      if (c.case_sub_statuses && c.case_sub_statuses.name) return c.case_sub_statuses.name
      return c.sub_status || '—'
    },
    formatDate (dateString) {
      if (!dateString) return ''
      const date = new Date(dateString)
      return date.toLocaleString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        hour12: true
      })
    },
    getMeetingStatus (start, end) {
      const now = new Date()
      const s = start ? new Date(start) : null
      const e = end ? new Date(end) : null
      if (!s || !e) {
        return { statusLabel: 'Unknown', statusClass: 'status-unknown' }
      }
      if (now < s) return { statusLabel: 'Upcoming', statusClass: 'status-upcoming' }
      if (now > e) return { statusLabel: 'Past', statusClass: 'status-past' }
      return { statusLabel: 'Ongoing', statusClass: 'status-ongoing' }
    },
    ratingToStars (rating) {
      if (rating == null) return ''
      const value = Math.max(1, Math.min(5, Number(rating)))
      return '★'.repeat(value) + '☆'.repeat(5 - value)
    },
    meetingRows (events) {
      return (events || [])
        .slice()
        .sort((a, b) => new Date(b.start_datetime) - new Date(a.start_datetime))
        .map(e => ({
          id: e.id,
          title: e.title,
          type: e.type,
          start: this.formatDate(e.start_datetime),
          end: this.formatDate(e.end_datetime),
          meeting_link: e.meeting_link,
          google_calendar_link: e.google_calendar_link,
          meeting_summary: e.meeting_summary,
          mediator_next_steps: e.mediator_next_steps,
          first_party_next_steps: e.first_party_next_steps,
          second_party_next_steps: e.second_party_next_steps,
          first_party_rating: e.first_party_rating,
          second_party_rating: e.second_party_rating,
          first_party_stars: this.ratingToStars(e.first_party_rating),
          second_party_stars: this.ratingToStars(e.second_party_rating),
          mediator_feedback_at: this.formatDate(e.mediator_feedback_at),
          first_party_feedback_at: this.formatDate(e.first_party_feedback_at),
          second_party_feedback_at: this.formatDate(e.second_party_feedback_at),
          ...this.getMeetingStatus(e.start_datetime, e.end_datetime)
        }))
    },
    practiceAreas (m) {
      if (!m.preferred_area_of_practice) return ''
      try {
        const parsed = JSON.parse(m.preferred_area_of_practice)
        if (Array.isArray(parsed)) return parsed.join(', ')
      } catch (e) {
        return m.preferred_area_of_practice
      }
      return ''
    },
    openDetailModal (c) {
      this.selectedCase = c
      this.detailModalVisible = true
    },
    openAssignModal (c) {
      this.caseForAssign = c
      this.selectedMediatorId = c.user_cases_mediatorTouser ? c.user_cases_mediatorTouser.id : null
      this.mediatorSearch = ''
      this.assignModalVisible = true
    },
    openAssignFromDetail () {
      this.detailModalVisible = false
      this.openAssignModal(this.selectedCase)
    },
    async confirmAssignMediator () {
      if (!this.caseForAssign || !this.selectedMediatorId) return
      const res = await this.$store.dispatch('adminAssignCaseMediator', {
        caseId: this.caseForAssign.id,
        mediatorId: this.selectedMediatorId
      })
      if (res.success) {
        this.assignModalVisible = false
        await this.fetchCases()
        await this.loadMeta()
      }
    }
  }
}
</script>

<style scoped>
::v-deep .card-header {
  background-color: unset !important;
  border-bottom: unset !important;
}
.user-card {
  background-color: #fcfdff;
  border: 1px solid #dee2e6;
}
.text-muted {
  width: 100%;
  color: #6c757d !important;
}
.docs-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 0.75rem;
  margin-top: 0.75rem;
}
.meeting-stack {
  display: grid;
  gap: 0.8rem;
}
.meeting-card {
  border: 1px solid #e6e9f5;
  border-radius: 10px;
  background: #fcfdff;
  padding: 0.85rem;
}
.meeting-head {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  align-items: flex-start;
  flex-wrap: wrap;
}
.meeting-head-actions {
  display: flex;
  gap: 0.45rem;
  align-items: center;
  flex-wrap: wrap;
}
.meeting-status-tag {
  font-size: 0.72rem;
  font-weight: 600;
  border-radius: 999px;
  padding: 0.2rem 0.55rem;
  border: 1px solid transparent;
}
.status-upcoming {
  color: #1d4ed8;
  background: #e7f0ff;
  border-color: #bfd6ff;
}
.status-ongoing {
  color: #036c41;
  background: #e6f8ef;
  border-color: #b9ebd2;
}
.status-past {
  color: #5b6178;
  background: #eceef4;
  border-color: #d8dcea;
}
.status-unknown {
  color: #6b7280;
  background: #f3f4f6;
  border-color: #e5e7eb;
}
.feedback-tabs {
  background: #fff;
  border: 1px solid #edf1fb;
  border-radius: 8px;
  padding: 0.5rem;
}
.feedback-tabs ::v-deep .nav-pills .nav-link {
  font-size: 0.8rem;
  padding: 0.35rem 0.7rem;
}
.feedback-tabs ::v-deep .nav-pills .nav-link.active {
  background-color: #007bff;
  color: white;
}
.feedback-tabs ::v-deep .tab-content {
  border-top: 1px solid #edf1fb;
}
.feedback-box {
  border: 1px dashed #d8ddec;
  border-radius: 8px;
  background: #fff;
  padding: 0.6rem;
}
.feedback-box h6 {
  margin-bottom: 0.45rem;
}
.feedback-box p {
  margin-bottom: 0.35rem;
  font-size: 0.87rem;
}
.case-detail-modal {
  max-width: 1180px;
}

</style>
