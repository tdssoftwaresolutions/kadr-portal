<template>
    <div>
        <Alert :message="alert.message" :type="alert.type" v-model="alert.visible" :timeout="alert.timeout"></Alert>
        <div v-if="step === 1">
            <div class="mb-3">
                <label for="name">Full Name <span class="text-danger">*</span></label>
                <input type="text" class="form-control capitalize-first-word" id="name" v-model="formData.name" placeholder="Your Full Name" />
            </div>
            <div class="mb-3">
                <label for="profileLogo">Upload Profile Picture</label>
                <div class="file-upload">
                <input type="file" class="form-control-file" id="profileLogo" @change="handlProfilePictureUpload" accept="image/*"/>
                <label for="profileLogo" class="custom-file-upload">
                    Choose File
                </label>
                <img v-if="formData.profilePictureContent" @click="onClickProfilePicture(formData.profilePictureContent)" :src="formData.profilePictureContent" alt="Profile Logo Preview" class="img-thumbnail" style="margin-left: 2rem;width:50px;height:50px;cursor: pointer;"/>
              </div>
            </div>
            <div class="mb-3">
                <label for="email">Email Address <span class="text-danger">*</span></label>
                <input type="email" class="form-control" id="email" v-model="formData.email" placeholder="Enter Email" />
            </div>
            <div class="mb-3">
                <label for="phone">Phone Number <span class="text-danger">*</span></label>
                <input type="tel" class="form-control" id="phone" v-model="formData.phone" placeholder="Phone Number" />
            </div>
            <div class="mb-3">
                <label for="language">Preferred Languages (Max 3) <span class="text-danger">*</span></label>
                <div class="d-flex flex-wrap" style="height: 125px;overflow-y: scroll;">
                  <div
                    v-for="(option, index) in availableLanguges"
                    :key="index"
                    class="option-card"
                    :class="{ selected: formData.preferredLanguages.includes(option.value), disabled: formData.preferredLanguages.length >= 3 && !formData.preferredLanguages.includes(option.value) }"
                    @click="toggleSelection(option)">
                    {{ option.text }}
                  </div>
                </div>
            </div>
            <div class="mb-3">
                <label for="state">State <span class="text-danger">*</span></label>
                <select id="state" v-model="formData.state" class="form-control">
                <option value="">Select State</option>
                <option v-for="(item, index) in states" :key="index" :value="item">
                    {{ item }}
                </option>
                </select>
            </div>
            <div class="mb-3">
                <label for="city">City <span class="text-danger">*</span></label>
                <input type="text" class="form-control capitalize-first-word" id="city" v-model="formData.city" placeholder="City" />
            </div>
            <div class="mb-3">
                <label for="pincode">Pin Code <span class="text-danger">*</span></label>
                <input type="number" class="form-control" id="pincode" v-model="formData.pincode" placeholder="Pin Code" />
            </div>
            <div class="d-flex justify-content-between">
                <div>
                <button type="button" class="btn btn-secondary" @click="prevStep(1)">Previous</button>
                <button type="button" class="btn btn-primary ml" @click="nextStep(1)">Next</button>
                </div>
                <div class="align-self-center">
                <span class="dark-color d-inline-block line-height-2">
                    Already Have an Account? <a href="#" @click="onClickLogin">Log In</a>
                </span>
                </div>
            </div>
        </div>
        <div v-if="step === 2">
          <label style="font-weight: bold;margin-bottom: 1rem">LLB Degree Details</label>
          <div class="mb-3">
              <label for="degreeCollege">College Name <span class="text-danger">*</span></label>
              <input type="text" class="form-control capitalize-first-word" id="degreeCollege" v-model="formData.llbCollege" placeholder="LLB Degree College" />
          </div>
          <div class="mb-3">
              <label for="degreeUniversity">University <span class="text-danger">*</span></label>
              <input type="text" class="form-control capitalize-first-word" id="degreeUniversity" v-model="formData.llbUniversity" placeholder="LLB Degree University" />
          </div>
          <div class="mb-3">
              <label for="degreeYear">Year of Completion <span class="text-danger">*</span></label>
              <select class="form-control" id="degreeYear" v-model="formData.llbYear">
                <option value="0" disabled>Select year</option>
                <option v-for="(item, index) in years" :key="index" :value="item">
                  {{item}}
                </option>
              </select>
          </div>
          <div class="mb-3">
              <label for="llbDegree">Upload LLB Degree Certificate <span class="text-danger">*</span></label>
              <div class="file-upload">
              <input type="file" class="form-control-file" id="llbDegree" @change="onUploadLLBDegreeCertificate" />
              <label for="llbDegree" class="custom-file-upload">
                  Choose File
              </label>
              <span v-if="formData.llbCertificate" class="file-name">{{ formData.llbCertificate.name }}</span>
              </div>
          </div>
          <label style="font-weight: bold;margin-bottom: 1rem;margin-top:1rem;">Mediator Course (MCPC)</label>
          <div class="mb-3">
              <label for="mcpcDegreeYear">Year of Completion <span class="text-danger">*</span></label>
              <select class="form-control" id="mcpcDegreeYear" v-model="formData.mediatorCourseYear">
                <option value="0" disabled>Select year</option>
                <option v-for="(item, index) in years" :key="index" :value="item">
                  {{item}}
                </option>
              </select>
          </div>
          <div class="mb-3">
              <label for="mcpcCertificate">Upload MCPC Certificate <span class="text-danger">*</span></label>
              <div class="file-upload">
              <input type="file" class="form-control-file" id="mcpcCertificate" @change="onUploadMCPCCertificate" />
              <label for="mcpcCertificate" class="custom-file-upload">
                  Choose File
              </label>
              <span v-if="formData.mcpcCertificate" class="file-name">{{ formData.mcpcCertificate.name }}</span>
              </div>
          </div>
          <div class="d-flex justify-content-between">
              <div>
              <button type="button" class="btn btn-secondary" @click="prevStep(2)">Previous</button>
              <button type="button" class="btn btn-primary float-right ml" @click="nextStep(2)">Next</button>
              </div>
              <div class="align-self-center">
              <span class="dark-color d-inline-block line-height-2">
                  Already Have an Account? <a href="#" @click="onClickLogin">Log In</a>
              </span>
              </div>
          </div>
        </div>
        <div v-if="step === 3">
            <label style="font-weight: bold;margin-bottom: 1rem">Practice Details</label>
            <div class="mb-3">
              <label for="barEnrollmentNo">Bar Enrollment Number <span class="text-danger">*</span></label>
              <input type="text" class="form-control capitalize-first-word" id="barEnrollmentNo" v-model="formData.barEnrollmentNo" placeholder="Bar Enrollment Number" />
            </div>
            <div class="mb-3">
              <label for="areaOfPractice">Preferred Area of Practice  (Max 3) <span class="text-danger">*</span></label>
              <div class="d-flex flex-wrap" style="height: 60px;overflow-y: scroll;">
                <div
                  v-for="(option, index) in availableAreaOfPractice"
                  :key="index"
                  class="option-card"
                  :class="{ selected: formData.preferredAreaOfPractice.includes(option), disabled: formData.preferredAreaOfPractice.length >= 3 && !formData.preferredAreaOfPractice.includes(option) }"
                  @click="toggleExpertiseSelection(option)">
                  {{ option }}
                </div>
              </div>
            </div>
            <div class="mb-3">
              <label for="areaOfPractice">Available For <span class="text-danger">*</span></label>
              <div class="text-start">
                <div class="checkbox-group">
                  <div class="form-check form-check-inline">
                    <input
                      class="form-check-input"
                      type="checkbox"
                      id="physicalHearing"
                      value="physical"
                      v-model="formData.selectedHearingTypes"
                    />
                    <label class="form-check-label" for="physicalHearing">
                      Physical Hearing
                    </label>
                  </div>
                  <div class="form-check form-check-inline">
                    <input
                      class="form-check-input"
                      type="checkbox"
                      id="virtualHearing"
                      value="virtual"
                      v-model="formData.selectedHearingTypes"
                    />
                    <label class="form-check-label" for="virtualHearing">
                      Virtual Hearing
                    </label>
                  </div>
                </div>
              </div>
            </div>
            <button type="button" class="btn btn-secondary" @click="prevStep(3)">Previous</button>
            <button type="button" class="btn btn-success float-right ml" @click="submitClientForm">Submit</button>
        </div>
    </div>
