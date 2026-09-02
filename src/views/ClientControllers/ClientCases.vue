<template>
  <div>
    <case-workspace-layout
      :has-cases="myCases.length > 0"
      :title="workspaceTitle"
      :subtitle="workspaceSubtitle"
      :empty-action-label="canInitiateCase ? CASES.CREATE_CTA : ''"
      @empty-action="openInitiateCaseModal"
    >
      <template v-if="canInitiateCase" #head-extra>
        <button type="button" class="btn btn-primary btn-sm mt-2" @click="openInitiateCaseModal">
          {{ CASES.CREATE_CTA }}
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
            <strong class="status-chip" :class="statusBadgeClass">
              {{ selectedCase.case_statuses?.name || '-' }}
            </strong>
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
            <label>Case Type</label>
            <strong>{{ selectedCase.case_type || CASES.AWAITING_TYPE }}</strong>
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
            <small>Complete pending steps to keep the case moving.</small>
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
                <span v-if="item.loading" class="spinner-border spinner-border-sm me-2" role="status"></span>
                {{ item.buttonText }}
              </button>
            </article>
          </div>
          <kadr-empty-state
            v-else
            compact
            description="No immediate action is required for this case."
          />
        </section>

        <section class="section-card">
          <div class="section-head">
            <h5>Parties</h5>
            <small>Primary participants associated with this case.</small>
          </div>
          <div class="party-grid">
            <article class="party-card">
              <h6>First Party <span v-if="selectedCase.user_cases_first_partyTouser?.id === userid" class="badge-you">You</span></h6>
              <p><span>Name:</span>{{ selectedCase.user_cases_first_partyTouser?.name || '-' }}</p>
              <p><span>Email:</span>{{ selectedCase.user_cases_first_partyTouser?.email || '-' }}</p>
              <p><span>Phone:</span>{{ selectedCase.user_cases_first_partyTouser?.phone_number || '-' }}</p>
            </article>
            <article class="party-card">
              <h6>Second Party <span v-if="selectedCase.user_cases_second_partyTouser?.id === userid" class="badge-you">You</span></h6>
              <p><span>Name:</span>{{ selectedCase.user_cases_second_partyTouser?.name || '-' }}</p>
              <p><span>Email:</span>{{ selectedCase.user_cases_second_partyTouser?.email || '-' }}</p>
              <p><span>Phone:</span>{{ selectedCase.user_cases_second_partyTouser?.phone_number || '-' }}</p>
            </article>
          </div>
        </section>
        <section class="section-card">
          <div class="section-head">
            <h5>Mediator</h5>
            <small>Mediator assigned to this case to help facilitate resolution.</small>
          </div>
          <div class="party-grid">
            <article class="party-card mediator" v-if="selectedCase.user_cases_mediatorTouser">
              <h6>Assigned Mediator</h6>
              <p><span>Name:</span>{{ selectedCase.user_cases_mediatorTouser.name || '-' }}</p>
              <p><span>Email:</span>{{ selectedCase.user_cases_mediatorTouser.email || '-' }}</p>
              <p><span>Phone:</span>{{ selectedCase.user_cases_mediatorTouser.phone_number || '-' }}</p>
            </article>
            <article class="party-card mediator empty" v-else>
              <h6>Assigned Mediator</h6>
              <p class="muted-text">Mediator will appear here once assigned.</p>
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
            :description="CASES.NO_DOCUMENTS"
          />
        </section>

        <section class="section-card">
          <div class="section-head">
            <h5>Meetings & Feedback</h5>
            <small>Past and upcoming sessions; submit mediator notes or party ratings after a session ends.</small>
          </div>
          <div v-if="caseMeetingsSorted.length" class="meeting-list">
            <article v-for="event in caseMeetingsSorted" :key="event.id" class="meeting-item">
              <div class="meeting-item-body">
                <div class="meeting-badges">
                  <span class="badge-soft" :class="meetingPast(event) ? 'badge-past' : 'badge-upcoming'">
                    {{ meetingPast(event) ? 'Past' : 'Upcoming' }}
                  </span>
                  <span v-if="String(event.type || 'KADR').toUpperCase() === 'KADR'" class="badge-soft badge-kadr">Case meeting</span>
                </div>
                <h6>{{ event.title || 'Session' }}</h6>
                <p>{{ formatDateTime(event.start_datetime) }}</p>
                <div v-if="meetingPast(event) && isKadrMeeting(event)" class="feedback-summary">
                  <p v-if="event.first_party_rating != null && userid === selectedCase.user_cases_first_partyTouser?.id"><span>Your rating:</span> {{ event.first_party_rating }}/5</p>
                  <p v-if="event.second_party_rating != null && userid === selectedCase.user_cases_second_partyTouser?.id"><span>Your rating:</span> {{ event.second_party_rating }}/5</p>
                  <p v-if="event.first_party_next_steps != null && userid === selectedCase.user_cases_first_partyTouser?.id"><span>Your comments:</span> {{ event.first_party_next_steps }}</p>
                  <p v-if="event.second_party_next_steps != null && userid === selectedCase.user_cases_second_partyTouser?.id"><span>Your comments:</span> {{ event.second_party_next_steps }}</p>
                </div>
              </div>
              <div class="meeting-actions">
                <a
                  v-if="event.meeting_link && !meetingPast(event)"
                  :href="event.meeting_link"
                  target="_blank"
                  class="btn btn-outline-primary btn-sm"
                >
                  Join
                </a>
                <button
                  v-if="showClientFeedbackButton(event)"
                  type="button"
                  class="btn btn-warning btn-sm"
                  @click="openMeetingFeedbackModal(event, clientPartyRole)"
                >
                  Rate meeting
                </button>
              </div>
            </article>
          </div>
          <kadr-empty-state
            v-else
            compact
            :description="CASES.NO_MEETING"
          />
        </section>
      </template>

      <template #side>
        <section class="section-card">
          <div class="section-head">
            <h5>Case progress</h5>
            <small>Where you are now, what is next, and recent activity.</small>
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
      :case-label="selectedCase.caseId ? `Case #${selectedCase.caseId}` : ''"
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

    <div v-if="showAgreementModal" class="modal-overlay" @click="showAgreementModal = false">
      <div class="signature-modal modal-content" @click.stop>
        <h3>Sign Mediation Agreement</h3>
        <p>Please sign below to complete the mediation agreement.</p>
        <div class="signature-pad-container">
          <VueSignaturePad
            ref="signaturePad"
            :options="{ backgroundColor: 'rgb(255, 255, 255)', penColor: 'rgb(0, 0, 0)' }"
          />
        </div>
        <div class="modal-actions">
          <button class="btn btn-secondary" @click="clearSignature">Clear</button>
          <button class="btn btn-secondary" @click="showAgreementModal = false">Cancel</button>
          <button class="btn btn-primary" @click="submitAgreement">Submit Signature</button>
        </div>
      </div>
    </div>
  </div>
