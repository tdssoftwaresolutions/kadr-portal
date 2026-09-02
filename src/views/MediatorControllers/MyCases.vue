<template>
  <div>
    <Alert :message="alert.message" :type="alert.type" v-model="alert.visible" :timeout="alert.timeout"></Alert>
    <Spinner :isVisible="loading" />

    <case-workspace-layout
      :has-cases="myCases.length > 0"
      :title="workspaceTitle"
      :subtitle="workspaceSubtitle"
      :empty-title="emptyTitle"
      :empty-description="emptyDescription"
    >
      <template v-if="myCases.length > 1" #selector>
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
      </template>

      <template #main>
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

        <section class="info-card">
          <label>Case Description</label>
          <strong>
            {{ selectedCase.description || 'No description provided for this case.' }}
          </strong>
        </section>

        <section v-if="!isPastView" class="section-card action-required-section">
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
          <kadr-empty-state
            v-else
            compact
            icon=""
            description="No immediate action is required for this case."
          />
        </section>

        <section v-if="!isPastView" class="section-card">
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
              <button class="btn btn-sm btn-primary" @click="applyWorkflowStatus">Apply</button>
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
            <h5>Documents</h5>
            <small>Access case files and supporting documents directly from here.</small>
          </div>
          <div v-if="selectedCase.evidence_document_url" class="docs-grid">
            <FilePreview
              :key="selectedCase.evidence_document_url"
              :url="selectedCase.evidence_document_url"
              name="Evidence Document"
            />
          </div>
          <kadr-empty-state
            v-else
            compact
            icon=""
            :description="CASES.NO_DOCUMENTS"
          />
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
          <kadr-empty-state
            v-else
            compact
            icon=""
            :description="CASES.NO_MEETING"
          />
        </section>
      </template>

      <template v-if="selectedCase.id" #side>
        <section class="section-card side-progress-card">
          <div class="section-head">
            <h5>Case progress</h5>
            <small>Current stage, coming up, and activity.</small>
          </div>
          <CaseProgressPanel
            :progress="selectedCase.case_progress"
            :is-past-view="isPastView"
            @action="handleProgressAction"
          />
        </section>
        <section v-if="showCorrespondencePanel" class="section-card side-correspondence-card">
          <CaseCorrespondencePanel
            embedded
            variant="sidebar"
            :case-id="selectedCase.id"
            :user-id="userId"
            user-type="MEDIATOR"
            mode="mediator"
            :has-mediator="true"
            :read-only="isPastView"
          />
        </section>
      </template>
    </case-workspace-layout>

     <b-modal size="xl" id="resolve-modal" v-model="showResolveModal" title="Mark Case as Resolved" hide-footer>
      <form @submit.prevent="submitResolve">
        <div class="form-group mb-3">
          <label>Status</label>
          <div class="resolve-status-selector">
            <button
              type="button"
              :class="['resolve-status-btn', { active: resolveStatus === 'closed_success', success: resolveStatus === 'closed_success' }]"
              @click="setResolveStatus('closed_success')"
            >
              Success
            </button>
            <button
              type="button"
              :class="['resolve-status-btn', { active: resolveStatus === 'closed_no_success', failed: resolveStatus === 'closed_no_success' }]"
              @click="setResolveStatus('closed_no_success')"
            >
              Failed
            </button>
          </div>
        </div>
        <div class="form-group mb-3">
          <label>Agreed terms</label>
          <editor v-model="resolveForm.agreementText" :init="options" license-key="gpl"></editor>
        </div>
        <div class="form-group mb-3">
          <label>Signature:</label>
          <div class="signature-type-selector">
            <button
              type="button"
              :class="{ active: signatureType === 'digital' }"
              @click="setSignatureType('digital')">
              Digital Signature
            </button>
            <button
              type="button"
              :class="{ active: signatureType === 'manual' }"
              @click="setSignatureType('manual')">
              Sign Manually
            </button>
          </div>
          <div v-if="signatureType === 'digital'" class="digital-signature-box full-width">
            <span class="cursive-signature">{{ resolveUserInitials }}</span>
          </div>
          <div v-else-if="signatureType === 'manual'" class="manual-signature">
            <canvas ref="signaturePad" class="signature-canvas"></canvas>
            <button type="button" @click="clearResolveSignature" class="btn btn-secondary" style="margin: 0px;width: 100%;">
              Clear <i class="ri-refresh-line"></i>
            </button>
          </div>
        </div>
        <div class="text-end" style="margin-top: 24px; display: flex; gap: 16px; justify-content: flex-end;">
          <b-button variant="secondary" @click="showResolveModal = false" type="button">Cancel</b-button>
          <b-button type="submit" variant="primary">Save</b-button>
        </div>
      </form>
    </b-modal>

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
            class="form-control"
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
            class="form-control"
            max-rows="6"
          ></b-form-textarea>
        </div>
      </div>
      <div class="data-row">
        <div class="col-12">
            <div class="data-title">Select Date and Time</div>
            <kadr-date-time-picker
              id="appointment-datetime"
              v-model="meetingForm.start"
              min-date="today"
              placeholder="Select date and time"
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
import FilePreview from '../../components/DocumentPreview.vue'
import MeetingFeedbackModal from '../../components/MeetingFeedbackModal.vue'
import CaseCorrespondencePanel from '../../components/CaseCorrespondencePanel.vue'
import CaseProgressPanel from '../../components/cases/CaseProgressPanel.vue'
import CaseWorkspaceLayout from '../../components/kadr/CaseWorkspaceLayout.vue'
import KadrEmptyState from '../../components/kadr/KadrEmptyState.vue'
import KadrDateTimePicker from '../../components/kadr/KadrDateTimePicker.vue'
import SignaturePad from 'signature_pad'
import '../../plugins/tinymce'
import Editor from '@tinymce/tinymce-vue'
import { CASES } from '../../constants/messages'

