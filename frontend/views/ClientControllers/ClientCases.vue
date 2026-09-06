<template>
  <div>
    <Alert :message="alert.message" :type="alert.type" v-model="alert.visible" :timeout="alert.timeout"></Alert>
    <case-workspace-layout
      :has-cases="myCases.length > 0"
      :title="workspaceTitle"
      :subtitle="workspaceSubtitle"
      :tabs="caseTabs"
      :empty-action-label="canInitiateCase ? $t('clientCases.createCta') : ''"
      @empty-action="openInitiateCaseModal"
    >
      <template v-if="canInitiateCase" #head-extra>
        <button type="button" class="btn btn-primary btn-sm mt-2" @click="openInitiateCaseModal">
          {{ $t('clientCases.createCta') }}
        </button>
      </template>

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
          <small>{{ caseItem.case_statuses?.name || $t('clientCases.unknown') }}</small>
        </button>
      </template>

      <template #tab-overview>
        <div v-if="selectedCase.case_progress && selectedCase.case_progress.isRepresentative" class="representative-banner">
          <i class="ri-user-shared-line" aria-hidden="true"></i>
          <span v-html="$t('clientCases.representativeBanner', { side: selectedCase.case_progress.representingSide === 'second_party' ? $t('clientCases.secondPartyLower') : $t('clientCases.firstPartyLower') })"></span>
        </div>
        <div class="quick-info-grid">
          <article class="info-card">
            <label>{{ $t('clientCases.caseIdLabel') }}</label>
            <strong>{{ selectedCase.caseId || '-' }}</strong>
          </article>
          <article class="info-card">
            <label>{{ $t('clientCases.statusLabel') }}</label>
            <strong class="status-chip" :class="statusBadgeClass">
              {{ selectedCase.case_statuses?.name || '-' }}
            </strong>
          </article>
          <article class="info-card">
            <label>{{ $t('clientCases.subStatusLabel') }}</label>
            <strong>{{ selectedCase.case_sub_statuses?.name || '-' }}</strong>
          </article>
          <article class="info-card">
            <label>{{ $t('clientCases.filedOnLabel') }}</label>
            <strong>{{ formatDateTime(selectedCase.created_at) }}</strong>
          </article>
          <article class="info-card">
            <label>{{ $t('clientCases.caseTypeLabel') }}</label>
            <strong>{{ selectedCase.case_type || $t('clientCases.awaitingType') }}</strong>
          </article>
          <article class="info-card">
            <label>{{ $t('clientCases.categoryLabel') }}</label>
            <strong>{{ selectedCase.category || '-' }}</strong>
          </article>
        </div>

        <section class="info-card">
          <label>{{ $t('clientCases.caseDescriptionLabel') }}</label>
          <strong>
            {{ selectedCase.description || $t('clientCases.noDescription') }}
          </strong>
        </section>

        <section v-if="!isPastView" class="section-card action-required-section">
          <div class="section-head">
            <h5>
              <i class="fas fa-exclamation-circle section-icon"></i>
              {{ $t('clientCases.actionRequired') }}
            </h5>
            <small>{{ $t('clientCases.actionRequiredSubtitle') }}</small>
          </div>
          <div v-if="actionCards.length" class="action-grid">
            <article v-for="item in actionCards" :key="item.key" class="action-card" :class="item.variant">
              <h6>
                <i class="fas fa-angle-right action-card-icon"></i>
                {{ item.title }}
              </h6>
              <p>{{ item.description }}</p>
              <button
                class="btn btn-sm btn-light"
                :disabled="item.loading"
                @click="item.action"
              >
                <kadr-spinner v-if="item.loading" size="sm" class="me-2" />
                {{ item.buttonText }}
              </button>
            </article>
          </div>
          <kadr-empty-state
            v-else
            compact
            :description="$t('clientCases.noActionRequired')"
          />
        </section>
      </template>

      <template #tab-parties>
        <section class="section-card">
          <div class="section-head">
            <h5>{{ $t('clientCases.parties') }}</h5>
            <small>{{ $t('clientCases.partiesSubtitle') }}</small>
          </div>
          <div class="party-grid">
            <article class="party-card">
              <h6>{{ $t('clientCases.firstParty') }} <span v-if="selectedCase.user_cases_first_partyTouser?.id === userid" class="badge-you">{{ $t('clientCases.you') }}</span></h6>
              <p><span>{{ $t('clientCases.nameLabel') }}</span>{{ selectedCase.user_cases_first_partyTouser?.name || '-' }}</p>
              <p><span>{{ $t('clientCases.emailLabel') }}</span>{{ selectedCase.user_cases_first_partyTouser?.email || '-' }}</p>
              <p><span>{{ $t('clientCases.phoneLabel') }}</span>{{ selectedCase.user_cases_first_partyTouser?.phone_number || '-' }}</p>
              <p v-if="selectedCase.user_cases_first_party_repTouser?.name"><span>{{ $t('clientCases.representativeLabel') }}</span>{{ selectedCase.user_cases_first_party_repTouser.name }}</p>
            </article>
            <article class="party-card">
              <h6>{{ $t('clientCases.secondParty') }} <span v-if="selectedCase.user_cases_second_partyTouser?.id === userid" class="badge-you">{{ $t('clientCases.you') }}</span></h6>
              <p><span>{{ $t('clientCases.nameLabel') }}</span>{{ selectedCase.user_cases_second_partyTouser?.name || '-' }}</p>
              <p><span>{{ $t('clientCases.emailLabel') }}</span>{{ selectedCase.user_cases_second_partyTouser?.email || '-' }}</p>
              <p><span>{{ $t('clientCases.phoneLabel') }}</span>{{ selectedCase.user_cases_second_partyTouser?.phone_number || '-' }}</p>
              <p v-if="selectedCase.user_cases_second_party_repTouser?.name"><span>{{ $t('clientCases.representativeLabel') }}</span>{{ selectedCase.user_cases_second_party_repTouser.name }}</p>
            </article>
          </div>
        </section>
        <section class="section-card">
          <div class="section-head">
            <h5>{{ $t('clientCases.mediator') }}</h5>
            <small>{{ $t('clientCases.mediatorSubtitle') }}</small>
          </div>
          <div class="party-grid">
            <article class="party-card mediator" v-if="selectedCase.user_cases_mediatorTouser">
              <h6>{{ $t('clientCases.assignedMediator') }}</h6>
              <p><span>{{ $t('clientCases.nameLabel') }}</span>{{ selectedCase.user_cases_mediatorTouser.name || '-' }}</p>
              <p><span>{{ $t('clientCases.emailLabel') }}</span>{{ selectedCase.user_cases_mediatorTouser.email || '-' }}</p>
              <p><span>{{ $t('clientCases.phoneLabel') }}</span>{{ selectedCase.user_cases_mediatorTouser.phone_number || '-' }}</p>
            </article>
            <article class="party-card mediator empty" v-else>
              <h6>{{ $t('clientCases.assignedMediator') }}</h6>
              <p class="muted-text">{{ $t('clientCases.mediatorPending') }}</p>
            </article>
          </div>
        </section>
      </template>

      <template #tab-documents>
        <section class="section-card documents-section">
          <div class="section-head">
            <h5>
              {{ $t('clientCases.documents') }}
            </h5>
            <small>{{ $t('clientCases.documentsSubtitle') }}</small>
          </div>
          <div v-if="documents.length" class="docs-grid">
            <FilePreview
              v-for="(doc, index) in documents"
              :key="doc.url"
              :url="doc.url"
              :name="doc.title"
            />
          </div>
          <kadr-empty-state
            v-else
            compact
            :description="$t('clientCases.noDocuments')"
          />
        </section>
      </template>

      <template #tab-meetings>
        <section class="section-card">
          <div class="section-head">
            <h5>{{ $t('clientCases.meetingsFeedback') }}</h5>
            <small>{{ $t('clientCases.meetingsFeedbackSubtitle') }}</small>
          </div>
          <div v-if="caseMeetingsSorted.length" class="meeting-list">
            <article v-for="event in caseMeetingsSorted" :key="event.id" class="meeting-item">
              <div class="meeting-item-body">
                <div class="meeting-badges">
                  <span class="badge-soft" :class="meetingPast(event) ? 'badge-past' : 'badge-upcoming'">
                    {{ meetingPast(event) ? $t('clientCases.past') : $t('clientCases.upcoming') }}
                  </span>
                  <span v-if="String(event.type || 'KADR').toUpperCase() === 'KADR'" class="badge-soft badge-kadr">{{ $t('clientCases.caseMeeting') }}</span>
                </div>
                <h6>{{ event.title || $t('clientCases.session') }}</h6>
                <p>{{ formatDateTime(event.start_datetime) }}</p>
                <div v-if="meetingPast(event) && isKadrMeeting(event)" class="feedback-summary">
                  <p v-if="event.first_party_rating != null && userid === selectedCase.user_cases_first_partyTouser?.id"><span>{{ $t('clientCases.yourRating') }}</span> {{ event.first_party_rating }}/5</p>
                  <p v-if="event.second_party_rating != null && userid === selectedCase.user_cases_second_partyTouser?.id"><span>{{ $t('clientCases.yourRating') }}</span> {{ event.second_party_rating }}/5</p>
                  <p v-if="event.first_party_next_steps != null && userid === selectedCase.user_cases_first_partyTouser?.id"><span>{{ $t('clientCases.yourComments') }}</span> {{ event.first_party_next_steps }}</p>
                  <p v-if="event.second_party_next_steps != null && userid === selectedCase.user_cases_second_partyTouser?.id"><span>{{ $t('clientCases.yourComments') }}</span> {{ event.second_party_next_steps }}</p>
                </div>
              </div>
              <div class="meeting-actions">
                <a
                  v-if="event.meeting_link && !meetingPast(event)"
                  :href="event.meeting_link"
                  target="_blank"
                  class="btn btn-outline-primary btn-sm"
                >
                  {{ $t('clientCases.join') }}
                </a>
                <button
                  v-if="showClientFeedbackButton(event)"
                  type="button"
                  class="btn btn-warning btn-sm"
                  @click="openMeetingFeedbackModal(event, clientPartyRole)"
                >
                  {{ $t('clientCases.rateMeeting') }}
                </button>
              </div>
            </article>
          </div>
          <kadr-empty-state
            v-else
            compact
            :description="$t('clientCases.noMeeting')"
          />
        </section>
      </template>

      <template #side>
        <section class="section-card">
          <div class="section-head">
            <h5>{{ $t('clientCases.caseProgress') }}</h5>
            <small>{{ $t('clientCases.caseProgressSubtitle') }}</small>
          </div>
          <CaseProgressPanel
            :progress="selectedCase.case_progress"
            :is-past-view="isPastView"
            @action="handleProgressAction"
          />
        </section>
        <section v-if="selectedCase.id" class="section-card side-correspondence-card">
          <CaseCorrespondencePanel
            embedded
            variant="sidebar"
            :case-id="selectedCase.id"
            :user-id="userid"
            user-type="CLIENT"
            mode="client"
            :client-channel="clientCorrespondenceChannel"
            :has-mediator="true"
            :read-only="isPastView"
          />
        </section>
      </template>
    </case-workspace-layout>

    <PaymentCheckout
      :visible="showPaymentModal"
      :purpose="paymentPurpose"
      :case-id="selectedCase.id"
      :amount-inr="paymentAmountInr"
      :title="paymentTitle"
      :subtitle="paymentSubtitle"
      @close="showPaymentModal = false"
    />

    <MeetingFeedbackModal
      v-model="feedbackModalVisible"
      modal-id="client-meeting-feedback"
      :role="feedbackContext.role"
      :event-title="feedbackContext.event && feedbackContext.event.title"
      :case-label="selectedCase.caseId ? $t('clientCases.caseLabel', { id: selectedCase.caseId }) : ''"
      :initial-summary="feedbackContext.event && feedbackContext.event.meeting_summary"
      :initial-mediator-steps="feedbackContext.event && feedbackContext.event.mediator_next_steps"
      :initial-party-steps="clientInitialPartySteps"
      :submitting="feedbackSubmitting"
      @submit="onMeetingFeedbackSubmit"
    />

    <ClientInitiateNewCaseModal
      :visible="showInitiateCaseModal"
      @close="showInitiateCaseModal = false"
      @submitted="onNewCaseSubmitted"
    />

    <kadr-modal
      v-model="showAgreementModal"
      :busy="isSubmittingAgreement"
      :title="$t('clientCases.signAgreementTitle')"
      :aria-label="$t('clientCases.signAgreementAria')"
      size="md"
    >
      <p>{{ $t('clientCases.signAgreementBody') }}</p>
      <div class="signature-pad-container">
        <VueSignaturePad
          ref="signaturePad"
          :options="{ backgroundColor: 'rgb(255, 255, 255)', penColor: 'rgb(0, 0, 0)' }"
        />
        <span class="signature-hint">{{ $t('clientCases.signHere') }}</span>
      </div>
      <template #footer>
        <button class="btn btn-secondary" :disabled="isSubmittingAgreement" @click="clearSignature">{{ $t('clientCases.clear') }}</button>
        <button class="btn btn-secondary" :disabled="isSubmittingAgreement" @click="showAgreementModal = false">{{ $t('clientCases.cancel') }}</button>
        <button class="btn btn-primary" :disabled="isSubmittingAgreement" @click="submitAgreement">
          <kadr-spinner v-if="isSubmittingAgreement" size="sm" class="me-2" />
          {{ isSubmittingAgreement ? $t('clientCases.submitting') : $t('clientCases.submitSignature') }}
        </button>
      </template>
    </kadr-modal>
  </div>
