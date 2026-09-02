<template>
  <div class="form-container">
    <Alert :message="alert.message" :type="alert.type" v-model="alert.visible" :timeout="alert.timeout"></Alert>

    <header class="page-header">
      <h1>Kadr.live</h1>
      <h2>Mediation agreement</h2>
      <p class="subtitle">
        Review the agreed terms and sign to complete the mediation on Kadr.live.
      </p>
    </header>

    <form v-if="details" @submit.prevent="openPhoneModal" class="form-section">
      <section class="info-card">
        <h3>Case information</h3>
        <dl class="detail-list">
          <div>
            <dt>Case ID</dt>
            <dd>{{ details.caseId || '—' }}</dd>
          </div>
          <div v-if="details.caseType">
            <dt>Case type</dt>
            <dd>{{ details.caseType }}</dd>
          </div>
          <div>
            <dt>Filed on</dt>
            <dd>{{ formatDate(details.filedAt) }}</dd>
          </div>
          <div>
            <dt>Agreement date</dt>
            <dd>{{ formatDate(details.mediationCompletionDate) }}</dd>
          </div>
        </dl>
      </section>

      <section class="info-card">
        <h3>Parties</h3>
        <dl class="detail-list">
          <div>
            <dt>First party</dt>
            <dd>
              {{ details.firstPartyName || '—' }}
              <span v-if="details.isFirstParty" class="you-badge">You</span>
            </dd>
          </div>
          <div>
            <dt>Second party</dt>
            <dd>
              {{ details.secondPartyName || '—' }}
              <span v-if="!details.isFirstParty" class="you-badge">You</span>
            </dd>
          </div>
        </dl>
      </section>

      <section class="info-card">
        <h3>Mediator &amp; sessions</h3>
        <dl class="detail-list">
          <div>
            <dt>Mediator</dt>
            <dd>{{ details.mediatorName || '—' }}</dd>
          </div>
          <div>
            <dt>Sessions held</dt>
            <dd>{{ details.numberOfSessions != null ? details.numberOfSessions : '—' }}</dd>
          </div>
          <div v-if="sessionDatesLabel">
            <dt>Session dates</dt>
            <dd>{{ sessionDatesLabel }}</dd>
          </div>
        </dl>
      </section>

      <section class="info-card">
        <h3>Agreed terms</h3>
        <p class="intro-text">
          The parties have completed mediation on <strong>Kadr.live</strong> and, with the assistance of the
          assigned mediator, have agreed to the following resolution:
        </p>
        <div
          v-if="details.outcomeOfMediation"
          class="agreement-box"
          v-html="details.outcomeOfMediation"
        />
        <p v-else class="muted">No agreed terms were recorded for this case.</p>
      </section>

      <section class="info-card acknowledgment">
        <h3>Acknowledgment</h3>
        <p>
          By signing below, I confirm that I participated voluntarily in the mediation sessions on Kadr.live
          and that I agree to the outcome stated above for case <strong>{{ details.caseId }}</strong>.
        </p>
      </section>

      <section class="info-card">
        <h3>Your signature</h3>
        <p class="signing-as">Signing as: <strong>{{ details.userName }}</strong></p>
        <div class="signature-type-selector">
          <button
            type="button"
            :class="{ active: signatureType === 'digital' }"
            @click="setSignatureType('digital')"
          >
            Digital signature
          </button>
          <button
            type="button"
            :class="{ active: signatureType === 'manual' }"
            @click="setSignatureType('manual')"
          >
            Sign manually
          </button>
        </div>
        <div v-if="signatureType === 'digital'" class="digital-signature-box">
          <span class="cursive-signature">{{ userInitials }}</span>
        </div>
        <div v-else class="manual-signature">
          <canvas ref="signaturePad" class="signature-canvas"></canvas>
          <button type="button" class="btn-clear" @click="clearSignature">Clear</button>
        </div>

        <div class="phone-row">
          <label>Registered phone</label>
          <input :value="details.partyPhoneNumber || '—'" disabled />
        </div>
      </section>

      <p class="note">
        This signed record is the formal mediation completion document on Kadr.live. Further disputes about
        these terms should be addressed as provided in the agreement or under applicable law.
      </p>

      <button type="submit" class="btn-submit">Continue to verify &amp; sign</button>
    </form>

    <div v-else-if="submitted" class="empty-state">
      <h3>Thank you</h3>
      <p>Your signature has been recorded. You can close this page.</p>
    </div>
    <div v-else class="empty-state">
      <p>Loading agreement details…</p>
    </div>

    <b-modal v-model="showPhoneModal" hide-footer title="OTP verification" @hidden="resetPhoneModal">
      <div v-if="phoneStep === 1" class="phone-step-card">
        <h5 class="section-title">Verify your identity</h5>
        <small class="text-muted">We will send an OTP to your registered mobile number before signing this agreement.</small>
        <div class="phone-display">{{ phoneNumber || 'No phone on file' }}</div>
        <b-button variant="primary" block :disabled="!phoneNumber" @click="sendPhoneOtp">Send OTP</b-button>
      </div>
      <div v-else-if="phoneStep === 2" class="phone-step-card">
        <h5 class="section-title">Enter OTP</h5>
        <small class="text-muted">Enter the 6-digit OTP sent to your registered mobile number.</small>
        <b-form-group>
          <b-form-input
            v-model="phoneOtp"
            maxlength="6"
            placeholder="Enter 6-digit OTP"
            type="text"
            pattern="[0-9]{6}"
            autocomplete="off"
          />
        </b-form-group>
        <b-button variant="primary" block :disabled="!isPhoneOtpValid" @click="verifyPhoneOtp">Verify OTP</b-button>
      </div>
      <div v-else-if="phoneStep === 3" class="phone-step-card">
        <h5 class="section-title">Verification complete</h5>
        <small class="text-muted">Your phone number has been verified. You may now submit your signature.</small>
        <b-button variant="success" block @click="finalSubmit">Submit signature</b-button>
      </div>
    </b-modal>
  </div>