import {
  isPastKadrCaseMeeting,
  mediatorNeedsMeetingFeedback
} from '../../utils/meetingFeedback'

export default {
  name: 'MyCases',
  components: {
    Alert,
    Spinner,
    KadrDateTimePicker,
    FilePreview,
    MeetingFeedbackModal,
    editor: Editor,
    CaseCorrespondencePanel,
    CaseProgressPanel,
    CaseWorkspaceLayout,
    KadrEmptyState
  },
  props: {
    cases: {
      type: Object,
      required: true
    },
    userId: {
      type: String,
      default: ''
    },
    userName: {
      type: String,
      default: ''
    },
    isPastView: {
      type: Boolean,
      default: false
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
    CASES () {
      return CASES
    },
    workspaceTitle () {
      return this.isPastView ? CASES.PAST_TITLE : 'Mediator Case Workspace'
    },
    workspaceSubtitle () {
      return this.isPastView
        ? CASES.PAST_SUBTITLE
        : 'Switch between assigned cases, schedule meetings, track status and keep case-level notes.'
    },
    emptyTitle () {
      return this.isPastView ? 'No Past Mediations' : 'No Assigned Cases'
    },
    emptyDescription () {
      return this.isPastView
        ? 'No completed, cancelled, or failed mediation cases are available right now.'
        : 'Assigned mediator cases will appear here with complete case context and actions.'
    },
    resolveUserInitials () {
      // Use the mediator's name or fallback
      return (this.userName)
        .split(' ')
        .map((name) => name[0])
        .join('')
        .toUpperCase()
    },
    myCases () {
      return this.paginatedData.casesWithEvents || []
    },
    caseMeetingsSorted () {
      const list = [...(this.selectedCase.events || [])]
      return list.sort((a, b) => new Date(b.start_datetime) - new Date(a.start_datetime))
    },
    mediatorActionCards () {
      if (this.isPastView) return []
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
    statusBadgeClass () {
      const status = (this.selectedCase.case_statuses?.name || '').toLowerCase()
      if (status.includes('closed success')) return 'success'
      if (status.includes('closed failed')) return 'danger'
      if (status.includes('progress')) return 'warning'
      return 'secondary'
    },
    showCorrespondencePanel () {
      return !!(this.selectedCase.id && this.userId && this.selectedCase.mediator === this.userId)
    }
  },
  methods: {
    async submitResolve () {
      if (this.signatureType === 'manual') {
        if (this.signaturePad && !this.signaturePad.isEmpty()) this.resolveForm.signature = this.signaturePad.toDataURL()
        else return this.showAlert('Please provide a manual signature.', 'danger')
      } else this.resolveForm.signature = this.resolveUserInitials

      if (!this.resolveForm.agreementText.trim()) return this.showAlert('Please enter what both parties agreed.', 'danger')
      const payload = {
        caseId: this.resolveForm.caseId,
        resolveStatus: this.resolveStatus,
        agreementText: this.resolveForm.agreementText,
        signature: this.resolveForm.signature
      }
      const response = await this.$store.dispatch('markCaseResolved', payload)
      if (response.success) {
        this.showAlert(response.message, 'success')
        this.showResolveModal = false
        if (this.paginatedData && this.paginatedData.casesWithEvents) {
          this.paginatedData.casesWithEvents = this.paginatedData.casesWithEvents.filter(
            c => c.id !== this.resolveForm.caseId
          )
          if (typeof this.paginatedData.total === 'number') this.paginatedData.total = Math.max(0, this.paginatedData.total - 1)
        }
      }
    },
    setResolveStatus (status) {
      this.resolveStatus = status
    },
    setSignatureType (type) {
      this.signatureType = type
      if (type === 'manual') {
        this.$nextTick(() => {
          this.initializeSignaturePad()
        })
      }
    },
    initializeSignaturePad () {
      this.$nextTick(() => {
        const canvas = this.$refs.signaturePad
        if (!canvas) return
        this.adjustCanvasSize(canvas)
        this.signaturePad = new SignaturePad(canvas, {
          backgroundColor: 'rgb(255, 255, 255)',
          penColor: 'rgb(0, 0, 0)'
        })
      })
    },
    adjustCanvasSize (canvas) {
      if (!canvas) return
      const ratio = Math.max(window.devicePixelRatio || 1, 1)
      if (canvas.offsetWidth && canvas.offsetHeight) {
        canvas.width = canvas.offsetWidth * ratio
        canvas.height = canvas.offsetHeight * ratio
        canvas.getContext('2d').scale(ratio, ratio)
      }
    },
    clearResolveSignature () {
      if (this.signaturePad) {
        this.signaturePad.clear()
      }
    },
    selectCase (caseItem) {
      this.selectedCase = caseItem
    },
    handleProgressAction (actionKey) {
      if (actionKey === 'schedule_meeting') {
        this.openMeetingModal()
        return
      }
      if (actionKey === 'join_meeting') {
        const link = this.selectedCase.case_progress?.now?.meetingLink
        if (link) window.open(link, '_blank', 'noopener')
      }
    },
    formatDateTime (dateString) {
      return this.$formatDateTime(dateString)
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
          this.$emit('refresh-dashboard')
        } else {
          this.showAlert(response.message || 'Unable to schedule meeting.', 'danger')
          event.preventDefault()
        }
      } finally {
        this.loading = false
      }
    },
    applyWorkflowStatus () {
      this.resolveForm = {
        bothAgreed: true,
        agreementText: '',
        signature: '',
        caseId: this.selectedCase.id
      }
      this.signatureType = 'digital'
      this.resolveStatus = 'closed_success'
      this.showResolveModal = true
      this.$nextTick(() => {
        if (this.signatureType === 'manual') {
          this.initializeSignaturePad()
        }
      })
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
      if (this.isPastView) return false
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
      options: {
        // Self-hosted TinyMCE 5 (skin CSS imported in src/plugins/tinymce.js).
        skin: false,
        content_css: false,
        height: 400,
        plugins: [
          'autosave lists link image table media fullscreen color preview',
          'paste charmap hr anchor insertdatetime wordcount'
        ],
        toolbar: [
          'undo redo | formatselect | fontselect fontsizeselect | bold italic underline strikethrough |',
          'forecolor backcolor | alignleft aligncenter alignright alignjustify |',
          'bullist numlist outdent indent | table | link image media | fullscreen preview | restoredraft'
        ].join(' '),
        menubar: 'file edit view insert format tools table help',
        branding: false,
        image_title: true,
        automatic_uploads: true,
        autosave_interval: '20s',
        autosave_retention: '30m',
        file_picker_types: 'image',
        file_picker_callback: (callback, value, meta) => {
          const ref = this
          if (meta.filetype === 'image') {
            ref.loading = true
            const input = document.createElement('input')
            input.setAttribute('type', 'file')
            input.setAttribute('accept', 'image/*')
            input.onchange = function () {
              const file = input.files[0]
              const maxFileSizeMB = 1
              const maxFileSizeBytes = maxFileSizeMB * 1024 * 1024
              if (file.size > maxFileSizeBytes) {
                ref.showAlert(`The file size exceeds the ${maxFileSizeMB} MB limit.`, 'danger')
                ref.loading = false
                return
              }
              const reader = new FileReader()
              reader.onload = function (e) {
                callback(e.target.result, { alt: file.name })
                ref.loading = false
              }
              reader.onerror = function () {
                ref.showAlert('Failed to load the file. Please try again.', 'danger')
                ref.loading = false
              }
              reader.readAsDataURL(file)
            }
            input.click()
          }
        },
        media_live_embeds: true,
        setup: function (editor) {
          editor.addShortcut('ctrl+s', 'Save', function () {
          })
        },
        image_caption: true,
        image_dimensions: true,
        media_alt_source: true,
        media_poster: true,
        spellchecker_dialog: true,
        browser_spellcheck: true,
        contextmenu: false,
        content_style: `
          body {
            font-family: Arial, Helvetica, sans-serif;
            font-size: 14px;
            line-height: 1.6;
          }
        `,
        wordcount_countregex: /[\w\u2019\x27-]+/g,
        wordcount_cleanregex: /<\/?[a-z][^>]*>/g
      },
      selectedCase: {},
      selectedWorkflowStatus: 'Case Review',
      workflowStatusOptions: ['Closed - Mediation Successful', 'Closed - Mediation Unsuccessful'],
      caseNote: '',
      meetingForm: {
        title: '',
        start: '',
        description: ''
      },
      paginatedData: {},
      signatureType: 'digital',
      feedbackModalVisible: false,
      feedbackEvent: null,
      feedbackSubmitting: false,
      alert: {
        visible: false,
        message: '',
        timeout: 5000,
        type: 'primary'
      },
      showResolveModal: false,
      resolveForm: {
        bothAgreed: true,
        agreementText: '',
        signature: '',
        caseId: null
      },
      loading: false,
      resolveStatus: 'closed_success',
      resolveSignaturePad: null
    }
  }
}
</script>
<style scoped>
.signature-type-selector {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
}

