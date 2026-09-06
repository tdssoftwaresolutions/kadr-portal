<template>
  <div>
    <Alert :message="alert.message" :type="alert.type" v-model="alert.visible" :timeout="alert.timeout"></Alert>
    <Spinner :isVisible="loading" />

    <case-workspace-layout
      :has-cases="myCases.length > 0"
      :title="workspaceTitle"
      :subtitle="workspaceSubtitle"
      :tabs="caseTabs"
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
          <small>{{ caseItem.case_statuses?.name || $t('mediatorCases.unknownStatus') }}</small>
        </button>
      </template>

      <template #tab-overview>
        <div class="quick-info-grid">
          <article class="info-card">
            <label>{{ $t('mediatorCases.caseIdLabel') }}</label>
            <strong>{{ selectedCase.caseId || '-' }}</strong>
          </article>
          <article class="info-card">
            <label>{{ $t('mediatorCases.statusLabel') }}</label>
            <strong class="status-chip" :class="statusBadgeClass">{{ selectedCase.case_statuses?.name || '-' }}</strong>
          </article>
          <article class="info-card">
            <label>{{ $t('mediatorCases.subStatusLabel') }}</label>
            <strong>{{ selectedCase.case_sub_statuses?.name || '-' }}</strong>
          </article>
          <article class="info-card">
            <label>{{ $t('mediatorCases.filedOnLabel') }}</label>
            <strong>{{ formatDateTime(selectedCase.created_at) }}</strong>
          </article>
          <article class="info-card">
            <label>{{ $t('mediatorCases.typeLabel') }}</label>
            <strong>{{ selectedCase.case_type || '-' }}</strong>
          </article>
          <article class="info-card">
            <label>{{ $t('mediatorCases.categoryLabel') }}</label>
            <strong>{{ selectedCase.category || '-' }}</strong>
          </article>
        </div>

        <section class="info-card">
          <label>{{ $t('mediatorCases.caseDescriptionLabel') }}</label>
          <strong>
            {{ selectedCase.description || $t('mediatorCases.noDescription') }}
          </strong>
        </section>

        <section v-if="!isPastView" class="section-card action-required-section">
          <div class="section-head">
            <h5>
              <i class="fas fa-exclamation-circle section-icon"></i>
              {{ $t('mediatorCases.actionRequiredHeading') }}
            </h5>
            <small>{{ $t('mediatorCases.actionRequiredSubtitle') }}</small>
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
            :description="$t('mediatorCases.noActionRequired')"
          />
        </section>

        <section v-if="!isPastView" class="section-card">
          <div class="section-head">
            <h5>{{ $t('mediatorCases.mediatorActionsHeading') }}</h5>
            <small>{{ $t('mediatorCases.mediatorActionsSubtitle') }}</small>
          </div>
          <div class="action-grid">
            <article class="action-card primary">
              <h6><i class="fas fa-calendar-plus action-card-icon"></i> {{ $t('mediatorCases.scheduleMeetingCardTitle') }}</h6>
              <p>{{ $t('mediatorCases.scheduleMeetingCardBody') }}</p>
              <button class="btn btn-sm btn-light" @click="openMeetingModal">{{ $t('mediatorCases.createMeetingButton') }}</button>
            </article>
            <article class="action-card warning">
              <h6><i class="fas fa-flag-checkered action-card-icon"></i>{{ $t('mediatorCases.closeCaseCardTitle') }}</h6>
              <p>{{ $t('mediatorCases.closeCaseCardBody') }}</p>
              <button class="btn btn-sm btn-primary" @click="applyWorkflowStatus">{{ $t('mediatorCases.closeCaseButton') }}</button>
            </article>
          </div>
        </section>
      </template>

      <template #tab-parties>
        <section class="section-card">
          <div class="section-head">
            <h5>{{ $t('mediatorCases.partiesHeading') }}</h5>
            <small>{{ $t('mediatorCases.partiesSubtitle') }}</small>
          </div>
          <div class="party-grid">
            <article class="party-card">
              <h6>{{ $t('mediatorCases.firstPartyHeading') }}</h6>
              <p><span>{{ $t('mediatorCases.nameLabel') }}</span>{{ selectedCase.user_cases_first_partyTouser?.name || '-' }}</p>
              <p><span>{{ $t('mediatorCases.emailLabel') }}</span>{{ selectedCase.user_cases_first_partyTouser?.email || '-' }}</p>
              <p><span>{{ $t('mediatorCases.phoneLabel') }}</span>{{ selectedCase.user_cases_first_partyTouser?.phone_number || '-' }}</p>
              <template v-if="selectedCase.user_cases_first_party_repTouser">
                <p><span>{{ $t('mediatorCases.representativeLabel') }}</span>{{ selectedCase.user_cases_first_party_repTouser.name || '-' }}</p>
                <p v-if="selectedCase.user_cases_first_party_repTouser.email"><span>{{ $t('mediatorCases.repEmailLabel') }}</span>{{ selectedCase.user_cases_first_party_repTouser.email }}</p>
              </template>
            </article>
            <article class="party-card">
              <h6>{{ $t('mediatorCases.secondPartyHeading') }}</h6>
              <p><span>{{ $t('mediatorCases.nameLabel') }}</span>{{ selectedCase.user_cases_second_partyTouser?.name || '-' }}</p>
              <p><span>{{ $t('mediatorCases.emailLabel') }}</span>{{ selectedCase.user_cases_second_partyTouser?.email || '-' }}</p>
              <p><span>{{ $t('mediatorCases.phoneLabel') }}</span>{{ selectedCase.user_cases_second_partyTouser?.phone_number || '-' }}</p>
              <template v-if="selectedCase.user_cases_second_party_repTouser">
                <p><span>{{ $t('mediatorCases.representativeLabel') }}</span>{{ selectedCase.user_cases_second_party_repTouser.name || '-' }}</p>
                <p v-if="selectedCase.user_cases_second_party_repTouser.email"><span>{{ $t('mediatorCases.repEmailLabel') }}</span>{{ selectedCase.user_cases_second_party_repTouser.email }}</p>
              </template>
            </article>
          </div>
        </section>

      </template>

      <template #tab-documents>
        <section class="section-card documents-section">
          <div class="section-head">
            <h5>{{ $t('mediatorCases.documentsHeading') }}</h5>
            <small>{{ $t('mediatorCases.documentsSubtitle') }}</small>
          </div>
          <div v-if="selectedCase.evidence_document_url" class="docs-grid">
            <FilePreview
              :key="selectedCase.evidence_document_url"
              :url="selectedCase.evidence_document_url"
              :name="$t('mediatorCases.evidenceDocumentName')"
            />
          </div>
          <kadr-empty-state
            v-else
            compact
            icon=""
            :description="$t('mediatorCases.noDocuments')"
          />
        </section>
      </template>

      <template #tab-meetings>
        <section class="section-card">
          <div class="section-head">
            <h5>{{ $t('mediatorCases.meetingsHeading') }}</h5>
            <small>{{ $t('mediatorCases.meetingsSubtitle') }}</small>
          </div>
          <div v-if="caseMeetingsSorted.length" class="meeting-list">
            <article v-for="meeting in caseMeetingsSorted" :key="meeting.id" class="meeting-item">
              <div class="meeting-item-body">
                <div class="meeting-badges">
                  <span class="badge-soft" :class="meetingPast(meeting) ? 'badge-past' : 'badge-upcoming'">
                    {{ meetingPast(meeting) ? $t('mediatorCases.badgePast') : $t('mediatorCases.badgeUpcoming') }}
                  </span>
                </div>
                <h6>{{ meeting.title || $t('mediatorCases.meetingTitleFallback', { caseId: selectedCase.caseId }) }}</h6>
                <p>{{ formatDateTime(meeting.start_datetime || meeting.startDate) }}</p>
                <div v-if="meetingPast(meeting) && isKadrMeeting(meeting)" class="feedback-summary">
                  <p v-if="meeting.meeting_summary && userId === selectedCase.user_cases_mediatorTouser?.id"><span>{{ $t('mediatorCases.summaryLabel') }}</span> {{ meeting.meeting_summary }}</p>
                  <p v-if="meeting.mediator_next_steps && userId === selectedCase.user_cases_mediatorTouser?.id"><span>{{ $t('mediatorCases.nextStepsLabel') }}</span> {{ meeting.mediator_next_steps }}</p>
                </div>
              </div>
              <div class="meeting-actions">
                <a
                  v-if="(meeting.meeting_link || meeting.meetingLink) && !meetingPast(meeting)"
                  :href="meeting.meeting_link || meeting.meetingLink"
                  target="_blank"
                  class="btn btn-outline-primary btn-sm"
                >
                  {{ $t('mediatorCases.joinButton') }}
                </a>
                <button
                  v-if="showMediatorFeedbackButton(meeting)"
                  type="button"
                  class="btn btn-warning btn-sm"
                  @click="openMeetingFeedbackModal(meeting)"
                >
                  {{ $t('mediatorCases.addMeetingNotesButton') }}
                </button>
              </div>
            </article>
          </div>
          <kadr-empty-state
            v-else
            compact
            icon=""
            :description="$t('mediatorCases.noMeetings')"
          />
        </section>
      </template>

      <template v-if="selectedCase.id" #side>
        <section class="section-card side-progress-card">
          <div class="section-head">
            <h5>{{ $t('mediatorCases.caseProgressHeading') }}</h5>
            <small>{{ $t('mediatorCases.caseProgressSubtitle') }}</small>
          </div>
          <CaseProgressPanel
            :progress="selectedCase.case_progress"
            :is-past-view="isPastView"
            @action="handleProgressAction"
          />
        </section>
        <section v-if="!isPastView" class="section-card note-card">
          <div class="section-head">
            <h5>{{ $t('mediatorCases.privateNotesHeading') }}</h5>
            <small>{{ $t('mediatorCases.privateNotesSubtitle') }}</small>
          </div>
          <textarea
            v-model="caseNote"
            class="note-input"
            :placeholder="$t('mediatorCases.notePlaceholder')"
          ></textarea>
          <div class="note-actions">
            <button type="button" class="btn btn-sm btn-primary" @click="saveCaseNote">{{ $t('mediatorCases.saveNoteButton') }}</button>
          </div>
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

     <b-modal
       size="xl"
       id="resolve-modal"
       v-model="showResolveModal"
       :title="$t('mediatorCases.resolveModalTitle')"
       no-footer
       :no-close-on-backdrop="resolveSubmitting"
       :no-close-on-esc="resolveSubmitting"
       :hide-header-close="resolveSubmitting"
     >
      <form @submit.prevent="submitResolve">
        <div class="form-group mb-3">
          <label>{{ $t('mediatorCases.resolveStatusLabel') }}</label>
          <div class="resolve-status-selector">
            <button
              type="button"
              :class="['resolve-status-btn', { active: resolveStatus === 'closed_success', success: resolveStatus === 'closed_success' }]"
              :aria-pressed="resolveStatus === 'closed_success'"
              @click="setResolveStatus('closed_success')"
            >
              {{ $t('mediatorCases.resolveStatusSuccess') }}
            </button>
            <button
              type="button"
              :class="['resolve-status-btn', { active: resolveStatus === 'closed_no_success', failed: resolveStatus === 'closed_no_success' }]"
              :aria-pressed="resolveStatus === 'closed_no_success'"
              @click="setResolveStatus('closed_no_success')"
            >
              {{ $t('mediatorCases.resolveStatusFailed') }}
            </button>
          </div>
        </div>
        <div class="form-group mb-3">
          <label>{{ $t('mediatorCases.agreedTermsLabel') }}</label>
          <editor v-model="resolveForm.agreementText" :init="options" license-key="gpl"></editor>
        </div>
        <div class="form-group mb-3">
          <label>{{ $t('mediatorCases.signatureLabel') }}</label>
          <div class="signature-type-selector">
            <button
              type="button"
              :class="{ active: signatureType === 'digital' }"
              @click="setSignatureType('digital')">
              {{ $t('mediatorCases.digitalSignatureButton') }}
            </button>
            <button
              type="button"
              :class="{ active: signatureType === 'manual' }"
              @click="setSignatureType('manual')">
              {{ $t('mediatorCases.manualSignatureButton') }}
            </button>
          </div>
          <div v-if="signatureType === 'digital'" class="digital-signature-box full-width">
            <span class="cursive-signature">{{ resolveUserInitials }}</span>
          </div>
          <div v-else-if="signatureType === 'manual'" class="manual-signature">
            <canvas ref="signaturePad" class="signature-canvas"></canvas>
            <button type="button" @click="clearResolveSignature" class="btn btn-secondary" style="margin: 0px;width: 100%;">
              {{ $t('mediatorCases.clearButton') }} <i class="ri-refresh-line"></i>
            </button>
          </div>
        </div>
        <div v-if="resolveConfirming" class="resolve-confirm-note" role="alert">
          <i class="fas fa-exclamation-triangle" aria-hidden="true"></i>
          <span>{{ $t('mediatorCases.resolveConfirmNote') }}</span>
        </div>
        <div class="text-end" style="margin-top: 24px; display: flex; gap: 16px; justify-content: flex-end;">
          <b-button
            variant="secondary"
            :disabled="resolveSubmitting"
            type="button"
            @click="resolveConfirming ? cancelResolveConfirm() : (showResolveModal = false)"
          >
            {{ resolveConfirming ? $t('mediatorCases.goBackButton') : $t('mediatorCases.cancelButton') }}
          </b-button>
          <b-button v-if="!resolveConfirming" type="submit" variant="primary" :disabled="resolveSubmitting">
            {{ $t('mediatorCases.closeCaseButton') }}
          </b-button>
          <b-button v-else type="button" variant="danger" :disabled="resolveSubmitting" @click="confirmResolve">
            <kadr-spinner v-if="resolveSubmitting" size="sm" class="me-2" />
            {{ resolveSubmitting ? $t('mediatorCases.closingCaseButton') : $t('mediatorCases.confirmCloseButton') }}
          </b-button>
        </div>
      </form>
    </b-modal>

    <b-modal
      size="lg"
      id="schedule-meeting-modal"
      v-model="showScheduleMeetingModal"
      :title="$t('mediatorCases.scheduleMeetingModalTitle')"
      @ok="submitMeeting"
      scrollable
    >
      <div class="data-row">
        <div class="col-12">
          <div class="data-title">{{ $t('mediatorCases.meetingTitleLabel') }}</div>
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
          <div class="data-title">{{ $t('mediatorCases.meetingDescriptionLabel') }}</div>
          <b-form-textarea
            id="textarea"
            v-model="meetingForm.description"
            :placeholder="$t('mediatorCases.meetingDescriptionPlaceholder')"
            rows="3"
            class="form-control"
            max-rows="6"
          ></b-form-textarea>
        </div>
      </div>
      <div class="data-row">
        <div class="col-12">
            <div class="data-title">{{ $t('mediatorCases.meetingDateTimeLabel') }}</div>
            <kadr-date-time-picker
              id="appointment-datetime"
              v-model="meetingForm.start"
              min-date="today"
              :placeholder="$t('mediatorCases.meetingDateTimePlaceholder')"
            />
        </div>
      </div>
    </b-modal>

    <MeetingFeedbackModal
      v-model="feedbackModalVisible"
      modal-id="mediator-meeting-feedback"
      role="mediator"
      :event-title="feedbackEvent && feedbackEvent.title"
      :case-label="selectedCase.caseId ? $t('mediatorCases.caseLabel', { caseId: selectedCase.caseId }) : ''"
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
    workspaceTitle () {
      return this.isPastView ? CASES.PAST_TITLE : this.$t('mediatorCases.workspaceTitle')
    },
    workspaceSubtitle () {
      return this.isPastView
        ? CASES.PAST_SUBTITLE
        : this.$t('mediatorCases.workspaceSubtitle')
    },
    emptyTitle () {
      return this.isPastView ? this.$t('mediatorCases.emptyTitlePast') : this.$t('mediatorCases.emptyTitleActive')
    },
    emptyDescription () {
      return this.isPastView
        ? this.$t('mediatorCases.emptyDescriptionPast')
        : this.$t('mediatorCases.emptyDescriptionActive')
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
    caseTabs () {
      return [
        { key: 'overview', label: this.$t('mediatorCases.overviewTab'), icon: 'fas fa-clipboard-list' },
        { key: 'parties', label: this.$t('mediatorCases.partiesTab'), icon: 'fas fa-users' },
        { key: 'documents', label: this.$t('mediatorCases.documentsTab'), icon: 'fas fa-folder-open', badge: this.selectedCase.evidence_document_url ? 1 : null },
        { key: 'meetings', label: this.$t('mediatorCases.meetingsTab'), icon: 'fas fa-calendar-day', badge: this.caseMeetingsSorted.length || null }
      ]
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
          title: this.$t('mediatorCases.postMeetingNotesTitle'),
          description: this.$t('mediatorCases.postMeetingNotesDescription', {
            title: ev.title || this.$t('mediatorCases.sessionFallback'),
            dateTime: this.formatDateTime(ev.start_datetime)
          }),
          buttonText: this.$t('mediatorCases.addMeetingNotesButton'),
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
    // Validate the form, then ask for explicit confirmation before the
    // irreversible close. The actual submit happens in confirmResolve().
    submitResolve () {
      if (this.signatureType === 'manual') {
        if (this.signaturePad && !this.signaturePad.isEmpty()) this.resolveForm.signature = this.signaturePad.toDataURL()
        else return this.showAlert(this.$t('mediatorCases.manualSignatureRequired'), 'danger')
      } else this.resolveForm.signature = this.resolveUserInitials

      if (!this.resolveForm.agreementText.trim()) return this.showAlert(this.$t('mediatorCases.agreementTextRequired'), 'danger')

      this.resolveConfirming = true
    },
    cancelResolveConfirm () {
      this.resolveConfirming = false
    },
    async confirmResolve () {
      const payload = {
        caseId: this.resolveForm.caseId,
        resolveStatus: this.resolveStatus,
        agreementText: this.resolveForm.agreementText,
        signature: this.resolveForm.signature
      }
      this.resolveSubmitting = true
      try {
        const response = await this.$store.dispatch('markCaseResolved', payload)
        if (response.success) {
          this.showAlert(response.message || this.$t('mediatorCases.caseClosedSuccess'), 'success')
          this.resolveConfirming = false
          this.showResolveModal = false
          if (this.paginatedData && this.paginatedData.casesWithEvents) {
            this.paginatedData.casesWithEvents = this.paginatedData.casesWithEvents.filter(
              c => c.id !== this.resolveForm.caseId
            )
            if (typeof this.paginatedData.total === 'number') this.paginatedData.total = Math.max(0, this.paginatedData.total - 1)
          }
        } else {
          // Drop back to the editable form so the mediator can retry/adjust.
          this.resolveConfirming = false
          this.showAlert(response.message || this.$t('mediatorCases.caseCloseFailed'), 'danger')
        }
      } finally {
        this.resolveSubmitting = false
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
        title: this.selectedCase.caseId
          ? this.$t('mediatorCases.defaultMeetingTitle', { caseId: this.selectedCase.caseId })
          : this.$t('mediatorCases.defaultMeetingTitleFallback'),
        start: '',
        description: this.getDefaultMeetingDescription()
      }
      this.showScheduleMeetingModal = true
    },
    getDefaultMeetingDescription () {
      return this.$t('mediatorCases.defaultMeetingDescription', {
        caseId: this.selectedCase.caseId || '-',
        firstParty: this.selectedCase.user_cases_first_partyTouser?.name || '-',
        secondParty: this.selectedCase.user_cases_second_partyTouser?.name || '-'
      })
    },
    async submitMeeting (event) {
      // Keep the modal open by default; we close it explicitly via v-model only
      // on success. (bootstrap-vue-next resolves the ok event synchronously, so
      // calling preventDefault() after an await is unreliable.)
      if (event && typeof event.preventDefault === 'function') {
        event.preventDefault()
      }
      if (!this.meetingForm.start) {
        this.showAlert(this.$t('mediatorCases.selectMeetingDateTime'), 'danger')
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
          color: '#5a4bd4',
          caseId: this.selectedCase.id,
          description: this.meetingForm.description,
          type: 'kadr',
          caseNumber: this.selectedCase.caseId
        }
        const response = await this.$store.dispatch('newCalendarEvent', { event: payload })
        if (response.success || !response.error) {
          this.showAlert(this.$t('mediatorCases.meetingScheduledSuccess'), 'success')
          this.showScheduleMeetingModal = false
          this.$emit('refresh-dashboard')
        } else {
          this.showAlert(response.message || this.$t('mediatorCases.meetingScheduleFailed'), 'danger')
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
      this.resolveConfirming = false
      this.showResolveModal = true
      this.$nextTick(() => {
        if (this.signatureType === 'manual') {
          this.initializeSignaturePad()
        }
      })
    },
    async loadCaseNote () {
      this.caseNote = ''
      this.caseNoteId = null
      if (!this.selectedCase?.id) return
      const requestedCaseId = this.selectedCase.id
      const note = await this.$store.dispatch('getCaseNote', { caseId: requestedCaseId })
      // Guard against a stale response if the mediator switched cases meanwhile.
      if (this.selectedCase?.id !== requestedCaseId) return
      if (note) {
        this.caseNote = note.note_text || ''
        this.caseNoteId = note.id || null
      }
    },
    async saveCaseNote () {
      if (!this.selectedCase?.id) return
      const response = await this.$store.dispatch('saveNote', {
        content: this.caseNote || '',
        id: this.caseNoteId || undefined,
        case_id: this.selectedCase.id
      })
      if (response && response.success !== false) {
        if (response.data?.noteId) this.caseNoteId = response.data.noteId
        this.showAlert(this.$t('mediatorCases.caseNoteSaved'), 'success')
      }
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
      try {
        const res = await this.$store.dispatch('submitMeetingFeedback', body)
        if (res.success) {
          this.feedbackModalVisible = false
          this.$emit('refresh-dashboard')
        }
      } finally {
        this.feedbackSubmitting = false
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
          'autosave lists link image table media fullscreen preview',
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
                ref.showAlert(ref.$t('mediatorCases.fileSizeExceeds', { size: maxFileSizeMB }), 'danger')
                ref.loading = false
                return
              }
              const reader = new FileReader()
              reader.onload = function (e) {
                callback(e.target.result, { alt: file.name })
                ref.loading = false
              }
              reader.onerror = function () {
                ref.showAlert(ref.$t('mediatorCases.fileLoadFailed'), 'danger')
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
      caseNoteId: null,
      meetingForm: {
        title: '',
        start: '',
        description: ''
      },
      showScheduleMeetingModal: false,
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
      resolveConfirming: false,
      resolveSubmitting: false,
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
  background-color: var(--kadr-primary-soft);
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
  background-color: var(--kadr-primary-soft);
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
  background-color: var(--kadr-primary-soft);
}

.resolve-confirm-note {
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
  margin-top: 1.25rem;
  padding: 0.7rem 0.9rem;
  border-radius: var(--kadr-radius);
  background: var(--kadr-status-warning-bg);
  border: 1px solid var(--kadr-status-warning-bg);
  color: var(--kadr-status-warning-text);
  font-size: 0.88rem;
  line-height: 1.4;
}

.resolve-confirm-note i {
  margin-top: 0.1rem;
  flex-shrink: 0;
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
  background: var(--kadr-status-info-bg);
  color: var(--kadr-status-info-text);
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
