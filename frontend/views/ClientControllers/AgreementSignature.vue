<template>
  <div class="form-container">
    <Alert :message="alert.message" :type="alert.type" v-model="alert.visible" :timeout="alert.timeout"></Alert>

    <header class="page-header">
      <h1>{{ $t('signaturePages.brand') }}</h1>
      <h2>{{ $t('signaturePages.agreementHeading') }}</h2>
      <p class="subtitle">
        {{ $t('signaturePages.agreementSubtitle') }}
      </p>
    </header>

    <form v-if="details" @submit.prevent="openPhoneModal" class="form-section">
      <section class="info-card">
        <h3>{{ $t('signaturePages.caseInformation') }}</h3>
        <dl class="detail-list">
          <div>
            <dt>{{ $t('signaturePages.caseId') }}</dt>
            <dd>{{ details.caseId || '—' }}</dd>
          </div>
          <div v-if="details.caseType">
            <dt>{{ $t('signaturePages.caseType') }}</dt>
            <dd>{{ details.caseType }}</dd>
          </div>
          <div>
            <dt>{{ $t('signaturePages.filedOn') }}</dt>
            <dd>{{ formatDate(details.filedAt) }}</dd>
          </div>
          <div>
            <dt>{{ $t('signaturePages.agreementDate') }}</dt>
            <dd>{{ formatDate(details.mediationCompletionDate) }}</dd>
          </div>
        </dl>
      </section>

      <section class="info-card">
        <h3>{{ $t('signaturePages.parties') }}</h3>
        <dl class="detail-list">
          <div>
            <dt>{{ $t('signaturePages.firstParty') }}</dt>
            <dd>
              {{ details.firstPartyName || '—' }}
              <span v-if="details.isFirstParty" class="you-badge">{{ $t('signaturePages.you') }}</span>
            </dd>
          </div>
          <div>
            <dt>{{ $t('signaturePages.secondParty') }}</dt>
            <dd>
              {{ details.secondPartyName || '—' }}
              <span v-if="!details.isFirstParty" class="you-badge">{{ $t('signaturePages.you') }}</span>
            </dd>
          </div>
        </dl>
      </section>

      <section class="info-card">
        <h3>{{ $t('signaturePages.mediatorAndSessions') }}</h3>
        <dl class="detail-list">
          <div>
            <dt>{{ $t('signaturePages.mediator') }}</dt>
            <dd>{{ details.mediatorName || '—' }}</dd>
          </div>
          <div>
            <dt>{{ $t('signaturePages.sessionsHeld') }}</dt>
            <dd>{{ details.numberOfSessions != null ? details.numberOfSessions : '—' }}</dd>
          </div>
          <div v-if="sessionDatesLabel">
            <dt>{{ $t('signaturePages.sessionDates') }}</dt>
            <dd>{{ sessionDatesLabel }}</dd>
          </div>
        </dl>
      </section>

      <section class="info-card">
        <h3>{{ $t('signaturePages.agreedTerms') }}</h3>
        <p class="intro-text">
          {{ $t('signaturePages.agreedTermsIntro', { brand: $t('signaturePages.brand') }) }}
        </p>
        <div
          v-if="details.outcomeOfMediation"
          class="agreement-box"
          v-html="details.outcomeOfMediation"
        />
        <p v-else class="muted">{{ $t('signaturePages.noAgreedTerms') }}</p>
      </section>

      <section class="info-card acknowledgment">
        <h3>{{ $t('signaturePages.acknowledgment') }}</h3>
        <p>
          {{ $t('signaturePages.agreementAckBody', { caseId: details.caseId }) }}
        </p>
      </section>

      <section class="info-card">
        <h3>{{ $t('signaturePages.yourSignature') }}</h3>
        <p class="signing-as">{{ $t('signaturePages.signingAs') }} <strong>{{ details.userName }}</strong></p>
        <div class="signature-type-selector">
          <button
            type="button"
            :class="{ active: signatureType === 'digital' }"
            @click="setSignatureType('digital')"
          >
            {{ $t('signaturePages.digitalSignature') }}
          </button>
          <button
            type="button"
            :class="{ active: signatureType === 'manual' }"
            @click="setSignatureType('manual')"
          >
            {{ $t('signaturePages.signManually') }}
          </button>
        </div>
        <div v-if="signatureType === 'digital'" class="digital-signature-box">
          <span class="cursive-signature">{{ userInitials }}</span>
        </div>
        <div v-else class="manual-signature">
          <canvas ref="signaturePad" class="signature-canvas"></canvas>
          <button type="button" class="btn-clear" @click="clearSignature">{{ $t('signaturePages.clear') }}</button>
        </div>

        <div class="phone-row">
          <label>{{ $t('signaturePages.registeredPhone') }}</label>
          <input :value="details.partyPhoneNumber || '—'" disabled />
        </div>
      </section>

      <p class="note">
        {{ $t('signaturePages.agreementNote') }}
      </p>

      <button type="submit" class="btn-submit">{{ $t('signaturePages.continueToVerifyAgreement') }}</button>
    </form>

    <div v-else-if="submitted" class="empty-state">
      <h3>{{ $t('signaturePages.thankYou') }}</h3>
      <p>{{ $t('signaturePages.agreementRecorded') }}</p>
    </div>
    <div v-else class="empty-state">
      <p>{{ $t('signaturePages.loadingAgreement') }}</p>
    </div>

    <b-modal v-model="showPhoneModal" no-footer :title="$t('signaturePages.otpVerification')" @hidden="resetPhoneModal">
      <div v-if="phoneStep === 1" class="phone-step-card">
        <h5 class="section-title">{{ $t('signaturePages.verifyIdentity') }}</h5>
        <small class="text-muted">{{ $t('signaturePages.otpIntroAgreement') }}</small>
        <div class="phone-display">{{ phoneNumber || $t('signaturePages.noPhoneOnFile') }}</div>
        <b-button variant="primary" block :disabled="!phoneNumber" @click="sendPhoneOtp">{{ $t('signaturePages.sendOtp') }}</b-button>
      </div>
      <div v-else-if="phoneStep === 2" class="phone-step-card">
        <h5 class="section-title">{{ $t('signaturePages.enterOtp') }}</h5>
        <small class="text-muted">{{ $t('signaturePages.otpEnterInstruction') }}</small>
        <b-form-group>
          <b-form-input
            v-model="phoneOtp"
            maxlength="6"
            :placeholder="$t('signaturePages.otpPlaceholder')"
            type="text"
            pattern="[0-9]{6}"
            autocomplete="off"
          />
        </b-form-group>
        <b-button variant="primary" block :disabled="!isPhoneOtpValid" @click="verifyPhoneOtp">{{ $t('signaturePages.verifyOtp') }}</b-button>
      </div>
      <div v-else-if="phoneStep === 3" class="phone-step-card">
        <h5 class="section-title">{{ $t('signaturePages.verificationComplete') }}</h5>
        <small class="text-muted">{{ $t('signaturePages.verifiedAgreement') }}</small>
        <b-button variant="success" block @click="finalSubmit">{{ $t('signaturePages.submitSignature') }}</b-button>
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
        this.showAlert(this.$t('signaturePages.requestIdMissing'), 'danger')
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
        this.showAlert(this.$t('signaturePages.provideSignature'), 'danger')
        return
      }
      if (this.signatureType === 'digital' && !this.userInitials) {
        this.showAlert(this.$t('signaturePages.digitalSignatureFailed'), 'danger')
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
        this.showAlert(response.message || this.$t('signaturePages.signatureSubmitted'), 'success')
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
  color: var(--kadr-text-primary);
}