.signature-type-selector button {
  padding: 8px 15px;
  border: 1px solid var(--kadr-border-strong);
  border-radius: var(--kadr-radius-sm);
  background-color: var(--kadr-surface-muted);
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.3s, color 0.3s;
  color: var(--kadr-text-primary);
}

.signature-type-selector button.active {
  background-color: var(--kadr-primary);
  color: var(--kadr-text-on-primary);
  border-color: var(--kadr-primary);
}

.signature-type-selector button:hover {
  background-color: #d9e6f2;
}

.signature-btn {
  padding: 8px 15px;
  border: 1px solid var(--kadr-border-strong);
  border-radius: var(--kadr-radius-sm);
  background-color: var(--kadr-surface-muted);
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.3s, color 0.3s;
  color: var(--kadr-text-primary);
}

.signature-btn.active {
  background-color: var(--kadr-primary);
  color: var(--kadr-text-on-primary);
  border-color: var(--kadr-primary);
}

.signature-btn:hover {
  background-color: #d9e6f2;
}

.digital-signature-box {
  border: 1px solid var(--kadr-border-strong);
  width: 100%;
  height: 150px;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 10px;
  text-align: center;
}

.digital-signature-box.full-width {
  width: 100%;
}

.cursive-signature {
  font-family: Cursive;
  font-size: 24px;
  color: var(--kadr-primary);
}