</template>
<script>
import Alert from '../../components/sofbox/alert/Alert.vue'
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
    Alert
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
        barEnrollmentNo: ''
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
        alert('Please allow popups to open the image.')
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
        const reader = new FileReader()
        reader.onload = () => {
          this.formData.mcpcCertificateContent = reader.result
        }
        reader.onerror = (error) => {
          console.error('Error reading file:', error)
        }
        reader.readAsDataURL(file)
        this.formData.mcpcCertificate = file
      }
    },
    onUploadLLBDegreeCertificate (event) {
      const file = event.target.files[0]
      if (file) {
        const reader = new FileReader()
        reader.onload = () => {
          this.formData.llbCertificateContent = reader.result
        }
        reader.onerror = (error) => {
          console.error('Error reading file:', error)
        }
        reader.readAsDataURL(file)
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
          this.showAlert('Enter your full name', 'danger')
          return
        }
        if (this.formData.email.trim() === '') {
          this.showAlert('Enter email address', 'danger')
          return
        }
        const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
        if (!emailPattern.test(this.formData.email)) {
          this.showAlert('Invalid email address', 'danger')
          return
        }
        if (this.formData.phone.trim() === '') {
          this.showAlert('Enter phone number', 'danger')
          return
        }
        const phonePattern = /^(?:\+91|0)?[789]\d{9}$/
        if (!phonePattern.test(this.formData.phone)) {
          this.showAlert('Enter valid phone number', 'danger')
          return
        }
        if (this.formData.preferredLanguages.length === 0) {
          this.showAlert('Select your preferred language', 'danger')
          return
        }
        if (this.formData.state.trim() === '') {
          this.showAlert('Select state', 'danger')
          return
        }
        if (this.formData.city.trim() === '') {
          this.showAlert('Enter city', 'danger')
          return
        }
        if (this.formData.pincode.trim() === '') {
          this.showAlert('Enter pincode', 'danger')
          return
        }
        const pinCodePattern = /^[1-9][0-9]{5}$/
        if (!pinCodePattern.test(this.formData.pincode)) {
          this.showAlert('Enter valid pincode', 'danger')
          return
        }
        const response = await this.$store.dispatch('isEmailExist', {
          emailAddress: this.formData.email
        })
        if (response.success && response.data.exists) {
          this.showAlert(response.message, 'danger')
          return false
        }
      } else if (currentStep === 2) {
        if (this.formData.llbCollege.trim() === '') {
          this.showAlert('Enter LLB College Name', 'danger')
          return
        }
        if (this.formData.llbUniversity.trim() === '') {
          this.showAlert('Enter LLB College University', 'danger')
          return
        }
        if (this.formData.llbYear === 0) {
          this.showAlert('Select LLB Degree Completion Year', 'danger')
          return
        }
        if (!this.formData.llbCertificate) {
          this.showAlert('Upload the LLB Degree Certificate', 'danger')
          return
        }
        if (!allowedTypes.includes(this.formData.llbCertificate.type)) {
          this.showAlert('Invalid file type for LLB Degree  Certificate. Allowed types: PDF, DOC, DOCX, JPEG, PNG.', 'danger')
          return
        }
        if (this.formData.llbCertificate.size > maxSize) {
          this.showAlert('LLB Degree Certificate file size exceeds 2MB.', 'danger')
          return
        }
        if (this.formData.mediatorCourseYear === 0) {
          this.showAlert('Select MCPC Completion Year', 'danger')
          return
        }
        if (!this.formData.mcpcCertificate) {
          this.showAlert('Upload the MCPC Certificate', 'danger')
          return
        }
        if (!allowedTypes.includes(this.formData.mcpcCertificate.type)) {
          this.showAlert('Invalid MCPC Certificate file type. Allowed types: PDF, DOC, DOCX, JPEG, PNG.', 'danger')
          return
        }
        if (this.formData.mcpcCertificate.size > maxSize) {
          this.showAlert('MCPC Certificate file size exceeds 2MB.', 'danger')
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
        this.showAlert('Enter bar enrollment number', 'danger')
        return
      }
      if (this.formData.preferredAreaOfPractice.length === 0) {
        this.showAlert('Select your preferred area of practice', 'danger')
        return
      }
      if (this.formData.selectedHearingTypes.length === 0) {
        this.showAlert('Select hearing type', 'danger')
        return
      }
      const response = await this.$store.dispatch('newMediatorSignup', {
        userDetails: this.formData
      })
      if (response.success) {
        this.showAlertWithTimeout(response.message, 'success', 7000)
        setTimeout(() => {
          this.onClickLogin()
        }, 1500)
      }
    }
  }
}
</script>

