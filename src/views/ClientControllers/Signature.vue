<template>
  <div class="form-container">
    <Alert :message="alert.message" :type="alert.type" v-model="alert.visible" :timeout="alert.timeout"></Alert>
    <h1 class="header">
      Kadr.live
    </h1>

    <form @submit.prevent="openPhoneModal" class="form-section" v-if="signatureRequestDetails != null">
      <div class="form-row">
        <label>CASE ID:</label>
        <input disabled :value="signatureRequestDetails.caseId" />
        <label>Next Date of Hearing in Referral Court:</label>
        <input type="date" :value="formatDate(signatureRequestDetails.hearing_date,'date')" disabled />
      </div>

      <div class="form-row">
        <label>Name of the Referral Judge:</label>
        <input :value="signatureRequestDetails.user_cases_judgeTouser.name" disabled />
      </div>

      <div class="form-row">
        <label>Suit No/Case No:</label>
        <input :value="signatureRequestDetails.suit_no" disabled />
      </div>

      <div class="form-row">
        <label>Name of the Parties:</label>
        <div class="party-input-group">
          <input :value="signatureRequestDetails.user_cases_first_partyTouser.name" disabled />
        </div>
        <span>vs</span>
        <div class="party-input-group">
          <input :value="signatureRequestDetails.user_cases_second_partyTouser.name" disabled />
        </div>
      </div>

      <div class="form-row">
        <label>Date of Institution of Case:</label>
        <input type="date" :value="formatDate(signatureRequestDetails.institution_date,'date')" disabled />
        <label>Nature of Suit:</label>
        <input :value="signatureRequestDetails.nature_of_suit" disabled />
      </div>

      <div class="form-row">
        <label>Stage of the Case at Time of Referral:</label>
        <input :value="signatureRequestDetails.stage" disabled />
        <label>Number of Hearings at Time of Referral:</label>
        <input :value="signatureRequestDetails.hearing_count" disabled />
      </div>

      <!-- Mediation Referral Order Block -->
      <div class="referral-section">
        <h2>Mediation Referral Order</h2>
        <p>
          This Court, having conferred with the parties and having determined that this matter could benefit from
          mediation, and pursuant to Section 89 of the CPC, Orders that the following persons shall attend mediation as
          provided by the court at no cost to the Parties.
        </p>

        <p>
          The above parties and advocates will report at <strong>Mediation Centre, Rouse Avenue Courts Complex,
          New Delhi</strong> on:
          <input type="datetime-local" :value="formatDate(signatureRequestDetails.mediation_date_time,'datetime-local')" class="inline-input" disabled />.
        </p>

        <p>
          The Mediation will be conducted by a specially trained <strong>Mediator</strong>.
        </p>

        <p>
          If a settlement agreeable to the parties is reached, the terms shall be recorded by the mediator and signed
          by the parties/their counsel and returned to this Court for further appropriate orders.
        </p>

        <p>
          If no settlement is reached, neither the parties, the advocates, nor the mediator may disclose to this court
          anything that was discussed at the mediation.
        </p>
      </div>

      <!-- Signatures Section -->
      <div class="form-row signature-section">
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
      </div>
      <label>Phone No:</label>
      <input v-if="isFirstPaty" v-model="signatureRequestDetails.plaintiff_phone" disabled/>
      <input v-else v-model="signatureRequestDetails.respondent_phone" disabled/>
      <label>Name of Advocate:</label>
      <input v-if="isFirstPaty" v-model="signatureRequestDetails.plaintiff_advocate" disabled/>
      <input v-else v-model="signatureRequestDetails.respondent_advocate" disabled/>
      <button type="submit">Submit</button>
    </form>

    <!-- Phone Verification Modal -->
    <b-modal v-model="showPhoneModal" hide-footer title="OTP Verification" @hidden="resetPhoneModal">
      <div>
        <div v-if="phoneStep === 1" class="phone-step-card">
          <h5 class="section-title">Verify Your Identity</h5>
          <small class="text-muted">We'll send an OTP to this number to confirm your identity before accepting the mediation.</small>
          <div class="phone-display">{{ phoneNumber }}</div>
          <b-button variant="primary" block @click="sendPhoneOtp">Send OTP</b-button>
        </div>
        <div v-else-if="phoneStep === 2">
          <h5 class="section-title">Enter OTP</h5>
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
        <div v-else-if="phoneStep === 3">
          <div class="phone-verification-success">
            <h5 class="section-title">Verification Complete</h5>
            <small class="text-muted">
            Your phone number has been successfully verified. You may now proceed to accept the mediation.
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
      userName: '',
      isFirstPaty: false,
      signatureRequestDetails: null,
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
      requestId: null
    }
  },
  computed: {
    userInitials () {
      return this.userName
        .split(' ')
        .map((name) => name[0])
        .join('')
        .toUpperCase()
    },
    isPhoneOtpValid () {
      return /^[0-9]{6}$/.test(this.phoneOtp)
    }
  },
  methods: {
    async fetchSignatureRequestDetails () {
      const requestId = this.$route.query?.requestId
      if (!requestId) return this.showAlert('Request ID is missing in the URL.', 'danger')
      const response = await this.$store.dispatch('getSignatureRequestDetails', { requestId })
      if (response.success) {
        this.signatureRequestDetails = response.data.caseData
        this.userName = response.data.userName
        this.isFirstPaty = response.data.isFirstPaty
      }
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
      this.phoneNumber = this.isFirstPaty ? this.signatureRequestDetails.plaintiff_phone : this.signatureRequestDetails.respondent_phone
      this.phoneOtp = ''
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

      const response = await this.$store.dispatch('submitSignature', requestBody)
      if (response.success) {
        this.showAlert(response.message, 'success')
        this.signatureRequestDetails = null
      }
    },
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
    }
  },
  mounted () {
    this.fetchSignatureRequestDetails()
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
