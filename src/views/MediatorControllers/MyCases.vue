<template>
  <div class="cases-workspace">
    <Alert :message="alert.message" :type="alert.type" v-model="alert.visible" :timeout="alert.timeout"></Alert>
    <Spinner :isVisible="loading" />

    <section v-if="myCases.length" class="cases-overview">
      <div class="overview-head">
        <h4>Mediator Case Workspace</h4>
        <p>Switch between assigned cases, schedule meetings, track status and keep case-level notes.</p>
      </div>

      <div class="case-selector" v-if="myCases.length > 1">
        <button
          v-for="caseItem in myCases"
          :key="caseItem.id"
          type="button"
          class="case-pill"
          :class="{ active: selectedCase.id === caseItem.id }"
          @click="selectCase(caseItem)"
        >
          <span>{{ caseItem.caseId }}</span>
          <small>{{ caseItem.case_statuses?.name || 'Unknown' }}</small>
        </button>
      </div>

      <div class="workspace-layout">
        <div class="workspace-main">
          <div class="quick-info-grid">
            <article class="info-card">
              <label>Case ID</label>
              <strong>{{ selectedCase.caseId || '-' }}</strong>
            </article>
            <article class="info-card">
              <label>Status</label>
              <strong class="status-chip" :class="statusBadgeClass">{{ selectedCase.case_statuses?.name || '-' }}</strong>
            </article>
            <article class="info-card">
              <label>Sub Status</label>
              <strong>{{ selectedCase.case_sub_statuses?.name || '-' }}</strong>
            </article>
            <article class="info-card">
              <label>Filed On</label>
              <strong>{{ formatDateTime(selectedCase.created_at) }}</strong>
            </article>
            <article class="info-card">
              <label>Type</label>
              <strong>{{ selectedCase.case_type || '-' }}</strong>
            </article>
            <article class="info-card">
              <label>Category</label>
              <strong>{{ selectedCase.category || '-' }}</strong>
            </article>
          </div>

          <section  class="info-card">
            <label>Case Description</label>
            <strong>
              {{ selectedCase.description || 'No description provided for this case.' }}
            </strong>
          </section>

          <section class="section-card action-required-section">
            <div class="section-head">
              <h5>
                <i class="fas fa-exclamation-circle section-icon"></i>
                Action Required
              </h5>
              <small>Complete pending steps for this case.</small>
            </div>
            <div v-if="mediatorActionCards.length" class="action-grid">
              <article
                v-for="item in mediatorActionCards"
                :key="item.key"
                class="action-card"
                :class="item.variant"
              >
                <h6>
                  <i class="fas fa-angle-right action-card-icon"></i>
                  {{ item.title }}
                </h6>
                <p>{{ item.description }}</p>
                <button
                  type="button"
                  class="btn btn-sm btn-light"
                  :disabled="item.loading"
                  @click="item.action"
                >
                  {{ item.buttonText }}
                </button>
              </article>
            </div>
            <div v-else class="empty-box">No immediate action is required for this case.</div>
          </section>

          <section class="section-card">
            <div class="section-head">
              <h5>Mediator Actions</h5>
              <small>Run key workflows directly from this case workspace.</small>
            </div>
            <div class="action-grid">
              <article class="action-card primary">
                <h6><i class="fas fa-calendar-plus action-card-icon"></i> Schedule Meeting</h6>
                <p>Create a meeting for this case without leaving the dashboard.</p>
                <button class="btn btn-sm btn-light" @click="openMeetingModal">Create Meeting</button>
              </article>
              <article class="action-card warning">
                <h6><i class="fas fa-random action-card-icon"></i>Close Case</h6>
                <p>Update internal tracking stage to move to close stage.</p>
                <div class="status-move-row">
                  <select v-model="selectedWorkflowStatus" class="form-select form-select-sm">
                    <option v-for="option in workflowStatusOptions" :key="option" :value="option">{{ option }}</option>
                  </select>
                  <button class="btn btn-sm btn-light" @click="applyWorkflowStatus">Apply</button>
                </div>
              </article>
            </div>
          </section>

          <section class="section-card">
            <div class="section-head">
              <h5>Parties</h5>
              <small>Both disputing parties attached to this case.</small>
            </div>
            <div class="party-grid">
              <article class="party-card">
                <h6>First Party</h6>
                <p><span>Name:</span>{{ selectedCase.user_cases_first_partyTouser?.name || '-' }}</p>
                <p><span>Email:</span>{{ selectedCase.user_cases_first_partyTouser?.email || '-' }}</p>
                <p><span>Phone:</span>{{ selectedCase.user_cases_first_partyTouser?.phone_number || '-' }}</p>
              </article>
              <article class="party-card">
                <h6>Second Party</h6>
                <p><span>Name:</span>{{ selectedCase.user_cases_second_partyTouser?.name || '-' }}</p>
                <p><span>Email:</span>{{ selectedCase.user_cases_second_partyTouser?.email || '-' }}</p>
                <p><span>Phone:</span>{{ selectedCase.user_cases_second_partyTouser?.phone_number || '-' }}</p>
              </article>
            </div>
          </section>
          <section class="section-card documents-section">
            <div class="section-head">
              <h5>
                Documents
              </h5>
              <small>Access case files and supporting documents directly from here.</small>
            </div>
            <div v-if="selectedCase.evidence_document_url" class="docs-grid">
                <FilePreview
                  :key="selectedCase.evidence_document_url"
                  :url="selectedCase.evidence_document_url"
                  name="Evidence Document"
                />
            </div>
            <div v-else class="empty-box">No documents attached to this case.</div>
          </section>

          <section class="section-card">
            <div class="section-head">
              <h5>Meetings</h5>
              <small>Upcoming and past sessions; add summary and next steps after each past case meeting.</small>
            </div>
            <div v-if="caseMeetingsSorted.length" class="meeting-list">
              <article v-for="meeting in caseMeetingsSorted" :key="meeting.id" class="meeting-item">
                <div class="meeting-item-body">
                  <div class="meeting-badges">
                    <span class="badge-soft" :class="meetingPast(meeting) ? 'badge-past' : 'badge-upcoming'">
                      {{ meetingPast(meeting) ? 'Past' : 'Upcoming' }}
                    </span>
                  </div>
                  <h6>{{ meeting.title || `Case #${selectedCase.caseId}` }}</h6>
                  <p>{{ formatDateTime(meeting.start_datetime || meeting.startDate) }}</p>
                  <div v-if="meetingPast(meeting) && isKadrMeeting(meeting)" class="feedback-summary">
                    <p v-if="meeting.meeting_summary && userId === selectedCase.user_cases_mediatorTouser?.id"><span>Summary:</span> {{ meeting.meeting_summary }}</p>
                    <p v-if="meeting.mediator_next_steps && userId === selectedCase.user_cases_mediatorTouser?.id"><span>Next steps:</span> {{ meeting.mediator_next_steps }}</p>
                   </div>
                </div>
                <div class="meeting-actions">
                  <a
                    v-if="(meeting.meeting_link || meeting.meetingLink) && !meetingPast(meeting)"
                    :href="meeting.meeting_link || meeting.meetingLink"
                    target="_blank"
                    class="btn btn-outline-primary btn-sm"
                  >
                    Join
                  </a>
                  <button
                    v-if="showMediatorFeedbackButton(meeting)"
                    type="button"
                    class="btn btn-warning btn-sm"
                    @click="openMeetingFeedbackModal(meeting)"
                  >
                    Add meeting notes
                  </button>
                </div>
              </article>
            </div>
            <div v-else class="empty-box">No meetings are currently scheduled for this case.</div>
          </section>
        </div>
      </div>
    </section>

    <section v-else class="empty-state">
      <i class="fas fa-folder-open fa-3x"></i>
      <h4>No Assigned Cases</h4>
      <p>Assigned mediator cases will appear here with complete case context and actions.</p>
    </section>

    <b-modal
      size="lg"
      id="schedule-meeting-modal"
      ref="scheduleMeetingModal"
      title="Schedule Case Meeting"
      @ok="submitMeeting"
      scrollable
    >
      <div class="data-row">
        <div class="col-12">
          <div class="data-title">Title</div>
          <b-form-input
            id="title"
            type="text"
            v-model="meetingForm.title"
            required
            style="background: white;border: 1px solid black;"
            class="form-input"
          />
        </div>
      </div>
      <div class="data-row">
        <div class="col-12">
          <div class="data-title">Description</div>
          <b-form-textarea
            id="textarea"
            v-model="meetingForm.description"
            placeholder="Enter description.."
            rows="3"
            style="background: white;border: 1px solid black;"
            max-rows="6"
          ></b-form-textarea>
        </div>
      </div>
      <div class="data-row">
        <div class="col-12">
            <div class="data-title">Select Date and Time</div>
            <VueMaterialDateTimePicker
              id="appointment-datetime"
              v-model="meetingForm.start"
              :disabled-dates-and-times="disabledDatesAndTime"
              :is-date-only="false"
              class="form-input"
            />
        </div>
      </div>
    </b-modal>

    <MeetingFeedbackModal
      v-model="feedbackModalVisible"
      modal-id="mediator-meeting-feedback"
      role="mediator"
      :event-title="feedbackEvent && feedbackEvent.title"
      :case-label="selectedCase.caseId ? `Case #${selectedCase.caseId}` : ''"
      :initial-summary="feedbackEvent && feedbackEvent.meeting_summary"
      :initial-mediator-steps="feedbackEvent && feedbackEvent.mediator_next_steps"
      :submitting="feedbackSubmitting"
      @submit="onMeetingFeedbackSubmit"
    />
  </div>
