<template>
  <div class="form-container">
    <Alert :message="alert.message" :type="alert.type" v-model="alert.visible" :timeout="alert.timeout"></Alert>
    <h1>Kadr.live</h1>
        <h2>MEDIATION COMPLETION DOCUMENT</h2>
        <hr />
    <form @submit.prevent="openPhoneModal" class="form-section" v-if="data != null">
      <div class="document-container">
        <section>
          <h4>1. Case Information</h4>
          <p><strong>Case ID:</strong> {{ data.caseId }}</p>
          <p><strong>Case Type:</strong> {{ data.caseType }}</p>
          <p><strong>Date of Case Registration:</strong> {{ formatDate(data.dateOfCaseRegistration,'display') }}</p>
          <p><strong>Mediation Completion Date:</strong> {{ formatDate(data.mediationCompletionDate,'display') }}</p>
        </section>

        <section>
          <h4>2. Party Details</h4>
          <p><strong>First Party (Name):</strong> {{ data.firstPartyName }}</p>
          <p><strong>Second Party (Name):</strong> {{ data.secondPartyName }}</p>
        </section>

        <section>
          <h4>3. Mediator Details</h4>
          <p><strong>Mediator Name:</strong> {{ data.mediatorName }}</p>
          <p><strong>Number of Mediation Sessions Held:</strong> {{ data.numberOfSessions }}</p>
          <p><strong>Dates of Mediation Sessions:</strong>
            {{ formatSessionDates(data.sessionDates) }}
          </p>
        </section>

        <section>
          <h4>4. Outcome of Mediation</h4>
          <p>
            This is to certify that the mediation process initiated at
            <strong>Rouse Avenue Mediation Center</strong> has been completed
            successfully. Both parties, with the assistance of the assigned mediator,
            have mutually agreed upon the following resolution:
          </p>
          <div class="agreement-box" style="margin-bottom:1rem;" v-html="data.outcomeOfMediation">
          </div>
        </section>

        <section>
          <h4>5. Acknowledgement</h4>
          <p>
            By signing below, both parties confirm that they participated voluntarily
            in the mediation sessions and are in full agreement with the outcome as
            stated above.
          </p>
        </section>

        <section class="signature-block">
          <div>
            <label>Your Signature:</label>
            <div class="signature-type-selector">
              <button
                type="button"
                :class="{ active: signature_type === 'digital' }"
                @click="setSignatureType('digital')">
                Digital Signature
              </button>
              <button
                type="button"
                :class="{ active: signature_type === 'manual' }"
                @click="setSignatureType('manual')">
                Sign Manually
              </button>
            </div>
            <div v-if="signature_type === 'digital'" class="digital-signature-box">
              <span class="cursive-signature">{{ userInitials }}</span>
            </div>
            <div v-else-if="signature_type === 'manual'" class="manual-signature">
              <canvas ref="signaturePad" class="signature-canvas"></canvas>
              <button type="button" @click="clearSignature('plaintiff')" class="btn btn-secondary" style="margin: 0px;width: 100%;">
                Clear <i class="ri-refresh-line"></i>
              </button>
            </div>
          </div>
        </section>

        <p class="note">
          <strong>Note:</strong> This document serves as a formal record of the completion
          of mediation. Any further disputes regarding this agreement must be addressed as per
          the terms mentioned above or escalated as per the relevant legal procedures.
        </p>
      </div>
      <button type="submit">Submit</button>
    </form>

    <!-- Phone Verification Modal -->
    <b-modal v-model="showPhoneModal" hide-footer title="Phone Verification" @hidden="resetPhoneModal">
      <div>
        <div v-if="phoneStep === 1" class="phone-step-card">
          <h5 class="section-title">Verify Your Identity</h5>
          <small class="text-muted">We'll send an OTP to this number to confirm your identity before signing the agreement.</small>
          <div class="phone-display">{{ phoneNumber }}</div>
          <b-button variant="primary" block @click="sendPhoneOtp">Send OTP</b-button>
        </div>
        <div v-else-if="phoneStep === 2" class="phone-step-card">
          <h5 class="section-title" style="text-align: center;">Enter OTP</h5>
          <small class="text-muted">
            Please enter the 6-digit OTP sent to your registered mobile number.
          </small>
          <b-form-group>
            <b-form-input
              v-model="phoneOtp"
              maxlength="6"
              placeholder="Enter 6-digit OTP"
              type="text"
              pattern="[0-9]{6}"
              autocomplete="off"
            ></b-form-input>
          </b-form-group>
          <b-button variant="primary" block :disabled="!isPhoneOtpValid" @click="verifyPhoneOtp">Verify OTP</b-button>
        </div>
        <div v-else-if="phoneStep === 3" class="phone-step-card">
          <div class="phone-verification-success">
            <h5 class="section-title">Verification Complete</h5>
            <small class="text-muted">
            Your phone number has been successfully verified. You may now proceed to sign the agreement.
            </small>
            <b-button variant="success" block @click="finalSubmit">Proceed</b-button>
          </div>
        </div>
      </div>
    </b-modal>
  </div>
