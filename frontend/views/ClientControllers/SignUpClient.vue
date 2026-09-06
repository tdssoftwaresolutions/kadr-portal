<template>
  <div class="signup-form">
    <Alert :message="alert.message" :type="alert.type" v-model="alert.visible" :timeout="alert.timeout"></Alert>

    <!-- Header: title + step progress -->
    <div class="signup-form-header">
      <div class="signup-form-heading">
        <h2 class="signup-form-title">{{ $t('auth.signup.clientTitle') }}</h2>
        <p class="signup-form-sub">{{ stepSubtitle }}</p>
      </div>
      <ol class="stepper" aria-label="Progress">
        <li
          v-for="s in steps"
          :key="s.n"
          class="stepper-item"
          :class="{ 'is-active': step === s.n, 'is-done': step > s.n }"
        >
          <span class="stepper-dot">
            <i v-if="step > s.n" class="ri-check-line" aria-hidden="true"></i>
            <span v-else>{{ s.n }}</span>
          </span>
          <span class="stepper-label">{{ s.label }}</span>
        </li>
      </ol>
    </div>

    <!-- Scrollable body only if content overflows; header/footer stay fixed -->
    <div class="signup-form-body">
      <!-- Step 1: profile -->
      <div v-if="step === 1" class="field-grid">
        <div class="field-item">
          <label for="name" class="field-label">{{ $t('auth.signup.fullName') }} <span class="req">*</span></label>
          <input type="text" class="app-input capitalize-first-word" :disabled="existingUser" id="name" v-model="formData.name" :placeholder="$t('auth.signup.fullNameHint')" />
        </div>

        <div class="field-item">
          <label for="email" class="field-label">{{ $t('auth.signup.emailAddress') }} <span class="req">*</span></label>
          <input type="email" class="app-input" :disabled="existingUser" id="email" v-model="formData.email" :placeholder="$t('auth.emailPlaceholder')" />
        </div>

        <div class="field-item">
          <label for="phone" class="field-label">{{ $t('auth.signup.phoneNumber') }} <span class="req">*</span></label>
          <input type="tel" class="app-input" :disabled="existingUser" id="phone" v-model="formData.phone" :placeholder="$t('auth.signup.phoneHint')" />
        </div>

        <div class="field-item">
          <label for="language" class="field-label">{{ $t('auth.signup.preferredLanguage') }} <span class="req">*</span></label>
          <div class="app-select-wrap">
            <select id="language" v-model="formData.preferredLanguage" class="app-input app-select">
              <option value="">{{ $t('auth.signup.selectLanguage') }}</option>
              <option v-for="(item, index) in availableLanguges" :key="index" :value="item.id">
                {{ item.language }}
              </option>
            </select>
            <i class="ri-arrow-down-s-line app-select-caret" aria-hidden="true"></i>
          </div>
        </div>

        <div class="field-item">
          <label for="state" class="field-label">{{ $t('auth.signup.stateLabel') }} <span class="req">*</span></label>
          <div class="app-select-wrap">
            <select id="state" v-model="formData.state" class="app-input app-select">
              <option value="">{{ $t('auth.signup.selectState') }}</option>
              <option v-for="(item, index) in states" :key="index" :value="item">{{ item }}</option>
            </select>
            <i class="ri-arrow-down-s-line app-select-caret" aria-hidden="true"></i>
          </div>
        </div>

        <div class="field-item">
          <label for="city" class="field-label">{{ $t('auth.signup.cityLabel') }} <span class="req">*</span></label>
          <input type="text" class="app-input capitalize-first-word" id="city" v-model="formData.city" :placeholder="$t('auth.signup.cityHint')" />
        </div>

        <div class="field-item">
          <label for="pincode" class="field-label">{{ $t('auth.signup.pincodeLabel') }} <span class="req">*</span></label>
          <input type="text" class="app-input" id="pincode" v-model="formData.pincode" :placeholder="$t('auth.signup.pincodeHint')" />
        </div>

        <div class="field-item">
          <label for="profileLogo" class="field-label">{{ $t('auth.signup.profilePicture') }}</label>
          <div class="upload-row">
            <input type="file" class="upload-native" id="profileLogo" @change="handlProfilePictureUpload" accept="image/*" />
            <label for="profileLogo" class="upload-btn">
              <i class="ri-upload-2-line" aria-hidden="true"></i> {{ $t('auth.signup.chooseImage') }}
            </label>
            <img
              v-if="formData.profilePictureContent"
              @click="onClickProfilePicture(formData.profilePictureContent)"
              :src="formData.profilePictureContent"
              alt="Profile preview"
              class="upload-thumb"
            />
          </div>
        </div>

        <div v-if="existingUser" class="field-item field-item--full">
          <label class="consent-box">
            <b-form-checkbox v-model="formData.adultPlatformLiabilityAck">
              {{ $t('auth.signup.adultAck') }}
            </b-form-checkbox>
          </label>
        </div>
      </div>

      <!-- Step 2: dispute -->
      <div v-if="step === 2" class="field-grid">
        <div class="field-item field-item--full">
          <label for="description" class="field-label">{{ $t('auth.signup.describeDispute') }} <span class="req">*</span></label>
          <textarea class="app-input app-textarea" id="description" v-model="formData.description" :placeholder="$t('auth.signup.describeDisputeHint')"></textarea>
        </div>

        <div class="field-item">
          <label for="category" class="field-label">{{ $t('auth.signup.complaintCategory') }} <span class="req">*</span></label>
          <div class="app-select-wrap">
            <select class="app-input app-select" id="category" v-model="formData.category">
              <option value="" disabled>{{ $t('auth.signup.selectCategory') }}</option>
              <option value="Payment related">Payment Related</option>
              <option value="Family related">Family Related</option>
              <option value="E-commerce">E-Commerce</option>
              <option value="Insurance">Insurance</option>
              <option value="Other">Other</option>
            </select>
            <i class="ri-arrow-down-s-line app-select-caret" aria-hidden="true"></i>
          </div>
        </div>

        <div class="field-item">
          <label for="evidence" class="field-label">{{ $t('auth.signup.uploadEvidence') }}</label>
          <div class="upload-row">
            <input type="file" class="upload-native" id="evidence" @change="onEvidenceChange" />
            <label for="evidence" class="upload-btn">
              <i class="ri-attachment-2" aria-hidden="true"></i> {{ $t('auth.signup.chooseFile') }}
            </label>
            <span v-if="formData.evidence" class="upload-filename">{{ formData.evidence.name }}</span>
          </div>
        </div>
      </div>

      <!-- Step 3: opposite party -->
      <div v-if="step === 3" class="field-grid">
        <div class="field-item">
          <label for="oppositeName" class="field-label">{{ $t('auth.signup.oppositeName') }} <span class="req">*</span></label>
          <input type="text" class="app-input" id="oppositeName" v-model="formData.oppositeName" :placeholder="$t('auth.signup.fullNamePlaceholder')" />
        </div>
        <div class="field-item">
          <label for="oppositeEmail" class="field-label">{{ $t('auth.signup.oppositeEmail') }} <span class="req">*</span></label>
          <input type="email" class="app-input" id="oppositeEmail" v-model="formData.oppositeEmail" :placeholder="$t('auth.signup.emailPlaceholder')" />
        </div>
        <div class="field-item">
          <label for="oppositePhone" class="field-label">{{ $t('auth.signup.oppositePhone') }} <span class="req">*</span></label>
          <input type="tel" class="app-input" id="oppositePhone" v-model="formData.oppositePhone" :placeholder="$t('auth.signup.phonePlaceholder')" />
        </div>
        <div class="field-item field-item--full">
          <p class="rep-section-hint">
            {{ $t('auth.signup.repHint') }}
          </p>
        </div>
        <div class="field-item">
          <label for="representativeName" class="field-label">{{ $t('auth.signup.repName') }}</label>
          <input type="text" class="app-input" id="representativeName" v-model="formData.representativeName" :placeholder="$t('auth.signup.repNamePlaceholder')" />
        </div>
        <div class="field-item">
          <label for="representativeEmail" class="field-label">{{ $t('auth.signup.repEmail') }} <span class="req">*</span></label>
          <input type="email" class="app-input" id="representativeEmail" v-model="formData.representativeEmail" :placeholder="$t('auth.signup.emailPlaceholder')" />
        </div>
        <div class="field-item">
          <label for="representativePhone" class="field-label">{{ $t('auth.signup.repPhone') }}</label>
          <input type="tel" class="app-input" id="representativePhone" v-model="formData.representativePhone" :placeholder="$t('auth.signup.repPhonePlaceholder')" />
        </div>
        <div class="field-item field-item--full">
          <label class="consent-box">
            <b-form-checkbox v-model="formData.adultPlatformLiabilityAck">
              {{ $t('auth.signup.adultAck') }}
            </b-form-checkbox>
          </label>
        </div>
      </div>
    </div>

    <!-- Footer: navigation -->
    <div class="signup-form-footer">
      <div class="footer-left">
        <button type="button" class="btn-ghost" @click="prevStep(step)">
          <i class="ri-arrow-left-line" aria-hidden="true"></i> {{ step === 1 ? $t('auth.signup.back') : $t('auth.signup.previous') }}
        </button>
      </div>
      <div class="footer-right">
        <span class="footer-login">
          {{ $t('auth.signup.alreadyHaveAccount') }} <a href="#" @click.prevent="onClickLogin">{{ $t('auth.signup.logIn') }}</a>
        </span>
        <button
          v-if="step === 1 && existingUser === false"
          type="button"
          class="btn-primary-cta"
          @click="nextStep(1)"
        >
          {{ $t('auth.signup.continue') }} <i class="ri-arrow-right-line" aria-hidden="true"></i>
        </button>
        <button
          v-else-if="step === 1 && existingUser"
          type="button"
          class="btn-primary-cta"
          @click="submitClientForm"
        >
          {{ $t('auth.signup.submit') }}
        </button>
        <button
          v-else-if="step === 2"
          type="button"
          class="btn-primary-cta"
          @click="nextStep(2)"
        >
          {{ $t('auth.signup.continue') }} <i class="ri-arrow-right-line" aria-hidden="true"></i>
        </button>
        <button
          v-else-if="step === 3"
          type="button"
          class="btn-primary-cta btn-success-cta"
          @click="submitClientForm"
        >
          <i class="ri-check-line" aria-hidden="true"></i> {{ $t('auth.signup.createAccountBtn') }}
        </button>
      </div>
    </div>
  </div>