</template>
<script>
import Alert from '../../components/sofbox/alert/Alert.vue'
import Spinner from '../../components/sofbox/spinner/spinner.vue'
import VueMaterialDateTimePicker from 'vue-material-date-time-picker'
import FilePreview from '../core/DocumentPreview.vue'
import MeetingFeedbackModal from '../../components/MeetingFeedbackModal.vue'
import {
  isPastKadrCaseMeeting,
  mediatorNeedsMeetingFeedback
} from '../../utils/meetingFeedback'

export default {
  name: 'MyCases',
  components: {
    Alert, Spinner, VueMaterialDateTimePicker, FilePreview, MeetingFeedbackModal
  },
  props: {
    cases: {
      type: Object,
      required: true
    },
    userId: {
      type: String,
      default: ''
    }
  },
  watch: {
    cases: {
      immediate: true,
      handler () {
        this.syncWithProp()
      }
    },
    selectedCase: {
      immediate: true,
      handler () {
        this.loadCaseNote()
        this.selectedWorkflowStatus = this.selectedCase.case_sub_statuses?.name || this.workflowStatusOptions[0]
      }
    }
  },
  computed: {
    myCases () {
      return this.paginatedData.casesWithEvents || []
    },
    caseMeetingsSorted () {
      const list = [...(this.selectedCase.events || [])]
      return list.sort((a, b) => new Date(b.start_datetime) - new Date(a.start_datetime))
    },
    mediatorActionCards () {
      const actions = []
      if (!this.userId || this.selectedCase.mediator !== this.userId) return actions
      for (const ev of this.selectedCase.events || []) {
        if (!ev || String(ev.type || 'KADR').toUpperCase() !== 'KADR') continue
        if (!mediatorNeedsMeetingFeedback(ev)) continue
        actions.push({
          key: `meeting-notes-${ev.id}`,
          title: 'Post-meeting notes',
          description: `Add summary and next steps for "${ev.title || 'a session'}" (${this.formatDateTime(ev.start_datetime)}).`,
          buttonText: 'Open form',
          loading: false,
          action: () => this.openMeetingFeedbackModal(ev),
          variant: 'warning'
        })
      }
      return actions
    },
    activeStepSequence () {
      if (!this.selectedCase?.case_history?.length) return null
      const sorted = [...this.selectedCase.case_history].sort((a, b) => a.sequence - b.sequence)
      const activeStep = sorted.find(step => step.completed === false)
      return activeStep ? activeStep.sequence : null
    },
    statusBadgeClass () {
      const status = (this.selectedCase.case_statuses?.name || '').toLowerCase()
      if (status.includes('closed success')) return 'success'
      if (status.includes('closed failed')) return 'danger'
      if (status.includes('progress')) return 'warning'
      return 'secondary'
    }
  },
  methods: {
    selectCase (caseItem) {
      this.selectedCase = caseItem
    },
    getProgressStepClass (step) {
      return {
        completed: step.completed === true,
        active: step.sequence === this.activeStepSequence,
        pending: step.completed === false && step.sequence !== this.activeStepSequence
      }
    },
    formatDateTime (dateString) {
      if (!dateString) return '-'
      return new Date(dateString).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    },
    showAlert (message, type) {
      this.alert = {
        message,
        type,
        visible: true
      }
    },
    syncWithProp () {
      this.paginatedData = { ...this.cases }
      if (!this.selectedCase?.id && this.paginatedData.casesWithEvents?.length) {
        this.selectedCase = this.paginatedData.casesWithEvents[0]
      }
    },
    openMeetingModal () {
      this.meetingForm = {
        title: this.selectedCase.caseId ? `Meeting for Case ${this.selectedCase.caseId}` : 'Case Meeting',
        start: '',
        description: this.getDefaultMeetingDescription()
      }
      this.$refs.scheduleMeetingModal.show()
    },
    getDefaultMeetingDescription () {
      return `Case #${this.selectedCase.caseId || '-'}\n1st Party: ${this.selectedCase.user_cases_first_partyTouser?.name || '-'}\n2nd Party: ${this.selectedCase.user_cases_second_partyTouser?.name || '-'}`
    },
    async submitMeeting (event) {
      if (!this.meetingForm.start) {
        event.preventDefault()
        this.showAlert('Please select date and time for the meeting.', 'danger')
        return
      }
      this.loading = true
      try {
        const endDate = new Date(this.meetingForm.start)
        endDate.setMinutes(endDate.getMinutes() + 30)
        const payload = {
          title: this.meetingForm.title,
          start: this.meetingForm.start,
          end: endDate,
          color: 'rgb(121, 134, 203)',
          caseId: this.selectedCase.id,
          description: this.meetingForm.description,
          type: 'kadr',
          caseNumber: this.selectedCase.caseId
        }
        const response = await this.$store.dispatch('newCalendarEvent', { event: payload })
        if (response.success || !response.error) {
          this.showAlert('Meeting scheduled successfully.', 'success')
        } else {
          this.showAlert(response.message || 'Unable to schedule meeting.', 'danger')
          event.preventDefault()
        }
      } finally {
        this.loading = false
      }
    },
    applyWorkflowStatus () {
      this.showAlert(`Status moved to "${this.selectedWorkflowStatus}" in your workspace view.`, 'success')
    },
    getCaseNoteKey () {
      return `mediator_case_note_${this.selectedCase.id || 'draft'}`
    },
    loadCaseNote () {
      if (!this.selectedCase?.id) {
        this.caseNote = ''
        return
      }
      this.caseNote = localStorage.getItem(this.getCaseNoteKey()) || ''
    },
    saveCaseNote () {
      if (!this.selectedCase?.id) return
      localStorage.setItem(this.getCaseNoteKey(), this.caseNote || '')
      this.showAlert('Case note saved.', 'success')
    },
    getYesterdayDate () {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      return yesterday
    },
    meetingPast (event) {
      return isPastKadrCaseMeeting({ ...event, type: event.type || 'KADR' })
    },
    isKadrMeeting (event) {
      return String(event.type || 'KADR').toUpperCase() === 'KADR'
    },
    showMediatorFeedbackButton (event) {
      if (!this.userId || this.selectedCase.mediator !== this.userId) return false
      if (!this.isKadrMeeting(event)) return false
      return mediatorNeedsMeetingFeedback(event)
    },
    openMeetingFeedbackModal (event) {
      this.feedbackEvent = event
      this.feedbackModalVisible = true
    },
    async onMeetingFeedbackSubmit (payload) {
      if (!this.feedbackEvent) return
      const body = {
        event_id: this.feedbackEvent.id,
        meeting_summary: payload.meeting_summary,
        mediator_next_steps: payload.mediator_next_steps
      }
      this.feedbackSubmitting = true
      const res = await this.$store.dispatch('submitMeetingFeedback', body)
      this.feedbackSubmitting = false
      if (res.success) {
        this.feedbackModalVisible = false
        this.$emit('refresh-dashboard')
      }
    }
  },
  data () {
    return {
      selectedCase: {},
      selectedWorkflowStatus: 'Case Review',
      workflowStatusOptions: ['Closed - Mediation Successful', 'Closed - Mediation Unsuccessful'],
      caseNote: '',
      meetingForm: {
        title: '',
        start: '',
        description: ''
      },
      disabledDatesAndTime: {
        to: (() => {
          const yesterday = new Date()
          yesterday.setDate(yesterday.getDate() - 1)
          return yesterday
        })()
      },
      paginatedData: {},
      feedbackModalVisible: false,
      feedbackEvent: null,
      feedbackSubmitting: false,
      alert: {
        visible: false,
        message: '',
        timeout: 5000,
        type: 'primary'
      },
      loading: false
    }
  }
}
</script>
<style scoped>
.cases-workspace {
  margin-top: 1rem;
}