</template>

<script>
import SignaturePad from 'signature_pad'
import { sofbox } from '../../config/pluginInit'
import Alert from '../../components/sofbox/alert/Alert.vue'

export default {
  name: 'Signature',
  components: {
    Alert
  },
  data () {
    return {
      signature_type: 'digital',
      signaturePad: null,
      data: null,
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
      matchedPhone: ''
    }
  },
  computed: {
    userInitials () {
      return this.data?.userName?.split(' ')
        .map((name) => name[0])
        .join('')
        .toUpperCase()
    },
    isPhoneOtpValid () {
      return /^[0-9]{6}$/.test(this.phoneOtp)
    }
  },
  methods: {
    formatDate (dateString, type = 'display', options = {}) {
      if (!dateString) return ''

      const date = new Date(dateString)

      const userLocale = navigator.language || 'en-IN'
      const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
      switch (type) {
        case 'date':{
          const year = date.getFullYear()
          const month = `${date.getMonth() + 1}`.padStart(2, '0')
          const day = `${date.getDate()}`.padStart(2, '0')
          return `${year}-${month}-${day}`
        }
        case 'datetime-local': {
          const year = date.getFullYear()
          const month = `${date.getMonth() + 1}`.padStart(2, '0')
          const day = `${date.getDate()}`.padStart(2, '0')
          const hour = `${date.getHours()}`.padStart(2, '0')
          const minute = `${date.getMinutes()}`.padStart(2, '0')
          return `${year}-${month}-${day}T${hour}:${minute}`
        }

        case 'display':
        default: {
          const { includeDate = true, includeTime = false } = options
          const formatOptions = {}
          if (includeDate) {
            Object.assign(formatOptions, {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit'
            })
          }

          if (includeTime) {
            Object.assign(formatOptions, {
              hour: 'numeric',
              minute: 'numeric',
              hour12: true
            })
          }

          let method = 'toLocaleString'
          if (includeDate && !includeTime) method = 'toLocaleDateString'
          else if (!includeDate && includeTime) method = 'toLocaleTimeString'

          return date[method](userLocale, {
            ...formatOptions,
            timeZone: userTimeZone
          })
        }
      }
    },
    async getAgreementDetailsForSignature () {
      const requestId = this.$route.query?.requestId
      if (!requestId) return this.showAlert('Request ID is missing in the URL.', 'danger')
      const response = await this.$store.dispatch('getAgreementDetailsForSignature', { requestId })
      if (response.success) this.data = response.data
    },
    showAlert (message, type) {
      this.alert = {
        message,
        type,
        visible: true
      }
    },
    setSignatureType (type) {
      this.signature_type = type
      if (type === 'manual') {
        this.initializeSignaturePad()
      }
    },
    initializeSignaturePad () {
      this.$nextTick(() => {
        const canvas = this.$refs.signaturePad
        if (!canvas) {
          console.error('SignaturePad canvas element is not found.')
          return
        }
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
      if (this.signaturePad) {
        this.signaturePad.clear()
      }
    },
    openPhoneModal () {
      this.showPhoneModal = true
      this.phoneStep = 1
      this.phoneNumber = this.data.partyPhoneNumber
      this.phoneOtp = ''
      this.matchedPhone = ''
    },
    async sendPhoneOtp () {
      const response = await this.$store.dispatch('sendOtp', { recordId: this.$route.query?.requestId })
      if (response.success) {
        this.requestId = response.data.requestId
        this.phoneStep = 2
        this.phoneOtp = ''
        this.showAlert(response.message, 'success')
      }
    },
    async verifyPhoneOtp () {
      const response = await this.$store.dispatch('verifyOtp', { requestId: this.requestId, otp: this.phoneOtp })
      if (response.success) {
        this.phoneStep = 3
      }
    },
    finalSubmit () {
      this.showPhoneModal = false
      this.submitFormReal()
    },
    resetPhoneModal () {
      this.phoneStep = 1
      this.phoneNumber = ''
      this.phoneOtp = ''
      this.matchedPhone = ''
    },
    async submitFormReal () {
      const requestBody = {
        requestId: this.$route.query.requestId,
        signature: ''
      }
      if (this.signature_type === 'digital') {
        requestBody.signature = this.userInitials
      } else if (this.signature_type === 'manual' && this.signaturePad) {
        requestBody.signature = this.signaturePad.toDataURL()
      }

      const response = await this.$store.dispatch('submitAgreementSignature', requestBody)
      if (response.success) {
        this.showAlert(response.message, 'success')
        this.data = null
      }
    },
    formatSessionDates (dates) {
      if (!dates || !Array.isArray(dates) || dates.length === 0) return '-'
      return dates
        .map(dt => {
          if (!dt) return ''
          return this.formatDate(dt, 'display', { includeTime: true })
        })
        .join(', ')
    }
  },
  mounted () {
    sofbox.index()
    this.getAgreementDetailsForSignature()
  }
}
</script>

<style scoped>
.form-container {
  max-width: 1200px;
  margin: auto;
  font-family: Arial, sans-serif;
  padding: 25px;
  background-color: #f9f9f9;
  border: 1px solid #aaa;
  box-shadow: 2px 2px 8px rgba(0, 0, 0, 0.1);
}

.header {
  text-align: center;
  font-size: 20px;
  background-color: #e6e6e6;
  padding: 12px;
  font-weight: bold;
  margin-bottom: 30px;
  border: 1px solid #ccc;
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-row {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}

label {
  min-width: 200px;
  font-weight: bold;
}

input {
  padding: 6px;
  min-width: 180px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.inline-input {
  display: inline;
  width: auto;
  margin-left: 10px;
  vertical-align: middle;
}

.phone-step-card {
  max-width: 400px;
  margin: 0 auto;
  padding: 24px;
  border-radius: 12px;
  background-color: #ffffff;
  text-align: center;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.section-title {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 16px;
  color: #333;
}

.phone-display {
  font-size: 18px;
  margin-bottom: 20px;
  color: #555;
  padding: 12px;
  background-color: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #dee2e6;
}

.referral-section {
  background-color: #fff;
  padding: 15px;
  border: 1px solid #ccc;
  margin-top: 15px;
}

.referral-section h2 {
  text-align: center;
  text-transform: uppercase;
  margin-bottom: 15px;
  font-size: 18px;
}

.referral-section p {
  margin: 10px 0;
  line-height: 1.5;
}

.signature-section {
  justify-content: space-between;
  margin-top: 20px;
}

.signature-section > div {
  flex: 1;
  min-width: 350px;
}

button {
  width: 150px;
  margin: 30px auto 0 auto;
  padding: 10px;
  background-color: #2c6faf;
  color: white;
  border: none;
  border-radius: 5px;
  font-size: 16px;
}

.party-input-group  {
  width: 30%; /* Adjust width to take full available space */
}

.party-input-group input {
  width: 100%; /* Adjust width to take full available space */
}

.signature-type-selector {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
}

.signature-type-selector button {
  padding: 8px 15px;
  border: 1px solid #ccc;
  border-radius: 5px;
  background-color: #f0f0f0;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.3s, color 0.3s;
  color: black; /* Default text color for non-selected buttons */
}

.signature-type-selector button.active {
  background-color: #2c6faf;
  color: white;
  border-color: #2c6faf;
}

.signature-type-selector button:hover {
  background-color: #d9e6f2;
}

.digital-signature-box {
  border: 1px solid #ccc; /* Changed to solid border */
  width: 100%; /* Fixed width */
  height: 150px; /* Fixed height */
  display: flex; /* Center align content */
  justify-content: center;
  align-items: center;
  margin-top: 10px;
  text-align: center;
}

.cursive-signature {
  font-family: Cursive; /* Added cursive font family */
  font-size: 24px; /* Added font size 24 */
  color: #2c6faf;
}

.manual-signature {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.signature-canvas {
  border: 1px solid #ccc;
  width: 100%;
  height: 150px; /* Reduced height */
  margin-top: 10px;
  cursor: crosshair;
}

.btn-icon {
  padding: 5px;
  font-size: 16px;
  border-radius: 50%;
  display: inline-flex;
  justify-content: center;
  align-items: center;
}

.aadhar-modal-content {
  padding: 20px;
}

.aadhar-verification-success {
  text-align: center;
  margin-top: 20px;
}

.aadhar-verification-success b-icon {
  font-size: 48px;
}

.aadhar-verification-success h5 {
  margin: 10px 0;
}

.aadhar-verification-success p {
  margin: 5px 0;
}

.phone-verification-success {
  text-align: center;
  margin-top: 20px;
}

.phone-verification-success b-icon {
  font-size: 48px;
}

.phone-verification-success h5 {
  margin: 10px 0;
}

.phone-verification-success p {
  margin: 5px 0;
}
</style>