.page-header {
  text-align: center;
  margin-bottom: 1.75rem;
}

.page-header h1 {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0 0 0.35rem;
  color: var(--kadr-primary);
}

.page-header h2 {
  font-size: 1.15rem;
  font-weight: 600;
  margin: 0 0 0.5rem;
}

.subtitle {
  margin: 0;
  color: var(--kadr-text-muted);
  font-size: 0.95rem;
  line-height: 1.45;
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.info-card {
  background: var(--kadr-bg-surface);
  border: 1px solid var(--kadr-border-info);
  border-radius: 12px;
  padding: 1.15rem 1.25rem;
  box-shadow: var(--kadr-shadow-sm);
}

.info-card h3 {
  font-size: 0.95rem;
  font-weight: 700;
  margin: 0 0 0.85rem;
  color: var(--kadr-text-primary);
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
  color: var(--kadr-text-muted);
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
  background: var(--kadr-primary-soft);
  color: var(--kadr-primary);
  font-size: 0.7rem;
  font-weight: 700;
  vertical-align: middle;
}

.intro-text {
  margin: 0 0 0.85rem;
  line-height: 1.55;
  color: var(--kadr-text-secondary);
}

.agreement-box {
  border: 1px solid var(--kadr-border-info);
  border-radius: 10px;
  background: var(--kadr-surface-info);
  padding: 0.9rem 1rem;
  line-height: 1.55;
  color: var(--kadr-text-secondary);
  overflow-wrap: anywhere;
}

.muted {
  margin: 0;
  color: var(--kadr-text-muted);
}

.acknowledgment p {
  margin: 0;
  line-height: 1.55;
  color: var(--kadr-text-secondary);
}

.signing-as {
  margin: 0 0 0.75rem;
  color: var(--kadr-text-muted);
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
  border: 1px solid var(--kadr-border-strong);
  border-radius: 8px;
  background: var(--kadr-surface-info);
  cursor: pointer;
  font-size: 0.875rem;
  color: var(--kadr-text-primary);
}

.signature-type-selector button.active {
  background: var(--kadr-primary);
  border-color: var(--kadr-primary);
  color: var(--kadr-text-on-primary);
}

.digital-signature-box {
  border: 1px solid var(--kadr-border-strong);
  border-radius: 10px;
  min-height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--kadr-surface-info);
}