.cases-overview {
  background: #fff;
  border: 1px solid #e8ebf5;
  border-radius: 14px;
  padding: 1rem;
}

.overview-head h4 {
  margin: 0;
}

.overview-head p {
  margin: 0.35rem 0 0.9rem;
  color: #6d7693;
}

.case-selector {
  display: flex;
  gap: 0.6rem;
  overflow-x: auto;
  padding-bottom: 0.5rem;
}

.case-pill {
  border: 1px solid #d8deef;
  background: #f8faff;
  border-radius: 10px;
  min-width: 160px;
  padding: 0.55rem 0.75rem;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.docs-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 0.75rem;
  margin-top: 0.75rem;
}

.form-input {
  width: 100%;
}

.form-input:focus {
  border-color: #007bff;
  background-color: #fff;
}

.data-title {
  font-weight: bold;
}

.case-pill.active {
  border-color: #3758d5;
  background: #edf2ff;
}

.case-pill span {
  font-weight: 600;
}

.case-pill small {
  color: #6d7693;
}

.workspace-layout {
  margin-top: 0.9rem;
  display: grid;
  gap: 1rem;
}

.workspace-main {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.quick-info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap: 0.7rem;
}

.info-card {
  border: 1px solid #ebeffa;
  border-radius: 10px;
  padding: 0.8rem;
  background: #fcfdff;
}