<style scoped>
/* Full Height and Centering */
body, html {
  height: 100%;
  margin: 0;
}

/* Main container that takes full screen height */
.container {
  display: flex;
  justify-content: center; /* Horizontally center */
  align-items: center; /* Vertically center */
  height: 100vh; /* Full height of the viewport */
}

/* Form container (including Step 0) */
.form-container {
  max-width: 600px;
  width: 100%;
  padding: 20px;
  background-color: #f9f9f9;
  border-radius: 8px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
}

.card {
  margin-bottom: 20px;
}

/* Empty step placeholders */
.empty-step {
  height: 200px;
  background-color: #f8f9fa;
  border: 1px solid #ddd;
  margin: 10px 0;
}

/* Ensuring the header stays at the top, regardless of the screen size */
.header {
  position: absolute;
  top: 20px;
  left: 20px;
  right: 20px;
  text-align: center;
}

/* Style for the file upload container */
.file-upload {
  position: relative;
  display: inline-block;
  width: 100%;
}

/* Hide the default file input button */
.file-upload input[type="file"] {
  display: none;
}

/* Style the custom file upload label button */
.custom-file-upload {
  display: inline-block;
  padding: 10px 20px;
  font-size: 14px;
  cursor: pointer;
  background-color: #007bff;
  color: #fff;
  border: 1px solid #007bff;
  border-radius: 4px;
  text-align: center;
  width: auto;
  margin-top: 5px;
}