</template>

<script>
import SignaturePad from 'signature_pad'
import Alert from '../../components/sofbox/alert/Alert.vue'
import { getEffectiveLocale, getEffectiveTimezone } from '../../utils/timezone'

export default {
  name: 'AgreementSignature',
  components: { Alert },
  data () {
    return {
      signatureType: 'digital',
      signaturePad: null,
      details: null,
      submitted: false,
      alert: {
        visible: false,
        message: '',
        timeout: 5000,
        type: 'primary'
      },
      showPhoneModal: false,
      phoneStep: 1,
      phoneNumber: '',
      phoneOtp: '',
      otpRequestId: null
    }
  },
  computed: {
    userInitials () {
      const name = (this.details && this.details.userName) || ''
      return name
        .split(/\s+/)
        .filter(Boolean)
        .map((part) => part[0])
        .join('')
        .toUpperCase()
    },
    isPhoneOtpValid () {
      return /^[0-9]{6}$/.test(this.phoneOtp)
    },
    sessionDatesLabel () {
      const dates = this.details && this.details.sessionDates
      if (!dates || !Array.isArray(dates) || !dates.length) return ''
      return dates
        .filter(Boolean)
        .map((dt) => this.formatDate(dt, true))
        .join(', ')
    }
  },
  methods: {
    async fetchAgreementDetails () {
      const requestId = this.$route.query && this.$route.query.requestId
      if (!requestId) {
        this.showAlert('Request ID is missing in the URL.', 'danger')
        return
      }
      const response = await this.$store.dispatch('getAgreementDetailsForSignature', { requestId })
      if (response.success) {
        this.details = response.data
      }
    },
    showAlert (message, type) {
      this.alert = { message, type, visible: true, timeout: 5000 }
    },
    setSignatureType (type) {
      this.signatureType = type
      if (type === 'manual') this.initializeSignaturePad()
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
      const ratio = Math.max(window.devicePixelRatio || 1, 1)
      canvas.width = canvas.offsetWidth * ratio
      canvas.height = canvas.offsetHeight * ratio
      canvas.getContext('2d').scale(ratio, ratio)
    },
    clearSignature () {
      if (this.signaturePad) this.signaturePad.clear()
    },
    openPhoneModal () {
      if (this.signatureType === 'manual' && this.signaturePad && this.signaturePad.isEmpty()) {
        this.showAlert('Please provide your signature before continuing.', 'danger')
        return
      }
      if (this.signatureType === 'digital' && !this.userInitials) {
        this.showAlert('Unable to build a digital signature from your name.', 'danger')
        return
      }
      this.showPhoneModal = true
      this.phoneStep = 1
      this.phoneNumber = (this.details && this.details.partyPhoneNumber) || ''
      this.phoneOtp = ''
    },
    async sendPhoneOtp () {
      const response = await this.$store.dispatch('sendOtp', {
        recordId: this.$route.query.requestId
      })
      if (response.success) {
        this.otpRequestId = response.data.requestId
        this.phoneStep = 2
        this.phoneOtp = ''
        this.showAlert(response.message, 'success')
      }
    },
    async verifyPhoneOtp () {
      const response = await this.$store.dispatch('verifyOtp', {
        requestId: this.otpRequestId,
        otp: this.phoneOtp
      })
      if (response.success) this.phoneStep = 3
    },
    finalSubmit () {
      this.showPhoneModal = false
      this.submitFormReal()
    },
    resetPhoneModal () {
      this.phoneStep = 1
      this.phoneNumber = ''
      this.phoneOtp = ''
    },
    async submitFormReal () {
      let signature = ''
      if (this.signatureType === 'digital') {
        signature = this.userInitials
      } else if (this.signaturePad) {
        signature = this.signaturePad.toDataURL()
      }
      const response = await this.$store.dispatch('submitAgreementSignature', {
        requestId: this.$route.query.requestId,
        signature
      })
      if (response.success) {
        this.showAlert(response.message || 'Signature submitted successfully.', 'success')
        this.details = null
        this.submitted = true
      }
    },
    formatDate (dateString, includeTime = false) {
      if (!dateString) return '—'
      const date = new Date(dateString)
      if (Number.isNaN(date.getTime())) return '—'
      const options = includeTime
        ? {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
            timeZone: getEffectiveTimezone()
          }
        : {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            timeZone: getEffectiveTimezone()
          }
      return includeTime
        ? date.toLocaleString(getEffectiveLocale(), options)
        : date.toLocaleDateString(getEffectiveLocale(), options)
    }
  },
  mounted () {
    this.fetchAgreementDetails()
  }
}
</script>

