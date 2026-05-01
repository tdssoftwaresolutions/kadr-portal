<template>
  <div class="cases-workspace">
    <section v-if="myCases.length" class="cases-overview">
      <div class="overview-head">
        <h4>Active Case Workspace</h4>
        <p>Track progress, required actions, meetings, mediator assignment, and case closure tasks.</p>
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
            <div v-else class="empty-box">No immediate action is required for this case.</div>
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
            <div v-else class="empty-box">No documents attached to this case.</div>
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
            <div v-else class="empty-box">No meetings are currently scheduled for this case.</div>
          </section>
        </div>

        <aside class="workspace-side">
          <section class="section-card sticky">
            <div class="section-head">
              <h5>Case Timeline</h5>
              <small>Current stage and pending milestones.</small>
            </div>
            <div class="timeline">
              <div
                v-for="(step, index) in selectedCase.case_history"
                :key="index"
                class="timeline-step"
                :class="getProgressStepClass(step)"
              >
                <p>{{ step.title }}</p>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </section>

    <section v-else class="empty-state">
      <i class="fas fa-folder-open fa-3x"></i>
      <h4>No Active Cases</h4>
      <p>You do not have an in-progress case yet. Once raised, it will appear here with full tracking details.</p>
      <button class="btn btn-primary">File New Case</button>
    </section>

    <div v-if="showPaymentModal" class="modal-overlay" @click="showPaymentModal = false">
      <div class="modal-content" @click.stop>
        <h3>Payment Details</h3>
        <form class="payment-form" @submit.prevent="processPayment">
          <div class="form-group">
            <label>Card Number</label>
            <input v-model="paymentData.cardNumber" type="text" placeholder="1234 5678 9012 3456" required>
          </div>
          <div class="form-group">
            <label>Expiry Date</label>
            <input v-model="paymentData.expiryDate" type="text" placeholder="MM/YY" required>
          </div>
          <div class="form-group">
            <label>CVV</label>
            <input v-model="paymentData.cvv" type="text" placeholder="123" required>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" @click="showPaymentModal = false" :disabled="isProcessingPayment">Cancel</button>
            <button type="submit" class="btn btn-primary" :disabled="isProcessingPayment">
              <span v-if="isProcessingPayment" class="spinner-border spinner-border-sm me-2" role="status"></span>
              {{ isProcessingPayment ? 'Processing...' : `Pay Rs. ${paymentType === 'notice' ? '1000' : '5000'}` }}
            </button>
          </div>
        </form>
      </div>
    </div>

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
import { sofbox } from '../../config/pluginInit'
import FilePreview from '../core/DocumentPreview.vue'
import MeetingFeedbackModal from '../../components/MeetingFeedbackModal.vue'
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
    MeetingFeedbackModal
  },
  props: {
    content: {
      type: Object,
      required: true
    },
    userid: {
      type: String,
      required: true
    }
  },
  data () {
    return {
      selectedCase: {},
      showPaymentModal: false,
      showAgreementModal: false,
      paymentType: '', // 'notice' or 'mediation'
      paymentUserId: '',
      paymentData: {
        cardNumber: '',
        expiryDate: '',
        cvv: ''
      },
      isProcessingPayment: false,
      isAcceptingMediation: false,
      isSubmittingAgreement: false,
      feedbackModalVisible: false,
      feedbackContext: {
        event: null,
        role: 'first'
      },
      feedbackSubmitting: false
    }
  },
  computed: {
    activeStepSequence () {
      if (!this.selectedCase?.case_history?.length) return null
      const sorted = [...this.selectedCase.case_history]
        .sort((a, b) => a.sequence - b.sequence)

      const activeStep = sorted.find(step => step.completed === false)
      return activeStep ? activeStep.sequence : null
    },
    myCases () {
      return this.content.myCases || []
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
    this.updateProgressSteps()
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
        this.updateProgressSteps()
      }
    },
    selectedCase () {
      this.updateProgressSteps()
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
    selectCase (caseItem) {
      this.selectedCase = caseItem
      this.updateProgressSteps()
    },
    getProgressStepClass (step) {
      return {
        'completed': step.completed === true,
        'active': step.sequence === this.activeStepSequence,
        'pending': step.completed === false && step.sequence !== this.activeStepSequence
      }
    },
    updateProgressSteps () {
      // Reset all steps
      console.log(this.caseProgressSteps)
      if (!this.caseProgressSteps) return

      this.caseProgressSteps.forEach((step) => {
        step.status = 'pending'
      })

      const status = this.selectedCase.case_statuses?.name
      const subStatus = this.selectedCase.case_sub_statuses?.name

      // Update based on current status
      if (status === 'New') {
        this.caseProgressSteps[0].status = 'active'
      } else if (status === 'In Progress') {
        this.caseProgressSteps[0].status = 'completed'
        this.caseProgressSteps[1].status = 'completed'

        if (subStatus === 'Notice Sent to Opposite Party') {
          this.caseProgressSteps[2].status = 'active'
        } else if (subStatus === 'Pending Mediation Payment') {
          this.caseProgressSteps[2].status = 'completed'
          this.caseProgressSteps[3].status = 'active'
        } else if (this.selectedCase.user_cases_mediatorTouser) {
          this.caseProgressSteps[2].status = 'completed'
          this.caseProgressSteps[3].status = 'completed'
          this.caseProgressSteps[4].status = 'completed'
          this.caseProgressSteps[5].status = 'active'
        }
      } else if (status === 'Closed Success') {
        this.caseProgressSteps.forEach((step) => {
          step.status = 'completed'
        })
      }
    },
    initiatePayment (type, userId) {
      this.paymentType = type
      this.paymentUserId = userId
      this.showPaymentModal = true
    },
    async processPayment () {
      this.isProcessingPayment = true
      try {
        const amount = this.paymentType === 'notice' ? 1000 : 5000
        const payload = {
          paymentId: `TXN${Math.floor(Math.random() * 1000000)}`,
          clientId: this.paymentUserId,
          caseId: this.selectedCase.id,
          status: 'success',
          amount,
          currency: 'INR',
          reason: this.paymentType === 'notice' ? 'Notice payment' : 'Mediation payment',
          paymentMethod: 'Credit Card',
          referenceId: `REF${Math.floor(Math.random() * 1000000)}`
        }

        const response = await this.$store.dispatch('setClientPayment', { payload })
        if (response.success) {
          this.showPaymentModal = false
          this.resetPaymentData()
          // Update case status locally or refresh
          this.$emit('case-updated')
        }
      } catch (error) {
        console.error('Payment failed:', error)
      } finally {
        this.isProcessingPayment = false
      }
    },
    resetPaymentData () {
      this.paymentData = {
        cardNumber: '',
        expiryDate: '',
        cvv: ''
      }
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

      this.isSubmittingAgreement = true
      try {
        // Process signature
        this.showAgreementModal = false
        this.$emit('case-updated')
      } catch (error) {
        console.error('Failed to submit agreement:', error)
      } finally {
        this.isSubmittingAgreement = false
      }
    },
    formatDateTime (dateString) {
      if (!dateString) {
        return '-'
      }
      return new Date(dateString).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
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

.case-pill.active {
  border-color: #3758d5;
  background: #edf2ff;
}

.badge-you {
  background: #4CAF50;
  color: white;
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 999px;
  font-weight: 600;
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
  grid-template-columns: 1.4fr 0.7fr;
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
  grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
  gap: 0.75rem;
  margin-top: 0.75rem;
}

.action-card {
  border-radius: 10px;
  padding: 0.9rem;
  color: #3d2716;
  border: 1px solid #f4c7b0;
  background: linear-gradient(135deg, #fff2ec 0%, #ffe4d6 100%);
  box-shadow: 0 1px 14px rgba(211, 116, 52, 0.12);
}

.action-card.primary {
  background: linear-gradient(135deg, #fff4e9, #ffe4c9);
  border-color: #f2c8a5;
}

.action-card.success {
  background: linear-gradient(135deg, #e6f7ea, #ccecd5);
  border-color: #a7d7b1;
  color: #1f5137;
}

.action-card.warning {
  background: linear-gradient(135deg, #fff6e4, #ffe1c1);
  border-color: #f1c08a;
}

.action-card p {
  margin: 0 0 0.45rem;
}

.action-card h6 {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.action-card-icon {
  font-size: 0.95rem;
  color: #c84a2d;
}

.action-required-section .section-head h5,
.documents-section .section-head h5 {
  display: flex;
  align-items: center;
  gap: 0.6rem;
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

.document-card {
  background: #fff8f1;
  border: 1px solid #ffd7b8;
  border-radius: 12px;
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
  color: #3b3241;
}

.doc-icon {
  font-size: 1.1rem;
  color: #d46e2f;
}

.doc-preview {
  min-height: 46px;
  color: #5f5f70;
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
  border-radius: 8px;
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
  background: #f9fbff;
  border: 1px solid #e5eaf8;
  border-radius: 10px;
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
  color: #2f3752;
}

.party-card p span {
  color: #6b7694;
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

.badge-kadr {
  background: #f3e8ff;
  color: #6b21a8;
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
  background: #fff;
  border-radius: 12px;
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
  border: 1px solid #d3dbef;
  border-radius: 8px;
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
  border: 1px solid #d3dbef;
  border-radius: 8px;
  padding: 0.65rem;
  margin-top: 0.8rem;
}

@media (max-width: 991px) {
  .workspace-layout {
    grid-template-columns: 1fr;
  }

  .workspace-side .sticky {
    position: static;
  }
}

@media (max-width: 600px) {
  .cases-overview {
    padding: 0.75rem;
  }

  .meeting-item {
    flex-direction: column;
    align-items: flex-start;
  }

  .modal-actions .btn {
    width: 100%;
  }
}
</style>