/* Hover effect for the custom button */
.custom-file-upload:hover {
  background-color: #0056b3;
  border-color: #0056b3;
}

/* Style for the file name to appear once a file is selected */
.file-name {
  display: inline-block;
  margin-top: 5px;
  color: #555;
  font-size: 14px;
  font-weight: 600;
}

/* Optional: Styling for focus or when the file is selected */
.file-upload input[type="file"]:focus + .custom-file-upload,
.file-upload input[type="file"]:active + .custom-file-upload {
  border-color: #0056b3;
  background-color: #e6f0ff;
}
.toast.toast-error {
  background-color: #dc3545; /* Red background */
  color: white;              /* White text */
}

.b-toaster-slot{
  margin-left: auto;
  margin-right: auto;
}
.ml {
    margin-left: 0.5rem;
}
.capitalize-first-word {
  text-transform: capitalize;
}
.checkbox-group .form-check {
  margin-right: 15px; /* Add spacing between checkboxes */
}

.checkbox-group .form-check-label {
  margin-left:0.3rem
}

.checkbox-group .form-check-input {
  accent-color: #0d6efd; /* Customize checkbox color */
  width: 1.25rem;
  height: 1.25rem;
  margin-top: 0.25rem; /* Proper alignment with label */
}
.option-card {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border: 1px solid #007bff;
      border-radius: 20px;
      padding: 0.5rem 1rem;
      margin: 0.5rem;
      cursor: pointer;
      transition: all 0.3s ease-in-out;
    }

    .option-card.selected {
      background-color: #007bff;
      color: #fff;
      border-color: #0056b3;
    }

    .option-card.disabled {
      opacity: 0.5;
      pointer-events: none;
    }

    .limit-reached {
      color: red;
      font-size: 0.875rem;
      margin-top: 1rem;
    }
</style>
