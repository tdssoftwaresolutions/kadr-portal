<template>
  <div class="signup-form">
    <Alert :message="alert.message" :type="alert.type" v-model="alert.visible" :timeout="alert.timeout"></Alert>

    <div class="signup-form-header">
      <div class="signup-form-heading">
        <h2 class="signup-form-title">{{ $t('mediatorSignup.title') }}</h2>
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

    <div class="signup-form-body">
      <!-- Step 1: profile -->
      <div v-if="step === 1" class="field-grid">
        <div class="field-item">
          <label for="name" class="field-label">{{ $t('auth.signup.fullName') }} <span class="req">*</span></label>
          <input type="text" class="app-input capitalize-first-word" id="name" v-model="formData.name" :placeholder="$t('auth.signup.fullNameHint')" />
        </div>

        <div class="field-item">
          <label for="email" class="field-label">{{ $t('auth.signup.emailAddress') }} <span class="req">*</span></label>
          <input type="email" class="app-input" id="email" v-model="formData.email" placeholder="you@example.com" />
        </div>

        <div class="field-item">
          <label for="phone" class="field-label">{{ $t('auth.signup.phoneNumber') }} <span class="req">*</span></label>
          <input type="tel" class="app-input" id="phone" v-model="formData.phone" :placeholder="$t('auth.signup.phoneHint')" />
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
          <input type="text" inputmode="numeric" maxlength="6" class="app-input" id="pincode" v-model="formData.pincode" :placeholder="$t('auth.signup.pincodeHint')" />
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

        <div class="field-item field-item--full">
          <coupon-field
            v-model="formData.referralCode"
            input-id="mediatorReferral"
            :label="$t('mediatorSignup.referralLabel')"
            :hint="$t('mediatorSignup.referralHint')"
            :maxlength="40"
          />
        </div>
      </div>

      <!-- Step 2: qualifications -->
      <div v-if="step === 2" class="field-grid">
        <div class="step-section-title">{{ $t('mediatorSignup.llbDegreeDetails') }}</div>

        <div class="field-item">
          <label for="degreeCollege" class="field-label">{{ $t('mediatorSignup.collegeName') }} <span class="req">*</span></label>
          <input type="text" class="app-input capitalize-first-word" id="degreeCollege" v-model="formData.llbCollege" :placeholder="$t('mediatorSignup.collegeHint')" />
        </div>

        <div class="field-item">
          <label for="degreeUniversity" class="field-label">{{ $t('mediatorSignup.university') }} <span class="req">*</span></label>
          <input type="text" class="app-input capitalize-first-word" id="degreeUniversity" v-model="formData.llbUniversity" :placeholder="$t('mediatorSignup.universityHint')" />
        </div>

        <div class="field-item">
          <label for="degreeYear" class="field-label">{{ $t('mediatorSignup.yearOfCompletion') }} <span class="req">*</span></label>
          <div class="app-select-wrap">
            <select class="app-input app-select" id="degreeYear" v-model="formData.llbYear">
              <option value="0" disabled>{{ $t('mediatorSignup.selectYear') }}</option>
              <option v-for="(item, index) in years" :key="index" :value="item">{{ item }}</option>
            </select>
            <i class="ri-arrow-down-s-line app-select-caret" aria-hidden="true"></i>
          </div>
        </div>

        <div class="field-item">
          <label for="llbDegree" class="field-label">{{ $t('mediatorSignup.llbCertificate') }} <span class="req">*</span></label>
          <div class="upload-row">
            <input type="file" class="upload-native" id="llbDegree" @change="onUploadLLBDegreeCertificate" />
            <label for="llbDegree" class="upload-btn">
              <i class="ri-attachment-2" aria-hidden="true"></i> {{ $t('auth.signup.chooseFile') }}
            </label>
            <span v-if="formData.llbCertificate" class="upload-filename">{{ formData.llbCertificate.name }}</span>
          </div>
        </div>

        <div class="step-section-title">{{ $t('mediatorSignup.mcpcCourse') }}</div>

        <div class="field-item">
          <label for="mcpcDegreeYear" class="field-label">{{ $t('mediatorSignup.yearOfCompletion') }} <span class="req">*</span></label>
          <div class="app-select-wrap">
            <select class="app-input app-select" id="mcpcDegreeYear" v-model="formData.mediatorCourseYear">
              <option value="0" disabled>{{ $t('mediatorSignup.selectYear') }}</option>
              <option v-for="(item, index) in years" :key="index" :value="item">{{ item }}</option>
            </select>
            <i class="ri-arrow-down-s-line app-select-caret" aria-hidden="true"></i>
          </div>
        </div>

        <div class="field-item">
          <label for="mcpcCertificate" class="field-label">{{ $t('mediatorSignup.mcpcCertificate') }} <span class="req">*</span></label>
          <div class="upload-row">
            <input type="file" class="upload-native" id="mcpcCertificate" @change="onUploadMCPCCertificate" />
            <label for="mcpcCertificate" class="upload-btn">
              <i class="ri-attachment-2" aria-hidden="true"></i> {{ $t('auth.signup.chooseFile') }}
            </label>
            <span v-if="formData.mcpcCertificate" class="upload-filename">{{ formData.mcpcCertificate.name }}</span>
          </div>
        </div>
      </div>

      <!-- Step 3: practice details -->
      <div v-if="step === 3" class="field-grid">
        <div class="field-item field-item--full">
          <label for="barEnrollmentNo" class="field-label">{{ $t('mediatorSignup.barEnrollmentNumber') }} <span class="req">*</span></label>
          <input type="text" class="app-input capitalize-first-word" id="barEnrollmentNo" v-model="formData.barEnrollmentNo" :placeholder="$t('mediatorSignup.barEnrollmentHint')" />
        </div>

        <div class="field-item field-item--full">
          <label class="field-label">{{ $t('mediatorSignup.preferredLanguages') }} <span class="req">*</span></label>
          <div class="chip-group chip-group--scroll">
            <div
              v-for="(option, index) in availableLanguges"
              :key="index"
              class="chip"
              :class="{ 'is-selected': formData.preferredLanguages.includes(option.value), 'is-disabled': formData.preferredLanguages.length >= 3 && !formData.preferredLanguages.includes(option.value) }"
              @click="toggleSelection(option)"
            >
              <i v-if="formData.preferredLanguages.includes(option.value)" class="ri-check-line" aria-hidden="true"></i>
              {{ option.text }}
            </div>
          </div>
        </div>

        <div class="field-item field-item--full">
          <label class="field-label">{{ $t('mediatorSignup.preferredAreaOfPractice') }} <span class="req">*</span></label>
          <div class="chip-group">
            <div
              v-for="(option, index) in availableAreaOfPractice"
              :key="index"
              class="chip"
              :class="{ 'is-selected': formData.preferredAreaOfPractice.includes(option), 'is-disabled': formData.preferredAreaOfPractice.length >= 3 && !formData.preferredAreaOfPractice.includes(option) }"
              @click="toggleExpertiseSelection(option)"
            >
              <i v-if="formData.preferredAreaOfPractice.includes(option)" class="ri-check-line" aria-hidden="true"></i>
              {{ option }}
            </div>
          </div>
        </div>

        <div class="field-item field-item--full">
          <label class="field-label">{{ $t('mediatorSignup.availableFor') }} <span class="req">*</span></label>
          <div class="toggle-row">
            <label class="toggle-pill" :class="{ 'is-selected': formData.selectedHearingTypes.includes('physical') }">
              <input type="checkbox" value="physical" v-model="formData.selectedHearingTypes" />
              {{ $t('mediatorSignup.physicalHearing') }}
            </label>
            <label class="toggle-pill" :class="{ 'is-selected': formData.selectedHearingTypes.includes('virtual') }">
              <input type="checkbox" value="virtual" v-model="formData.selectedHearingTypes" />
              {{ $t('mediatorSignup.virtualHearing') }}
            </label>
          </div>
        </div>
      </div>
    </div>

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
        <button v-if="step === 1" type="button" class="btn-primary-cta" @click="nextStep(1)">
          {{ $t('auth.signup.continue') }} <i class="ri-arrow-right-line" aria-hidden="true"></i>
        </button>
        <button v-else-if="step === 2" type="button" class="btn-primary-cta" @click="nextStep(2)">
          {{ $t('auth.signup.continue') }} <i class="ri-arrow-right-line" aria-hidden="true"></i>
        </button>
        <button v-else-if="step === 3" type="button" class="btn-primary-cta btn-success-cta" @click="submitClientForm">
          <i class="ri-check-line" aria-hidden="true"></i> {{ $t('auth.signup.createAccountBtn') }}
        </button>
      </div>
    </div>
  </div>