</template>
<script>
import Alert from '../../components/sofbox/alert/Alert.vue'
import { uploadSignupFile } from '../../utils/directUpload'
import { notifyRequestStart, notifyRequestEnd } from '../../utils/loadingBridge'

export default {
  name: 'SignUpClient',
  components: {
    Alert
  },
  props: {
    states: [],
    defaultUser: null
  },
  data () {
    return {
      step: 1,
      formData: {
        name: '',
        email: '',
        phone: '',
        city: '',
        state: '',
        pincode: '',
        description: '',
        category: '',
        evidence: null,
        evidenceContent: null,
        oppositeName: '',
        oppositeEmail: '',
        preferredLanguage: '',
        oppositePhone: '',
        representativeName: '',
        representativeEmail: '',
        representativePhone: '',
        adultPlatformLiabilityAck: false,
        profilePicture: null,
        profilePictureContent: null,
        userType: 'client'
      },
      alert: {
        visible: false,
        message: '',
        timeout: 5000,
        type: 'primary'
      },
      existingUser: false,
      availableLanguges: {}
    }
  },
  computed: {
    steps () {
      return [
        { n: 1, label: this.$t('auth.signup.stepProfile') },
        { n: 2, label: this.$t('auth.signup.stepDispute') },
        { n: 3, label: this.$t('auth.signup.stepOtherParty') }
      ]
    },
    stepSubtitle () {
      if (this.step === 1) return this.$t('auth.signup.profileSubtitle')
      if (this.step === 2) return this.$t('auth.signup.disputeSubtitle')
      return this.$t('auth.signup.otherPartySubtitle')
    }
  },
  mounted () {
    this.loadAvailableLanguages()
    if (this.defaultUser) {
      this.existingUser = true
      this.formData.name = this.defaultUser?.name
      this.formData.email = this.defaultUser?.email
      this.formData.phone = this.defaultUser?.phone
    }
  },
  methods: {
    onClickProfilePicture (picture) {
      const popupWidth = 400
      const popupHeight = 400
      const popupFeatures = `width=${popupWidth},height=${popupHeight},left=200,top=100,toolbar=no,menubar=no,scrollbars=no,resizable=no`

      const popupWindow = window.open('', 'ImagePopup', popupFeatures)
      if (popupWindow) {
        popupWindow.document.write(`
          <html>
            <head>
              <title>Profile Image</title>
            </head>
            <body style="text-align:center; margin:0; padding:20px;">
              <img src="${picture}" alt="Profile Image" style="max-width:100%; height:auto;" />
            </body>
          </html>
        `)
        popupWindow.document.close()
      } else {
        alert('Please allow popups to open the image.')
      }
    },
    handlProfilePictureUpload (event) {
      const file = event.target.files[0]
      if (file) {
        // Keep a local data URL purely for the on-screen preview thumbnail.
        // The actual file is uploaded directly to S3 at submit time.
        const reader = new FileReader()
        reader.onload = () => {
          this.formData.profilePictureContent = reader.result
        }
        reader.onerror = (error) => {
          console.error('Error reading file:', error)
        }
        reader.readAsDataURL(file)
        this.formData.profilePicture = file
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
    onClickLogin () {
      this.$router.push({ path: '/auth/sign-in' })
    },
    showAlertWithTimeout (message, type, timeout) {
      this.alert = {
        message,
        type,
        visible: true,
        timeout
      }
    },
    async loadAvailableLanguages () {
      const response = await this.$store.dispatch('getAvailableLanguages')
      if (response.success) {
        this.availableLanguges = response.data.availableLanguages
      }
    },
    async page1Validation () {
      if (this.formData.name.trim() === '') {
        this.showAlert('Enter your full name', 'danger')
        return false
      }
      if (this.formData.email.trim() === '') {
        this.showAlert(this.$t('auth.signup.enterEmail'), 'danger')
        return false
      }
      const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
      if (!emailPattern.test(this.formData.email)) {
        this.showAlert(this.$t('auth.signup.invalidAccountEmail'), 'danger')
        return false
      }
      if (this.formData.phone.trim() === '') {
        this.showAlert(this.$t('auth.signup.enterPhone'), 'danger')
        return false
      }
      const phonePattern = /^(?:\+91|0)?[789]\d{9}$/
      if (!phonePattern.test(this.formData.phone)) {
        this.showAlert(this.$t('auth.signup.invalidPhone'), 'danger')
        return false
      }
      if (this.formData.preferredLanguage.trim() === '') {
        this.showAlert(this.$t('auth.signup.selectLanguageError'), 'danger')
        return false
      }
      if (this.formData.state.trim() === '') {
        this.showAlert(this.$t('auth.signup.selectStateError'), 'danger')
        return false
      }
      if (this.formData.city.trim() === '') {
        this.showAlert(this.$t('auth.signup.enterCity'), 'danger')
        return false
      }
      if (this.formData.pincode.trim() === '') {
        this.showAlert(this.$t('auth.signup.enterPincode'), 'danger')
        return false
      }
      const pinCodePattern = /^[1-9][0-9]{5}$/
      if (!pinCodePattern.test(this.formData.pincode)) {
        this.showAlert(this.$t('auth.signup.invalidPincode'), 'danger')
        return false
      }
      if (this.existingUser === true && !this.formData.adultPlatformLiabilityAck) {
        this.showAlert(this.$t('auth.signup.adultAckRequired'), 'danger')
        return false
      }
      if (this.existingUser === false) {
        const response = await this.$store.dispatch('isEmailExist', {
          emailAddress: this.formData.email,
          type: 'CLIENT'
        })
        if (response.success && response.data.exists) {
          const msg = response.data.pendingApproval
            ? this.$t('auth.signup.pendingApproval')
            : (response.message || this.$t('auth.signup.accountExists'))
          this.showAlert(msg, 'danger')
          return false
        }
      }
      return true
    },
    page2Validation () {
      if (this.formData.description.trim() === '') {
        this.showAlert(this.$t('auth.signup.enterDescription'), 'danger')
        return false
      }
      if (this.formData.category.trim() === '') {
        this.showAlert(this.$t('auth.signup.enterCategory'), 'danger')
        return false
      }
      if (this.formData.evidence) {
        const allowedTypes = [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'image/jpeg',
          'image/png'
        ]
        const maxSize = 2 * 1024 * 1024

        if (!allowedTypes.includes(this.formData.evidence.type)) {
          this.showAlert(this.$t('auth.signup.invalidFileType'), 'danger')
          return false
        }
        if (this.formData.evidence.size > maxSize) {
          this.showAlert(this.$t('auth.signup.fileTooLarge'), 'danger')
          return false
        }
      }
      return true
    },
    async nextStep (currentStep) {
      if (currentStep === 1) {
        const isPage1Valid = await this.page1Validation()
        if (!isPage1Valid) return
      } else if (currentStep === 2) {
        const isPage2Valid = await this.page2Validation()
        if (!isPage2Valid) return
      }
      this.step++
    },
    prevStep (currentStep) {
      if (currentStep === 1) {
        this.$emit('onBack')
      } else if (currentStep > 0) {
        this.step--
      }
    },
    onEvidenceChange (event) {
      const file = event.target.files[0]
      if (file) {
        this.formData.evidence = file
      }
    },
    async submitClientForm () {
      if (this.existingUser === false) {
        if (!this.formData.adultPlatformLiabilityAck) {
          this.showAlert(this.$t('auth.signup.adultAckRequired'), 'danger')
          return
        }
        if (this.formData.oppositeName.trim() === '') {
          this.showAlert(this.$t('auth.signup.enterOppositeName'), 'danger')
          return
        }
        if (this.formData.oppositeEmail.trim() === '') {
          this.showAlert(this.$t('auth.signup.enterOppositeEmail'), 'danger')
          return
        }
        const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
        if (!emailPattern.test(this.formData.oppositeEmail)) {
          this.showAlert(this.$t('auth.signup.invalidEmail'), 'danger')
          return
        }
        if (this.formData.oppositePhone.trim() === '') {
          this.showAlert(this.$t('auth.signup.enterOppositePhone'), 'danger')
          return
        }
        const phonePattern = /^(?:\+91|0)?[789]\d{9}$/
        if (!phonePattern.test(this.formData.oppositePhone)) {
          this.showAlert(this.$t('auth.signup.invalidPhone'), 'danger')
          return
        }
        if (this.formData.representativeEmail.trim() === '') {
          this.showAlert(this.$t('auth.signup.enterRepEmail'), 'danger')
          return
        }
        if (!emailPattern.test(this.formData.representativeEmail)) {
          this.showAlert(this.$t('auth.signup.invalidRepEmail'), 'danger')
          return
        }
        if (this.formData.representativePhone.trim() !== '' && !phonePattern.test(this.formData.representativePhone)) {
          this.showAlert(this.$t('auth.signup.invalidRepPhone'), 'danger')
          return
        }
      } else {
        const isValid = await this.page1Validation()
        if (!isValid) return
      }

      // Hold the global spinner up for the WHOLE submit — both the direct-to-S3
      // uploads and the backend signup call. The S3 PUTs use a bare axios call
      // that the interceptor does not track, so without this manual bracket the
      // spinner would drop between the presign requests and the backend save,
      // producing a visible flicker/gap. notifyRequestStart/End increment the
      // same pending counter the interceptor uses, so nested tracked requests
      // never drop the count to zero mid-flow. The matching End lives in the
      // single finally below so it always releases, even on error.
      notifyRequestStart()
      try {
        // Upload files directly to S3 first, then submit the signup with just
        // the resulting object URLs (no base64 in the request body).
        let profilePictureUrl = ''
        let evidenceUrl = ''
        try {
          ;[profilePictureUrl, evidenceUrl] = await Promise.all([
            uploadSignupFile('profile-picture', this.formData.profilePicture),
            uploadSignupFile('evidence', this.formData.evidence)
          ])
        } catch (error) {
          this.showAlert(error?.message || this.$t('auth.signup.fileTooLarge'), 'danger')
          return
        }

        // Send only the plain fields plus the uploaded file URLs. The large File
        // objects and preview data URL are intentionally excluded.
        const {
          profilePicture, evidence, profilePictureContent, evidenceContent,
          ...plainFields
        } = this.formData

        const response = await this.$store.dispatch('newUserSignup', {
          userDetails: {
            ...plainFields,
            profilePictureUrl,
            evidenceUrl
          },
          existingUser: this.existingUser
        })
        if (response.success) {
          this.showAlertWithTimeout(response.message, 'success', 7000)
          setTimeout(() => {
            this.onClickLogin()
          }, 1500)
        }
      } finally {
        notifyRequestEnd()
      }
    }
  }
}
</script>

<style scoped>
@import "../../assets/css/signupForm.css";

.rep-section-hint {
  margin: 0.25rem 0 0.25rem;
  font-size: 0.85rem;
  color: var(--kadr-text-muted);
}
</style>