.cursive-signature {
  font-family: 'Segoe Script', 'Brush Script MT', cursive;
  font-size: 1.75rem;
  color: var(--kadr-primary);
}

.manual-signature {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.signature-canvas {
  border: 1px solid var(--kadr-border-strong);
  border-radius: 10px;
  width: 100%;
  height: 150px;
  cursor: crosshair;
  background: var(--kadr-bg-surface);
}

.btn-clear {
  align-self: flex-start;
  padding: 0.4rem 0.85rem;
  border: 1px solid var(--kadr-border-strong);
  border-radius: 8px;
  background: var(--kadr-bg-surface);
  color: var(--kadr-text-primary);
  cursor: pointer;
}

.phone-row {
  margin-top: 1rem;
}

.phone-row label {
  display: block;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--kadr-text-muted);
  margin-bottom: 0.35rem;
}

.phone-row input {
  width: 100%;
  max-width: 280px;
  padding: 0.55rem 0.75rem;
  border: 1px solid var(--kadr-border-strong);
  border-radius: 8px;
  background: var(--kadr-surface-info);
}

.note {
  margin: 0;
  font-size: 0.85rem;
  line-height: 1.5;
  color: var(--kadr-text-muted);
}

.btn-submit {
  margin-top: 0.25rem;
  padding: 0.75rem 1.25rem;
  border: none;
  border-radius: 10px;
  background: var(--kadr-primary);
  color: var(--kadr-text-on-primary);
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
  color: var(--kadr-text-muted);
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
  color: var(--kadr-text-primary);
}

.phone-display {
  font-size: 1.05rem;
  margin: 1rem 0;
  color: var(--kadr-text-secondary);
  padding: 0.75rem;
  background: var(--kadr-surface-muted);
  border-radius: 8px;
  border: 1px solid var(--kadr-border-strong);
}
</style>