</template>
<script>
import Alert from '../../components/sofbox/alert/Alert.vue'
import CouponField from '../../components/shared/CouponField.vue'
import { uploadSignupFile } from '../../utils/directUpload'
import { notifyRequestStart, notifyRequestEnd } from '../../utils/loadingBridge'
const allowedTypes = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png'
]
const maxSize = 2 * 1024 * 1024

export default {
  name: 'SignUpClient',
  components: {
    Alert,
    CouponField
  },
  props: {
    states: []
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
        preferredLanguages: [],
        llbCollege: '',
        llbUniversity: '',
        llbYear: 0,
        userType: 'mediator',
        mediatorCourseYear: 0,
        mcpcCertificate: null,
        mcpcCertificateContent: null,
        llbCertificate: null,
        llbCertificateContent: null,
        preferredAreaOfPractice: [],
        profilePicture: null,
        profilePictureContent: null,
        selectedHearingTypes: [],
        barEnrollmentNo: '',
        referralCode: ''
      },
      availableForOptions: [
        { text: 'Physical Hearing', value: 'physical' },
        { text: 'Virtual Hearing', value: 'virtual' }
      ],
      alert: {
        visible: false,
        message: '',
        timeout: 5000,
        type: 'primary'
      },
      availableAreaOfPractice: [
        'Matrimonial',
        'Civil',
        'Commercial',
        'Labour',
        'IPR'
      ],
      availableLanguges: {},
      years: []
    }
  },
  computed: {
    steps () {
      return [
        { n: 1, label: this.$t('mediatorSignup.stepProfile') },
        { n: 2, label: this.$t('mediatorSignup.stepQualifications') },
        { n: 3, label: this.$t('mediatorSignup.stepPractice') }
      ]
    },
    stepSubtitle () {
      if (this.step === 1) return this.$t('mediatorSignup.subtitleProfile')
      if (this.step === 2) return this.$t('mediatorSignup.subtitleQualifications')
      return this.$t('mediatorSignup.subtitlePractice')
    }
  },
  mounted () {
    this.loadAvailableLanguages()
    this.generateYears()
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
        alert(this.$t('mediatorSignup.popupBlocked'))
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
    onUploadMCPCCertificate (event) {
      const file = event.target.files[0]
      if (file) {
        this.formData.mcpcCertificate = file
      }
    },
    onUploadLLBDegreeCertificate (event) {
      const file = event.target.files[0]
      if (file) {
        this.formData.llbCertificate = file
      }
    },
    async loadAvailableLanguages () {
      const response = await this.$store.dispatch('getAllLanguages')
      if (response.success) {
        this.availableLanguges = [
          ...Object.entries(response.data.languages).map(([key, value]) => ({
            value: key,
            text: value
          }))
        ]
      }
    },
    toggleSelection (option) {
      if (this.formData.preferredLanguages.includes(option.value)) {
        this.formData.preferredLanguages = this.formData.preferredLanguages.filter(item => item !== option.value)
      } else if (this.formData.preferredLanguages.length < 3) {
        this.formData.preferredLanguages.push(option.value)
      }
    },
    toggleExpertiseSelection (option) {
      if (this.formData.preferredAreaOfPractice.includes(option)) {
        this.formData.preferredAreaOfPractice = this.formData.preferredAreaOfPractice.filter(item => item !== option)
      } else if (this.formData.preferredAreaOfPractice.length < 3) {
        this.formData.preferredAreaOfPractice.push(option)
      }
    },
    generateYears () {
      const currentYear = new Date().getFullYear()
      this.years = Array.from({ length: currentYear - 1980 + 1 }, (_, index) => 1980 + index)
    },
    async nextStep (currentStep) {
      if (currentStep === 1) {
        if (this.formData.name.trim() === '') {
          this.showAlert(this.$t('auth.signup.enterName'), 'danger')
          return
        }
        if (this.formData.email.trim() === '') {
          this.showAlert(this.$t('auth.signup.enterEmail'), 'danger')
          return
        }
        const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
        if (!emailPattern.test(this.formData.email)) {
          this.showAlert(this.$t('auth.signup.invalidAccountEmail'), 'danger')
          return
        }
        if (this.formData.phone.trim() === '') {
          this.showAlert(this.$t('auth.signup.enterPhone'), 'danger')
          return
        }
        const phonePattern = /^(?:\+91|0)?[789]\d{9}$/
        if (!phonePattern.test(this.formData.phone)) {
          this.showAlert(this.$t('auth.signup.invalidPhone'), 'danger')
          return
        }
        if (this.formData.state.trim() === '') {
          this.showAlert(this.$t('auth.signup.selectStateError'), 'danger')
          return
        }
        if (this.formData.city.trim() === '') {
          this.showAlert(this.$t('auth.signup.enterCity'), 'danger')
          return
        }
        if (this.formData.pincode.trim() === '') {
          this.showAlert(this.$t('auth.signup.enterPincode'), 'danger')
          return
        }
        const pinCodePattern = /^[1-9][0-9]{5}$/
        if (!pinCodePattern.test(this.formData.pincode)) {
          this.showAlert(this.$t('auth.signup.invalidPincode'), 'danger')
          return
        }
        const response = await this.$store.dispatch('isEmailExist', {
          emailAddress: this.formData.email,
          type: 'MEDIATOR'
        })
        if (response.success && response.data.exists) {
          const msg = response.data.pendingApproval
            ? this.$t('auth.signup.pendingApproval')
            : (response.message || this.$t('mediatorSignup.accountExists'))
          this.showAlert(msg, 'danger')
          return false
        }
      } else if (currentStep === 2) {
        if (this.formData.llbCollege.trim() === '') {
          this.showAlert(this.$t('mediatorSignup.enterLlbCollege'), 'danger')
          return
        }
        if (this.formData.llbUniversity.trim() === '') {
          this.showAlert(this.$t('mediatorSignup.enterLlbUniversity'), 'danger')
          return
        }
        if (this.formData.llbYear === 0) {
          this.showAlert(this.$t('mediatorSignup.selectLlbYear'), 'danger')
          return
        }
        if (!this.formData.llbCertificate) {
          this.showAlert(this.$t('mediatorSignup.uploadLlbCertificate'), 'danger')
          return
        }
        if (!allowedTypes.includes(this.formData.llbCertificate.type)) {
          this.showAlert(this.$t('mediatorSignup.invalidLlbFileType'), 'danger')
          return
        }
        if (this.formData.llbCertificate.size > maxSize) {
          this.showAlert(this.$t('mediatorSignup.llbFileTooLarge'), 'danger')
          return
        }
        if (this.formData.mediatorCourseYear === 0) {
          this.showAlert(this.$t('mediatorSignup.selectMcpcYear'), 'danger')
          return
        }
        if (!this.formData.mcpcCertificate) {
          this.showAlert(this.$t('mediatorSignup.uploadMcpcCertificate'), 'danger')
          return
        }
        if (!allowedTypes.includes(this.formData.mcpcCertificate.type)) {
          this.showAlert(this.$t('mediatorSignup.invalidMcpcFileType'), 'danger')
          return
        }
        if (this.formData.mcpcCertificate.size > maxSize) {
          this.showAlert(this.$t('mediatorSignup.mcpcFileTooLarge'), 'danger')
          return
        }
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
    async submitClientForm () {
      if (this.formData.barEnrollmentNo.trim() === '') {
        this.showAlert(this.$t('mediatorSignup.enterBarEnrollment'), 'danger')
        return
      }
      if (this.formData.preferredLanguages.length === 0) {
        this.showAlert(this.$t('mediatorSignup.selectLanguage'), 'danger')
        return
      }
      if (this.formData.preferredAreaOfPractice.length === 0) {
        this.showAlert(this.$t('mediatorSignup.selectAreaOfPractice'), 'danger')
        return
      }
      if (this.formData.selectedHearingTypes.length === 0) {
        this.showAlert(this.$t('mediatorSignup.selectHearingType'), 'danger')
        return
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
        let mcpcCertificateUrl = ''
        let llbCertificateUrl = ''
        let profilePictureUrl = ''
        try {
          ;[mcpcCertificateUrl, llbCertificateUrl, profilePictureUrl] = await Promise.all([
            uploadSignupFile('mcpc-certificate', this.formData.mcpcCertificate),
            uploadSignupFile('llb-certificate', this.formData.llbCertificate),
            uploadSignupFile('profile-picture', this.formData.profilePicture)
          ])
        } catch (error) {
          this.showAlert(error?.message || this.$t('mediatorSignup.fileUploadFailed'), 'danger')
          return
        }

        // Send only the plain fields plus the uploaded file URLs. The large File
        // objects and preview data URL are intentionally excluded.
        const {
          profilePicture, mcpcCertificate, llbCertificate, profilePictureContent,
          ...plainFields
        } = this.formData

        const response = await this.$store.dispatch('newMediatorSignup', {
          userDetails: {
            ...plainFields,
            mcpcCertificateUrl,
            llbCertificateUrl,
            profilePictureUrl
          }
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
</style>