</template>
<script>
import { defineAsyncComponent } from 'vue'
import { sofbox } from '../../config/pluginInit'
import Alert from '../../components/sofbox/alert/Alert.vue'
import FilePreview from '../../components/DocumentPreview.vue'
import MeetingFeedbackModal from '../../components/MeetingFeedbackModal.vue'
import CaseCorrespondencePanel from '../../components/CaseCorrespondencePanel.vue'
import CaseProgressPanel from '../../components/cases/CaseProgressPanel.vue'
import CaseWorkspaceLayout from '../../components/kadr/CaseWorkspaceLayout.vue'
import KadrEmptyState from '../../components/kadr/KadrEmptyState.vue'
import KadrModal from '../../components/kadr/KadrModal.vue'
import ClientInitiateNewCaseModal from '../../components/cases/ClientInitiateNewCaseModal.vue'
import {
  isPastKadrCaseMeeting,
  clientNeedsMeetingFeedback,
  firstPartyNeedsRating,
  secondPartyNeedsRating
} from '../../utils/meetingFeedback'

export default {
  name: 'ClientCases',
  components: {
    Alert,
    FilePreview,
    MeetingFeedbackModal,
    CaseCorrespondencePanel,
    CaseProgressPanel,
    PaymentCheckout: defineAsyncComponent(() => import('../../components/payment/PaymentCheckout.vue')),
    CaseWorkspaceLayout,
    KadrEmptyState,
    KadrModal,
    ClientInitiateNewCaseModal
  },
  props: {
    content: {
      type: Object,
      required: true
    },
    userid: {
      type: String,
      required: true
    },
    isPastView: {
      type: Boolean,
      default: false
    },
    allowInitiateCase: {
      type: Boolean,
      default: true
    }
  },
  data () {
    return {
      selectedCase: {},
      showPaymentModal: false,
      showAgreementModal: false,
      paymentType: '',
      paymentPurpose: 'CLIENT_NOTICE',
      paymentAmountInr: 1000,
      paymentTitle: 'Complete payment',
      paymentSubtitle: '',
      isAcceptingMediation: false,
      isSubmittingAgreement: false,
      feedbackModalVisible: false,
      feedbackContext: {
        event: null,
        role: 'first'
      },
      feedbackSubmitting: false,
      showInitiateCaseModal: false,
      alert: {
        visible: false,
        message: '',
        timeout: 5000,
        type: 'primary'
      }
    }
  },
  computed: {
    myCases () {
      return this.content.myCases || []
    },
    canInitiateCase () {
      return !this.isPastView && this.allowInitiateCase
    },
    workspaceTitle () {
      return this.isPastView ? this.$t('clientCases.pastTitle') : this.$t('clientCases.activeTitle')
    },
    workspaceSubtitle () {
      return this.isPastView ? this.$t('clientCases.pastSubtitle') : this.$t('clientCases.activeSubtitle')
    },
    caseMeetingsSorted () {
      const list = [...(this.selectedCase.events || [])]
      return list.sort((a, b) => new Date(b.start_datetime) - new Date(a.start_datetime))
    },
    caseTabs () {
      return [
        { key: 'overview', label: this.$t('clientCases.tabOverview'), icon: 'fas fa-clipboard-list' },
        { key: 'parties', label: this.$t('clientCases.tabParties'), icon: 'fas fa-users' },
        { key: 'documents', label: this.$t('clientCases.tabDocuments'), icon: 'fas fa-folder-open', badge: this.documents.length || null },
        { key: 'meetings', label: this.$t('clientCases.tabMeetings'), icon: 'fas fa-calendar-day', badge: this.caseMeetingsSorted.length || null }
      ]
    },
    clientPartyRole () {
      if (this.userid === this.selectedCase.user_cases_first_partyTouser?.id) return 'first'
      if (this.userid === this.selectedCase.user_cases_second_partyTouser?.id) return 'second'
      return null
    },
    clientCorrespondenceChannel () {
      if (this.userid === this.selectedCase.user_cases_first_partyTouser?.id) return 'ADMIN_FIRST_PARTY'
      if (this.userid === this.selectedCase.user_cases_second_partyTouser?.id) return 'ADMIN_SECOND_PARTY'
      return null
    },
    clientInitialPartySteps () {
      const ev = this.feedbackContext.event
      if (!ev) return ''
      if (this.feedbackContext.role === 'first') return ev.first_party_next_steps || ''
      if (this.feedbackContext.role === 'second') return ev.second_party_next_steps || ''
      return ''
    },
    statusBadgeClass () {
      const status = (this.selectedCase.case_statuses?.name || '').toLowerCase()
      if (status.includes('closed success')) return 'success'
      if (status.includes('closed failed')) return 'danger'
      if (status.includes('progress')) return 'warning'
      return 'secondary'
    },
    actionCards () {
      if (this.isPastView) return []
      const actions = []
      const isSecondParty = this.userid === this.selectedCase.user_cases_second_partyTouser?.id
      const isFirstParty = this.userid === this.selectedCase.user_cases_first_partyTouser?.id

      if (
        this.selectedCase.case_statuses?.id === 'in_progress' &&
        this.selectedCase.case_sub_statuses?.id === 'notice_sent_to_opposite_party' &&
        isSecondParty
      ) {
        actions.push({
          key: 'accept',
          title: this.$t('clientCases.acceptMediationTitle'),
          description: this.$t('clientCases.acceptMediationDesc', { amount: '1,000' }),
          buttonText: this.$t('clientCases.acceptAndPay', { amount: '1,000' }),
          loading: false,
          action: () => this.initiatePayment('notice', this.selectedCase.user_cases_second_partyTouser.id),
          variant: 'success'
        })
      }

      if (this.selectedCase.case_sub_statuses?.id === 'pending_notice_payment' && isFirstParty) {
        actions.push({
          key: 'notice-payment',
          title: this.$t('clientCases.noticePaymentTitle'),
          description: this.$t('clientCases.noticePaymentDesc', { amount: '1000' }),
          buttonText: this.$t('clientCases.payAmount', { amount: '1000' }),
          loading: false,
          action: () => this.initiatePayment('notice', this.selectedCase.user_cases_first_partyTouser.id),
          variant: 'primary'
        })
      }

      if (this.selectedCase.case_sub_statuses?.id === 'pending_mediation_payment' && isFirstParty) {
        actions.push({
          key: 'mediation-payment',
          title: this.$t('clientCases.mediationFeeTitle'),
          description: this.$t('clientCases.mediationFeeDesc', { amount: '5000' }),
          buttonText: this.$t('clientCases.payAmount', { amount: '5000' }),
          loading: false,
          action: () => this.initiatePayment('mediation', this.selectedCase.user_cases_first_partyTouser.id),
          variant: 'warning'
        })
      }

      if (
        this.selectedCase.case_statuses?.name === 'In Progress' &&
        this.selectedCase.agreement_status === 'pending_signature'
      ) {
        actions.push({
          key: 'agreement-sign',
          title: this.$t('clientCases.signAgreementCardTitle'),
          description: this.$t('clientCases.signAgreementCardDesc'),
          buttonText: this.isSubmittingAgreement ? this.$t('clientCases.submittingShort') : this.$t('clientCases.signAgreementCardTitle'),
          loading: this.isSubmittingAgreement,
          action: this.initiateSigning,
          variant: 'success'
        })
      }

      const partyRole = this.clientPartyRole
      if (partyRole) {
        for (const ev of this.selectedCase.events || []) {
          if (!ev || String(ev.type || 'KADR').toUpperCase() !== 'KADR') continue
          if (!isPastKadrCaseMeeting(ev)) continue
          const needs = partyRole === 'first' ? firstPartyNeedsRating(ev) : secondPartyNeedsRating(ev)
          if (!needs) continue
          actions.push({
            key: `meeting-feedback-${ev.id}`,
            title: this.$t('clientCases.ratePastMeetingTitle'),
            description: this.$t('clientCases.ratePastMeetingDesc', {
              title: ev.title || this.$t('clientCases.yourMeeting'),
              date: this.formatDateTime(ev.start_datetime)
            }),
            buttonText: this.$t('clientCases.giveFeedback'),
            loading: false,
            action: () => this.openMeetingFeedbackModal(ev, partyRole),
            variant: 'warning'
          })
        }
      }

      return actions
    },
    documents () {
      const docs = []
      const evidenceUrl = this.selectedCase.evidence_document_url
      if (typeof evidenceUrl === 'string' && evidenceUrl.trim()) {
        docs.push({ title: this.$t('clientCases.evidenceDocument'), url: evidenceUrl })
      }
      return docs
    }
  },
  mounted () {
    sofbox.index()
    this.paymentTitle = this.$t('clientCases.completePayment')
    this.selectedCase = this.myCases[0] || {}
  },
  watch: {
    myCases: {
      immediate: true,
      handler (newCases) {
        if (!newCases.length) {
          this.selectedCase = {}
          return
        }

        const current = newCases.find((item) => item.id === this.selectedCase.id)
        this.selectedCase = current || newCases[0]
      }
    }
  },
  methods: {
    meetingPast (event) {
      return isPastKadrCaseMeeting({ ...event, type: event.type || 'KADR' })
    },
    isKadrMeeting (event) {
      return String(event.type || 'KADR').toUpperCase() === 'KADR'
    },
    showClientFeedbackButton (event) {
      if (this.isPastView) return false
      if (!this.isKadrMeeting(event)) return false
      return clientNeedsMeetingFeedback(event, this.userid, this.selectedCase)
    },
    openMeetingFeedbackModal (event, role) {
      this.feedbackContext = { event, role }
      this.feedbackModalVisible = true
    },
    async onMeetingFeedbackSubmit (payload) {
      const ev = this.feedbackContext.event
      if (!ev) return
      const body = { event_id: ev.id }
      if (payload.role === 'first') {
        body.first_party_rating = payload.rating
        if (payload.party_next_steps) body.first_party_next_steps = payload.party_next_steps
      } else if (payload.role === 'second') {
        body.second_party_rating = payload.rating
        if (payload.party_next_steps) body.second_party_next_steps = payload.party_next_steps
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
    },
    openInitiateCaseModal () {
      if (!this.canInitiateCase) return
      this.showInitiateCaseModal = true
    },
    onNewCaseSubmitted () {
      this.showInitiateCaseModal = false
      this.$emit('refresh-dashboard')
    },
    selectCase (caseItem) {
      this.selectedCase = caseItem
    },
    selectCaseById (caseId) {
      const found = this.myCases.find((item) => item.id === caseId)
      if (found) this.selectedCase = found
      return !!found
    },
    runDashboardAction ({ caseId, trigger, paymentType }) {
      if (caseId) this.selectCaseById(caseId)
      this.$nextTick(() => {
        if (trigger === 'payment') {
          this.initiatePayment(paymentType || 'notice')
        } else if (trigger === 'sign') {
          this.initiateSigning()
        }
      })
    },
    handleProgressAction (actionKey) {
      const isSecondParty = this.userid === this.selectedCase.user_cases_second_partyTouser?.id
      const isFirstParty = this.userid === this.selectedCase.user_cases_first_partyTouser?.id

      if (actionKey === 'notice_payment' && isFirstParty) {
        this.initiatePayment('notice')
        return
      }
      if (actionKey === 'accept_mediation' && isSecondParty) {
        this.acceptMediationRequest()
        return
      }
      if (actionKey === 'mediation_payment' && isFirstParty) {
        this.initiatePayment('mediation')
        return
      }
      if (actionKey === 'sign_agreement') {
        this.initiateSigning()
        return
      }
      if (actionKey === 'join_meeting') {
        const link = this.selectedCase.case_progress?.now?.meetingLink
        if (link) window.open(link, '_blank', 'noopener')
      }
    },
    showAlert (message, type) {
      this.alert = {
        message,
        type,
        timeout: 5000,
        visible: true
      }
    },
    async acceptMediationRequest () {
      if (this.isAcceptingMediation) return
      this.isAcceptingMediation = true
      try {
        const res = await this.$store.dispatch('acceptMediationRequest', { caseId: this.selectedCase.id })
        if (res.success) {
          this.showAlert(res.message || this.$t('clientCases.mediationAccepted'), 'success')
          this.$emit('refresh-dashboard')
        } else {
          this.showAlert(res.message || this.$t('clientCases.mediationAcceptError'), 'danger')
        }
      } finally {
        this.isAcceptingMediation = false
      }
    },
    initiatePayment (type) {
      this.paymentType = type
      if (type === 'notice') {
        this.paymentPurpose = 'CLIENT_NOTICE'
        this.paymentAmountInr = 1000
        this.paymentTitle = this.$t('clientCases.payNoticeFee')
        this.paymentSubtitle = this.$t('clientCases.payNoticeFeeSubtitle')
      } else {
        this.paymentPurpose = 'CLIENT_MEDIATION'
        this.paymentAmountInr = 5000
        this.paymentTitle = this.$t('clientCases.payMediationFee')
        this.paymentSubtitle = this.$t('clientCases.payMediationFeeSubtitle')
      }
      this.showPaymentModal = true
    },
    initiateSigning () {
      this.showAgreementModal = true
    },
    clearSignature () {
      this.$refs.signaturePad.clearSignature()
    },
    async submitAgreement () {
      const signatureData = this.$refs.signaturePad.saveSignature()
      if (signatureData.isEmpty) {
        this.showAlert(this.$t('clientCases.signBeforeSubmit'), 'danger')
        return
      }

      const requestId = this.selectedCase?.case_agreement_tracking?.signature_tracking?.[0]?.id
      if (!requestId) {
        this.showAlert(this.$t('clientCases.noPendingSignature'), 'danger')
        return
      }

      this.isSubmittingAgreement = true
      try {
        const response = await this.$store.dispatch('submitAgreementSignature', {
          signature: signatureData.data,
          requestId
        })
        if (response.success) {
          this.showAgreementModal = false
          this.showAlert(response.message || this.$t('clientCases.agreementSigned'), 'success')
          this.$emit('refresh-dashboard')
        } else {
          this.showAlert(response.message || this.$t('clientCases.signatureSubmitError'), 'danger')
        }
      } catch (error) {
        console.error('Failed to submit agreement:', error)
        this.showAlert(this.$t('clientCases.signatureSubmitException'), 'danger')
      } finally {
        this.isSubmittingAgreement = false
      }
    },
    formatDateTime (dateString) {
      return this.$formatDateTime(dateString)
    },
    openDocument (doc) {
      const url = doc.url || doc.link || doc.document_url
      if (url) {
        window.open(url, '_blank')
      }
    },
    getDocumentPreview (url) {
      if (!url) return this.$t('clientCases.noDocumentLink')
      return url.replace(/^https?:\/\//, '').replace(/\/$/, '')
    }
  }
}
</script>

<style scoped>
.representative-banner {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  margin-bottom: 1rem;
  border-radius: 10px;
  background: var(--kadr-primary-soft);
  border: 1px solid var(--kadr-primary-soft-border);
  color: var(--kadr-primary-hover);
  font-size: 0.9rem;
}

.badge-you {
  background: var(--kadr-success);
  color: var(--kadr-text-on-primary);
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 999px;
  font-weight: 600;
}

.docs-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 0.75rem;
  margin-top: 0.75rem;
}

.document-card {
  background: var(--kadr-surface-muted);
  border: 1px solid var(--kadr-border);
  border-radius: var(--kadr-radius-lg);
  padding: 0.95rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  cursor: pointer;
  transition: transform var(--kadr-duration-fast) var(--kadr-ease), box-shadow var(--kadr-duration-fast) var(--kadr-ease), border-color var(--kadr-duration-fast) var(--kadr-ease);
}

.document-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--kadr-shadow-md);
  border-color: var(--kadr-primary-soft-border);
}