<style scoped>
.form-container {
  max-width: 760px;
  margin: 0 auto;
  padding: 1.5rem 1.25rem 3rem;
  color: #374948;
}

.page-header {
  text-align: center;
  margin-bottom: 1.75rem;
}

.page-header h1 {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0 0 0.35rem;
  color: #0084ff;
}

.page-header h2 {
  font-size: 1.15rem;
  font-weight: 600;
  margin: 0 0 0.5rem;
}

.subtitle {
  margin: 0;
  color: #6d7693;
  font-size: 0.95rem;
  line-height: 1.45;
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.info-card {
  background: #fff;
  border: 1px solid #e8ebf5;
  border-radius: 12px;
  padding: 1.15rem 1.25rem;
  box-shadow: 0 4px 14px rgba(35, 55, 110, 0.06);
}

.info-card h3 {
  font-size: 0.95rem;
  font-weight: 700;
  margin: 0 0 0.85rem;
  color: #374948;
}

.detail-list {
  margin: 0;
  display: grid;
  gap: 0.75rem;
}

.detail-list dt {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: #6d7693;
  margin-bottom: 0.15rem;
}

.detail-list dd {
  margin: 0;
  font-weight: 600;
}

.you-badge {
  display: inline-block;
  margin-left: 0.4rem;
  padding: 0.1rem 0.45rem;
  border-radius: 999px;
  background: rgba(0, 132, 255, 0.1);
  color: #0084ff;
  font-size: 0.7rem;
  font-weight: 700;
  vertical-align: middle;
}

.intro-text {
  margin: 0 0 0.85rem;
  line-height: 1.55;
  color: #4a5168;
}

.agreement-box {
  border: 1px solid #e8ebf5;
  border-radius: 10px;
  background: #fafbff;
  padding: 0.9rem 1rem;
  line-height: 1.55;
  color: #4a5168;
  overflow-wrap: anywhere;
}

.muted {
  margin: 0;
  color: #6d7693;
}

.acknowledgment p {
  margin: 0;
  line-height: 1.55;
  color: #4a5168;
}

.signing-as {
  margin: 0 0 0.75rem;
  color: #6d7693;
  font-size: 0.9rem;
}

.signature-type-selector {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  flex-wrap: wrap;
}

.signature-type-selector button {
  padding: 0.5rem 0.9rem;
  border: 1px solid #d8deef;
  border-radius: 8px;
  background: #f8faff;
  cursor: pointer;
  font-size: 0.875rem;
  color: #374948;
}

.signature-type-selector button.active {
  background: #0084ff;
  border-color: #0084ff;
  color: #fff;
}

.digital-signature-box {
  border: 1px solid #d8deef;
  border-radius: 10px;
  min-height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fafbff;
}

.cursive-signature {
  font-family: 'Segoe Script', 'Brush Script MT', cursive;
  font-size: 1.75rem;
  color: #0084ff;
}

.manual-signature {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.signature-canvas {
  border: 1px solid #d8deef;
  border-radius: 10px;
  width: 100%;
  height: 150px;
  cursor: crosshair;
  background: #fff;
}

.btn-clear {
  align-self: flex-start;
  padding: 0.4rem 0.85rem;
  border: 1px solid #d8deef;
  border-radius: 8px;
  background: #fff;
  color: #374948;
  cursor: pointer;
}

.phone-row {
  margin-top: 1rem;
}

.phone-row label {
  display: block;
  font-size: 0.8rem;
  font-weight: 600;
  color: #6d7693;
  margin-bottom: 0.35rem;
}

.phone-row input {
  width: 100%;
  max-width: 280px;
  padding: 0.55rem 0.75rem;
  border: 1px solid #d8deef;
  border-radius: 8px;
  background: #f8faff;
}

.note {
  margin: 0;
  font-size: 0.85rem;
  line-height: 1.5;
  color: #6d7693;
}

.btn-submit {
  margin-top: 0.25rem;
  padding: 0.75rem 1.25rem;
  border: none;
  border-radius: 10px;
  background: #0084ff;
  color: #fff;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
}

.btn-submit:hover {
  filter: brightness(1.05);
}

.empty-state {
  text-align: center;
  padding: 2.5rem 1rem;
  color: #6d7693;
}

.phone-step-card {
  max-width: 400px;
  margin: 0 auto;
  padding: 0.5rem 0.25rem 1rem;
  text-align: center;
}

.section-title {
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 0.75rem;
  color: #333;
}

.phone-display {
  font-size: 1.05rem;
  margin: 1rem 0;
  color: #555;
  padding: 0.75rem;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #dee2e6;
}
</style>
