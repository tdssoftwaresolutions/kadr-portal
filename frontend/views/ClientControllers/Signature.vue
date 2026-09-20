<template>
  <div class="form-container">
    <Alert :message="alert.message" :type="alert.type" v-model="alert.visible" :timeout="alert.timeout"></Alert>

    <header class="page-header">
      <h1>{{ $t('signaturePages.brand') }}</h1>
      <h2>{{ $t('signaturePages.ackHeading') }}</h2>
      <p class="subtitle">{{ $t('signaturePages.ackSubtitle') }}</p>
    </header>

    <form v-if="details" @submit.prevent="openPhoneModal" class="agreement-layout">
      <div class="agreement-main">
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
            <div v-if="details.category">
              <dt>{{ $t('signaturePages.category') }}</dt>
              <dd>{{ details.category }}</dd>
            </div>
            <div>
              <dt>{{ $t('signaturePages.filedOn') }}</dt>
              <dd>{{ formatDate(details.filedAt) }}</dd>
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

        <section v-if="details.description" class="info-card">
          <h3>{{ $t('signaturePages.disputeSummary') }}</h3>
          <p class="description-text">{{ details.description }}</p>
        </section>

        <section class="info-card acknowledgment">
          <h3>{{ $t('signaturePages.acknowledgment') }}</h3>
          <p>
            {{ $t('signaturePages.ackBodyOne', { caseId: details.caseId }) }}
          </p>
          <p>
            {{ $t('signaturePages.ackBodyTwo') }}
          </p>
        </section>
      </div>

      <aside class="agreement-sidebar">
        <section class="info-card signature-card">
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
            <button type="button" class="btn-clear" @click="clearSignature">
              {{ $t('signaturePages.clear') }}
            </button>
          </div>

          <div class="phone-row">
            <label>{{ $t('signaturePages.registeredPhone') }}</label>
            <input :value="details.partyPhoneNumber || '—'" disabled />
          </div>

          <button type="submit" class="btn-submit">{{ $t('signaturePages.continueToVerifyAck') }}</button>
        </section>
      </aside>
    </form>

    <div v-else-if="submitted" class="empty-state">
      <h3>{{ $t('signaturePages.thankYou') }}</h3>
      <p>{{ $t('signaturePages.ackRecorded') }}</p>
    </div>
    <div v-else-if="loadError" class="empty-state">
      <h3>{{ loadError.title }}</h3>
      <p>{{ loadError.message }}</p>
    </div>
    <div v-else class="empty-state">
      <p>{{ $t('signaturePages.loadingCase') }}</p>
    </div>

    <b-modal v-model="showPhoneModal" no-footer :title="$t('signaturePages.otpVerification')" @hidden="resetPhoneModal">
      <div v-if="phoneStep === 1" class="phone-step-card">
        <h5 class="section-title">{{ $t('signaturePages.verifyIdentity') }}</h5>
        <small class="text-muted">{{ $t('signaturePages.otpIntroAck') }}</small>
        <div class="phone-display">{{ phoneNumber || $t('signaturePages.noPhoneOnFile') }}</div>
        <b-button variant="primary" class="w-100" :disabled="!phoneNumber" @click="sendPhoneOtp">{{ $t('signaturePages.sendOtp') }}</b-button>
      </div>
      <div v-else-if="phoneStep === 2" class="phone-step-card">
        <h5 class="section-title">{{ $t('signaturePages.enterOtp') }}</h5>
        <small class="text-muted">{{ $t('signaturePages.otpEnterInstruction') }}</small>
        <div v-if="devOtp" class="dev-otp-banner">
          <strong>{{ $t('signaturePages.testModeLabel') }}</strong>
          <p>{{ $t('signaturePages.testModeOtpHint') }}</p>
          <span class="dev-otp-code">{{ devOtp }}</span>
        </div>
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
        <b-button variant="primary" class="w-100" :disabled="!isPhoneOtpValid" @click="verifyPhoneOtp">{{ $t('signaturePages.verifyOtp') }}</b-button>
      </div>
      <div v-else-if="phoneStep === 3" class="phone-step-card">
        <h5 class="section-title">{{ $t('signaturePages.verificationComplete') }}</h5>
        <small class="text-muted otp-verified-text">{{ $t('signaturePages.verifiedAck') }}</small>
        <b-button variant="success" class="w-100" @click="finalSubmit">{{ $t('signaturePages.submitAcknowledgment') }}</b-button>
      </div>
    </b-modal>
  </div>
</template>

<script>
import SignaturePad from 'signature_pad'
import Alert from '../../components/sofbox/alert/Alert.vue'
import { getEffectiveLocale, getEffectiveTimezone } from '../../utils/timezone'
import { sofbox } from '../../config/pluginInit'

