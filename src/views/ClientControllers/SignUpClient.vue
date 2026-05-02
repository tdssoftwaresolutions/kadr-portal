<template>
    <div>
        <Alert :message="alert.message" :type="alert.type" v-model="alert.visible" :timeout="alert.timeout"></Alert>
        <div v-if="step === 1">
            <div class="mb-3">
                <label for="name">Full Name <span class="text-danger">*</span></label>
                <input type="text" class="form-control capitalize-first-word" :disabled="existingUser"  id="name" v-model="formData.name" placeholder="Your Full Name" />
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
                <input type="email" class="form-control" :disabled="existingUser" id="email" v-model="formData.email" placeholder="Enter Email" />
            </div>
            <div class="mb-3">
                <label for="phone">Phone Number <span class="text-danger">*</span></label>
                <input type="tel" class="form-control" :disabled="existingUser" id="phone" v-model="formData.phone" placeholder="Phone Number" />
            </div>
            <div class="mb-3">
                <label for="language">Preferred Language <span class="text-danger">*</span></label>
                <select id="language" v-model="formData.preferredLanguage" class="form-control">
                <option value="">Select Language</option>
                <option v-for="(item, index) in availableLanguges" :key="index" :value="item.id">
                    {{ item.language }}
                </option>
                </select>
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
                <input type="text" class="form-control" id="pincode" v-model="formData.pincode" placeholder="Pin Code" />
            </div>
            <div class="d-flex justify-content-between">
                <div>
                  <button type="button" class="btn btn-secondary" @click="prevStep(1)">Previous</button>
                  <button type="button" class="btn btn-primary ml" @click="nextStep(1)" v-if="existingUser === false">Next</button>
                  <button type="button" class="btn btn-primary ml" @click="submitClientForm" v-else>Submit</button>
                </div>
                <div class="align-self-center">
                <span class="dark-color d-inline-block line-height-2">
                    Already Have an Account? <a href="#" @click="onClickLogin">Log In</a>
                </span>
                </div>
            </div>
        </div>
        <div v-if="step === 2">
            <div class="mb-3">
                <label for="description">Describe your dispute in brief <span class="text-danger">*</span></label>
                <textarea class="form-control" id="description" v-model="formData.description" placeholder="Describe your complaint" style="height:150px"></textarea>
            </div>
            <div class="mb-3">
                <label for="category">Complaint Category <span class="text-danger">*</span></label>
                <select class="form-control" id="category" v-model="formData.category">
                  <option value="" disabled>Select Category</option>
                  <option value="Payment related">Payment Related</option>
                  <option value="Family related">Family Related</option>
                  <option value="E-commerce">E-Commerce</option>
                  <option value="Insurance">Insurance</option>
                  <option value="Other">Other</option>
                </select>
            </div>
            <div class="mb-3">
                <label for="evidence">Upload Evidence</label>
                <div class="file-upload">
                <input type="file" class="form-control-file" id="evidence" @change="onEvidenceChange" />
                <label for="evidence" class="custom-file-upload">
                    Choose File
                </label>
                <span v-if="formData.evidence" class="file-name">{{ formData.evidence.name }}</span>
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
            <div class="mb-3">
                <label for="oppositeName">Opposite Party Name <span class="text-danger">*</span></label>
                <input type="text" class="form-control" id="oppositeName" v-model="formData.oppositeName" placeholder="Name" />
            </div>
            <div class="mb-3">
                <label for="oppositeEmail">Opposite Party Email <span class="text-danger">*</span></label>
                <input type="email" class="form-control" id="oppositeEmail" v-model="formData.oppositeEmail" placeholder="Email" />
            </div>
            <div class="mb-3">
                <label for="oppositePhone">Opposite Party Phone <span class="text-danger">*</span></label>
                <input type="tel" class="form-control" id="oppositePhone" v-model="formData.oppositePhone" placeholder="Phone" />
            </div>
            <button type="button" class="btn btn-secondary" @click="prevStep(3)">Previous</button>
            <button type="button" class="btn btn-success float-right ml" @click="submitClientForm">Submit</button>
        </div>
    </div>
</template>
<script>
import Alert from '../../components/sofbox/alert/Alert.vue'

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
        this.showAlert('Enter email address', 'danger')
        return false
      }
      const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
      if (!emailPattern.test(this.formData.email)) {
        this.showAlert('Invalid email address', 'danger')
        return false
      }
      if (this.formData.phone.trim() === '') {
        this.showAlert('Enter phone number', 'danger')
        return false
      }
      const phonePattern = /^(?:\+91|0)?[789]\d{9}$/
      if (!phonePattern.test(this.formData.phone)) {
        this.showAlert('Enter valid phone number', 'danger')
        return false
      }
      if (this.formData.preferredLanguage.trim() === '') {
        this.showAlert('Select your preferred language', 'danger')
        return false
      }
      if (this.formData.state.trim() === '') {
        this.showAlert('Select state', 'danger')
        return false
      }
      if (this.formData.city.trim() === '') {
        this.showAlert('Enter city', 'danger')
        return false
      }
      if (this.formData.pincode.trim() === '') {
        this.showAlert('Enter pincode', 'danger')
        return false
      }
      const pinCodePattern = /^[1-9][0-9]{5}$/
      if (!pinCodePattern.test(this.formData.pincode)) {
        this.showAlert('Enter valid pincode', 'danger')
        return false
      }
      if (this.existingUser === false) {
        const response = await this.$store.dispatch('isEmailExist', {
          emailAddress: this.formData.email
        })
        if (response.success && response.data.exists) {
          this.showAlert(response.message, 'danger')
          return false
        }
      }
      return true
    },
    page2Validation () {
      if (this.formData.description.trim() === '') {
        this.showAlert('Enter complaint description', 'danger')
        return false
      }
      if (this.formData.category.trim() === '') {
        this.showAlert('Enter complaint category', 'danger')
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
          this.showAlert('Invalid file type. Allowed types: PDF, DOC, DOCX, JPEG, PNG.', 'danger')
          return false
        }
        if (this.formData.evidence.size > maxSize) {
          this.showAlert('File size exceeds 2MB.', 'danger')
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
        const reader = new FileReader()
        reader.onload = () => {
          this.formData.evidenceContent = reader.result
        }
        reader.onerror = (error) => {
          console.error('Error reading file:', error)
        }
        reader.readAsDataURL(file)
        this.formData.evidence = file
      }
    },
    async submitClientForm () {
      if (this.existingUser === false) {
        if (this.formData.oppositeName.trim() === '') {
          this.showAlert('Enter opposite party name', 'danger')
          return
        }
        if (this.formData.oppositeEmail.trim() === '') {
          this.showAlert('Enter opposite party email', 'danger')
          return
        }
        const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
        if (!emailPattern.test(this.formData.oppositeEmail)) {
          this.showAlert('Invalid email address', 'danger')
          return
        }
        if (this.formData.oppositePhone.trim() === '') {
          this.showAlert('Enter opposite party phone', 'danger')
          return
        }
        const phonePattern = /^(?:\+91|0)?[789]\d{9}$/
        if (!phonePattern.test(this.formData.oppositePhone)) {
          this.showAlert('Enter valid phone number', 'danger')
          return
        }
      } else {
        const isValid = await this.page1Validation()
        if (!isValid) return
      }
      const response = await this.$store.dispatch('newUserSignup', {
        userDetails: this.formData,
        existingUser: this.existingUser
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
</style>