.manual-signature {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.signature-canvas {
  border: 1px solid var(--kadr-border-strong);
  width: 100%;
  height: 150px;
  margin-top: 10px;
  cursor: crosshair;
}

.resolve-status-selector {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
}

.resolve-status-btn {
  padding: 8px 15px;
  border: 1px solid var(--kadr-border-strong);
  border-radius: var(--kadr-radius-sm);
  background-color: var(--kadr-surface-muted);
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.3s, color 0.3s;
  color: var(--kadr-text-primary);
}

.resolve-status-btn.active.success {
  background-color: var(--kadr-success);
  color: var(--kadr-text-on-primary);
  border-color: var(--kadr-success);
}

.resolve-status-btn.active.failed {
  background-color: var(--kadr-danger);
  color: var(--kadr-text-on-primary);
  border-color: var(--kadr-danger);
}

.resolve-status-btn:hover {
  background-color: #d9e6f2;
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

.data-title {
  font-weight: bold;
}

.data-row {
  display: flex;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px solid var(--kadr-border);
}

.side-progress-card {
  padding: 0.85rem 0.9rem;
}

.side-progress-card :deep(.case-progress-activity-list) {
  max-height: 220px;
}

.side-correspondence-card {
  padding: 0.65rem 0.75rem;
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
  border: 1px solid var(--kadr-border-strong);
  border-radius: var(--kadr-radius);
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
  background: var(--kadr-surface-muted);
  border: 1px solid var(--kadr-border-info);
  border-radius: var(--kadr-radius-md);
  padding: 0.8rem;
}

.party-card p {
  margin: 0.3rem 0;
  display: flex;
  justify-content: space-between;
  gap: 0.6rem;
  color: var(--kadr-text-primary);
}

.party-card p span {
  color: var(--kadr-text-muted);
}

.meeting-list {
  margin-top: 0.75rem;
  display: grid;
  gap: 0.65rem;
}

.meeting-item {
  border: 1px solid var(--kadr-border-info);
  border-radius: var(--kadr-radius-md);
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
  color: var(--kadr-text-muted);
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
  border-radius: var(--kadr-radius-sm);
}

.badge-past {
  background: var(--kadr-status-secondary-bg);
  color: var(--kadr-text-muted);
}

.badge-upcoming {
  background: #e8f2ff;
  color: var(--kadr-accent);
}

.feedback-summary {
  margin-top: 0.5rem;
  font-size: 0.86rem;
  color: var(--kadr-text-primary);
}

.feedback-summary p {
  margin: 0.2rem 0;
}

.feedback-summary span {
  color: var(--kadr-text-muted);
  font-weight: 600;
  margin-right: 0.35rem;
}

.meeting-actions {
  display: flex;
  gap: 0.45rem;
  flex-wrap: wrap;
  align-items: center;
}

.timeline {
  margin-top: 0.8rem;
  border-left: 2px solid var(--kadr-border-strong);
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
  background: var(--kadr-border-strong);
}

.timeline-step.completed::before {
  background: var(--kadr-success);
}

.timeline-step.active::before {
  background: var(--kadr-accent);
}

.timeline-step p {
  margin: 0;
  color: var(--kadr-text-muted);
}

.timeline-step.completed p {
  color: var(--kadr-status-success-text);
}

.timeline-step.active p {
  color: var(--kadr-accent);
  font-weight: 600;
}

.form-group {
  margin-bottom: 0.8rem;
}
</style>