export default {
  name: 'Signature',
  components: { Alert },
  data () {
    return {
      signatureType: 'digital',
      signaturePad: null,
      details: null,
      submitted: false,
      loadError: null,
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
      otpRequestId: null,
      // TEMPORARY: only ever set while the WhatsApp channel is disabled —
      // see authController.sendOtp. Remove once WhatsApp is live.
      devOtp: null
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
    }
  },
  methods: {
    async fetchSignatureRequestDetails () {
      const requestId = this.$route.query && this.$route.query.requestId
      if (!requestId) {
        this.loadError = {
          title: this.$t('signaturePages.requestInvalidTitle'),
          message: this.$t('signaturePages.requestInvalidBody')
        }
        return
      }
      const response = await this.$store.dispatch('getSignatureRequestDetails', { requestId })
      if (response.success) {
        this.details = response.data
      } else if (response.status === 404) {
        this.loadError = {
          title: this.$t('signaturePages.requestInvalidTitle'),
          message: this.$t('signaturePages.requestInvalidBody')
        }
      } else {
        this.loadError = {
          title: this.$t('signaturePages.requestLoadErrorTitle'),
          message: this.$t('signaturePages.requestLoadErrorBody')
        }
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
        this.devOtp = response.data.otp || null
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
      this.devOtp = null
    },
    async submitFormReal () {
      let signature = ''
      if (this.signatureType === 'digital') {
        signature = this.userInitials
      } else if (this.signaturePad) {
        signature = this.signaturePad.toDataURL()
      }
      const response = await this.$store.dispatch('submitSignature', {
        requestId: this.$route.query.requestId,
        signature
      })
      if (response.success) {
        this.showAlert(response.message || this.$t('signaturePages.acknowledgmentSubmitted'), 'success')
        this.details = null
        this.submitted = true
      }
    },
    formatDate (dateString) {
      if (!dateString) return '—'
      const date = new Date(dateString)
      if (Number.isNaN(date.getTime())) return '—'
      return date.toLocaleDateString(getEffectiveLocale(), {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        timeZone: getEffectiveTimezone()
      })
    }
  },
  mounted () {
    // Standalone route (no layout wrapper) — house convention for every
    // URL-addressable page, so a reload/direct-link open behaves correctly.
    sofbox.index()
    this.fetchSignatureRequestDetails()
  }
}
</script>

<style scoped>
.form-container {
  max-width: 1040px;
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

/* Two-column page layout: readable case info on the left, the signing
   action sticky on the right. Collapses to one column below 900px,
   matching the breakpoint style used in signupForm.css. */
.agreement-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr);
  gap: 1.25rem;
  align-items: start;
}

.agreement-main {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-width: 0;
}

.agreement-sidebar {
  position: sticky;
  top: 1rem;
}

@media (max-width: 900px) {
  .agreement-layout {
    grid-template-columns: 1fr;
  }
  .agreement-sidebar {
    position: static;
  }
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

/* Label/value pairs in two columns (same pattern as .field-grid in
   signupForm.css) — collapses to one column on narrow screens. */
.detail-list {
  margin: 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem 1.5rem;
}

.detail-list .detail-item--full {
  grid-column: 1 / -1;
}

@media (max-width: 575.98px) {
  .detail-list {
    grid-template-columns: 1fr;
  }
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

.description-text {
  margin: 0;
  white-space: pre-wrap;
  line-height: 1.5;
  color: var(--kadr-text-secondary);
}

.acknowledgment p {
  margin: 0 0 0.75rem;
  line-height: 1.55;
  color: var(--kadr-text-secondary);
}

.acknowledgment p:last-child {
  margin-bottom: 0;
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

.btn-submit {
  width: 100%;
  margin-top: 1rem;
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

.otp-verified-text {
  display: block;
  margin: 0.5rem 0 1.25rem;
}

/* TEMPORARY: only shown while WhatsApp delivery is disabled — see devOtp. */
.dev-otp-banner {
  margin: 0.75rem 0 1rem;
  padding: 0.75rem 1rem;
  background: var(--kadr-status-warning-bg);
  color: var(--kadr-status-warning-text);
  border: 1px dashed var(--kadr-warning);
  border-radius: 8px;
  text-align: left;
}

.dev-otp-banner strong {
  display: block;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 0.25rem;
}

.dev-otp-banner p {
  margin: 0 0 0.5rem;
  font-size: 0.85rem;
}

.dev-otp-code {
  display: inline-block;
  font-size: 1.4rem;
  font-weight: 700;
  letter-spacing: 0.15em;
  color: var(--kadr-text-primary);
}
</style>