.info-card label {
  display: block;
  margin: 0;
  font-size: 0.75rem;
  color: #707a98;
}

.info-card strong {
  display: block;
  margin-top: 0.15rem;
  font-size: 0.95rem;
}

.section-icon {
  font-size: 1rem;
  color: #d94430;
}

.status-chip {
  width: fit-content;
  border-radius: 99px;
  padding: 0.22rem 0.6rem;
}

.status-chip.secondary {
  background: #eceff5;
}

.status-chip.warning {
  background: #fff2d9;
  color: #7a5700;
}

.status-chip.success {
  background: #dff7e8;
  color: #115f31;
}

.status-chip.danger {
  background: #fde2e4;
  color: #842029;
}

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

.action-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 0.75rem;
  margin-top: 0.75rem;
}

.action-card {
  border-radius: 10px;
  padding: 0.9rem;
  color: #3d2716;
  border: 1px solid #f4c7b0;
  background: linear-gradient(135deg, #fff2ec 0%, #ffe4d6 100%);
}

.action-card.primary {
  background: linear-gradient(135deg, #eff4ff, #dfe8ff);
  border-color: #bfd0ff;
}

.data-row {
  display: flex;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px solid #f1f1f1;
}

.action-card.warning {
  background: linear-gradient(135deg, #fff6e4, #ffe1c1);
  border-color: #f1c08a;
}

.action-card h6 {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.action-card p {
  margin: 0 0 0.5rem;
}

.action-card-icon {
  color: #3758d5;
}

.status-move-row {
  display: flex;
  gap: 0.45rem;
}

.note-card {
  margin-top: 0.75rem;
}

.note-input {
  width: 100%;
  min-height: 120px;
  border: 1px solid #d8dff1;
  border-radius: 8px;
  padding: 0.65rem 0.75rem;
  resize: vertical;
}

.note-actions {
  margin-top: 0.6rem;
  display: flex;
  justify-content: flex-end;
}

.party-grid {
  margin-top: 0.75rem;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 0.75rem;
}

.party-card {
  background: #f9fbff;
  border: 1px solid #e5eaf8;
  border-radius: 10px;
  padding: 0.8rem;
}

.party-card p {
  margin: 0.3rem 0;
  display: flex;
  justify-content: space-between;
  gap: 0.6rem;
  color: #2f3752;
}

.party-card p span {
  color: #6b7694;
}

.meeting-list {
  margin-top: 0.75rem;
  display: grid;
  gap: 0.65rem;
}

.meeting-item {
  border: 1px solid #e5eaf8;
  border-radius: 10px;
  padding: 0.8rem;
  display: flex;
  justify-content: space-between;
  gap: 0.8rem;
  align-items: center;
}

.meeting-item h6,
.meeting-item p {
  margin: 0;
}

.meeting-item p {
  color: #6d7693;
  margin-top: 0.25rem;
}

.meeting-item-body {
  flex: 1;
  min-width: 0;
}

.meeting-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin-bottom: 0.35rem;
}

.badge-soft {
  font-size: 0.68rem;
  font-weight: 600;
  padding: 0.2rem 0.5rem;
  border-radius: 6px;
}

.badge-past {
  background: #edeef3;
  color: #4a5168;
}

.badge-upcoming {
  background: #e8f2ff;
  color: #1d4ed8;
}

.feedback-summary {
  margin-top: 0.5rem;
  font-size: 0.86rem;
  color: #4a5472;
}

.feedback-summary p {
  margin: 0.2rem 0;
}

.feedback-summary span {
  color: #6b7694;
  font-weight: 600;
  margin-right: 0.35rem;
}

.meeting-actions {
  display: flex;
  gap: 0.45rem;
  flex-wrap: wrap;
  align-items: center;
}

.action-required-section .section-head h5 {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.workspace-side .sticky {
  position: sticky;
  top: 1rem;
}

.timeline {
  margin-top: 0.8rem;
  border-left: 2px solid #d8deef;
  padding-left: 0.9rem;
}

.timeline-step {
  position: relative;
  padding-left: 0.75rem;
  margin-bottom: 0.8rem;
}

.timeline-step::before {
  content: '';
  position: absolute;
  left: -1.32rem;
  top: 0.37rem;
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  background: #b8c0d8;
}

.timeline-step.completed::before {
  background: #2da65f;
}

.timeline-step.active::before {
  background: #3758d5;
}

.timeline-step p {
  margin: 0;
  color: #535c79;
}

.timeline-step.completed p {
  color: #1f7f47;
}

.timeline-step.active p {
  color: #2f4bc0;
  font-weight: 600;
}

.empty-box {
  margin-top: 0.75rem;
  border: 1px dashed #d7deef;
  border-radius: 10px;
  padding: 0.85rem;
  color: #6d7693;
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

.form-group {
  margin-bottom: 0.8rem;
}

@media (max-width: 991px) {
  .workspace-layout {
    grid-template-columns: 1fr;
  }

  .workspace-side .sticky {
    position: static;
  }
}
</style>