</template>
<script>
import { defineAsyncComponent } from 'vue'
import { sofbox } from '../../config/pluginInit'
import FilePreview from '../../components/DocumentPreview.vue'
import MeetingFeedbackModal from '../../components/MeetingFeedbackModal.vue'
import CaseCorrespondencePanel from '../../components/CaseCorrespondencePanel.vue'
import CaseProgressPanel from '../../components/cases/CaseProgressPanel.vue'
import CaseWorkspaceLayout from '../../components/kadr/CaseWorkspaceLayout.vue'
import KadrEmptyState from '../../components/kadr/KadrEmptyState.vue'
import ClientInitiateNewCaseModal from '../../components/cases/ClientInitiateNewCaseModal.vue'
import { CASES } from '../../constants/messages'
import {
  isPastKadrCaseMeeting,
  clientNeedsMeetingFeedback,
  firstPartyNeedsRating,
  secondPartyNeedsRating
} from '../../utils/meetingFeedback'

export default {
  name: 'ClientCases',
  components: {
    FilePreview,
    MeetingFeedbackModal,
    CaseCorrespondencePanel,
    CaseProgressPanel,
    PaymentCheckout: defineAsyncComponent(() => import('../../components/payment/PaymentCheckout.vue')),
    CaseWorkspaceLayout,
    KadrEmptyState,
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
      CASES,
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
      showInitiateCaseModal: false
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
      return this.isPastView ? CASES.PAST_TITLE : CASES.ACTIVE_TITLE
    },
    workspaceSubtitle () {
      return this.isPastView ? CASES.PAST_SUBTITLE : CASES.ACTIVE_SUBTITLE
    },
    caseMeetingsSorted () {
      const list = [...(this.selectedCase.events || [])]
      return list.sort((a, b) => new Date(b.start_datetime) - new Date(a.start_datetime))
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
          title: 'Accept Mediation',
          description: 'Review the notice and make a payment of Rs. 1000 to continue with mediation proceedings.',
          buttonText: this.isAcceptingMediation ? 'Accepting...' : 'I Accept',
          loading: this.isAcceptingMediation,
          action: () => this.initiatePayment('notice', this.selectedCase.user_cases_second_partyTouser.id),
          variant: 'success'
        })
      }

      if (this.selectedCase.case_sub_statuses?.id === 'pending_notice_payment' && isFirstParty) {
        actions.push({
          key: 'notice-payment',
          title: 'Notice Payment',
          description: 'Pay Rs. 1000 to trigger legal notice dispatch to the opposite party.',
          buttonText: 'Pay Rs. 1000',
          loading: false,
          action: () => this.initiatePayment('notice', this.selectedCase.user_cases_first_partyTouser.id),
          variant: 'primary'
        })
      }

      if (this.selectedCase.case_sub_statuses?.id === 'pending_mediation_payment' && isFirstParty) {
        actions.push({
          key: 'mediation-payment',
          title: 'Mediation Fee',
          description: 'Pay Rs. 5000 to initiate mediator assignment and meeting scheduling.',
          buttonText: 'Pay Rs. 5000',
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
          title: 'Sign Agreement',
          description: 'Sign the mediation agreement to complete closure formalities.',
          buttonText: this.isSubmittingAgreement ? 'Submitting...' : 'Sign Agreement',
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
            title: 'Rate a past meeting',
            description: `Share how the session went for "${ev.title || 'your meeting'}" (${this.formatDateTime(ev.start_datetime)}).`,
            buttonText: 'Give feedback',
            loading: false,
            action: () => this.openMeetingFeedbackModal(ev, partyRole),
            variant: 'warning'
          })
        }
      }

      return actions
    },
    documents () {
      const docsData =
        [{
          title: 'Evidence Document',
          url: this.selectedCase.evidence_document_url
        }]
      if (Array.isArray(docsData)) return docsData
      if (docsData && typeof docsData === 'object') return [docsData]
      if (typeof docsData === 'string' && docsData.trim()) {
        return [{ title: 'Document', url: docsData }]
      }
      return []
    }
  },
  mounted () {
    sofbox.index()
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
      const res = await this.$store.dispatch('submitMeetingFeedback', body)
      this.feedbackSubmitting = false
      if (res.success) {
        this.feedbackModalVisible = false
        this.$emit('refresh-dashboard')
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
    async acceptMediationRequest () {
      const res = await this.$store.dispatch('acceptMediationRequest', { caseId: this.selectedCase.id })
      if (res.success) {
        this.$emit('refresh-dashboard')
      }
    },
    initiatePayment (type) {
      this.paymentType = type
      if (type === 'notice') {
        this.paymentPurpose = 'CLIENT_NOTICE'
        this.paymentAmountInr = 1000
        this.paymentTitle = 'Pay notice fee'
        this.paymentSubtitle = 'This fee covers sending the formal notice to the responding party.'
      } else {
        this.paymentPurpose = 'CLIENT_MEDIATION'
        this.paymentAmountInr = 5000
        this.paymentTitle = 'Pay mediation fee'
        this.paymentSubtitle = 'This fee starts the mediation process and assigns a certified mediator.'
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
        alert('Please sign the agreement')
        return
      }

      const requestId = this.selectedCase?.case_agreement_tracking?.signature_tracking?.[0]?.id
      if (!requestId) {
        alert('No pending signature request found for this case. Please use the link from your email, or refresh and try again.')
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
          this.$emit('refresh-dashboard')
        }
      } catch (error) {
        console.error('Failed to submit agreement:', error)
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
      if (!url) return 'No document link available'
      return url.replace(/^https?:\/\//, '').replace(/\/$/, '')
    }
  }
}
</script>

<style scoped>
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
  background: #fff8f1;
  border: 1px solid #ffd7b8;
  border-radius: var(--kadr-radius-lg);
  padding: 0.95rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  cursor: pointer;
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}