.doc-card-title {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  font-weight: 700;
  color: var(--kadr-text-primary);
}

.doc-icon {
  font-size: 1.1rem;
  color: var(--kadr-primary);
}

.doc-preview {
  min-height: 46px;
  color: var(--kadr-text-secondary);
  font-size: 0.92rem;
  line-height: 1.4;
  word-break: break-all;
}

.doc-link {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  color: var(--kadr-primary);
  font-weight: 600;
  text-decoration: none;
  border: 1px solid var(--kadr-primary-soft-border);
  padding: 0.35rem 0.65rem;
  border-radius: var(--kadr-radius);
  background: var(--kadr-primary-soft);
  transition: background var(--kadr-duration-fast) var(--kadr-ease), color var(--kadr-duration-fast) var(--kadr-ease);
}

.doc-link:hover {
  background: var(--kadr-primary-soft-border);
  color: var(--kadr-primary-hover);
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

.party-card h6 {
  margin: 0 0 0.5rem;
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

.party-card.empty p {
  justify-content: flex-start;
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

.badge-kadr {
  background: var(--kadr-primary-soft);
  color: var(--kadr-primary);
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
}

.side-correspondence-card {
  padding: 0.65rem 0.75rem;
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

.signature-pad-container {
  position: relative;
  border: 1px solid var(--kadr-border-strong);
  border-radius: var(--kadr-radius);
  padding: 0.65rem;
  margin-top: 0.8rem;
}

.signature-hint {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0.9rem;
  text-align: center;
  font-size: 0.8rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--kadr-text-label);
  pointer-events: none;
}

@media (max-width: 600px) {
  .meeting-item {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