.document-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 24px rgba(255, 149, 54, 0.14);
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
  color: #d46e2f;
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
  color: #b74c11;
  font-weight: 600;
  text-decoration: none;
  border: 1px solid rgba(183, 76, 17, 0.18);
  padding: 0.35rem 0.65rem;
  border-radius: var(--kadr-radius);
  background: rgba(255, 226, 189, 0.42);
}

.doc-link:hover {
  background: rgba(255, 226, 189, 0.7);
  color: #8e3c0d;
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
  background: #e8f2ff;
  color: var(--kadr-accent);
}

.badge-kadr {
  background: #f3e8ff;
  color: #6b21a8;
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

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1050;
}

.modal-content {
  background: var(--kadr-bg-surface);
  border-radius: var(--kadr-radius-lg);
  padding: 1.2rem;
  width: min(520px, 92vw);
}

.modal-content h3 {
  margin-top: 0;
}

.form-group {
  margin-bottom: 0.75rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.3rem;
}

.form-group input {
  width: 100%;
  border: 1px solid var(--kadr-border-strong);
  border-radius: var(--kadr-radius);
  padding: 0.6rem 0.75rem;
}

.modal-actions {
  margin-top: 1rem;
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.signature-pad-container {
  border: 1px solid var(--kadr-border-strong);
  border-radius: var(--kadr-radius);
  padding: 0.65rem;
  margin-top: 0.8rem;
}

@media (max-width: 600px) {
  .meeting-item {
    flex-direction: column;
    align-items: flex-start;
  }

  .modal-actions .btn {
    width: 100%;
  }
}
</style>
