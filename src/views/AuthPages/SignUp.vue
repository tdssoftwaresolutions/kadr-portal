<template>
  <div class="container">
    <div class="form-container">
      <form class="mt-4">
        <!--Step 0 for both client and mediator-->
        <div v-if="step === 0" class="card">
          <div class="card-body">
            <h5 class="card-title">Are you a Dispute Resolution Expert or Client?</h5>
            <p class="card-text">Please select your role to proceed with the sign-up process.</p>
            <button type="button" class="btn btn-primary" style="margin-right:1rem" @click="selectUserType('mediator')">Sign Up as Dispute Resolution Expert</button>
            <button type="button" class="btn btn-primary" style="margin-left:1rem" @click="selectUserType('client')">Sign Up as Client</button>
            <span class="dark-color d-inline-block line-height-2" style="margin-top: 2rem;">
              Already Have an Account? <a href="#" @click="onClickLogin">Log In</a>
            </span>
          </div>
        </div>
        <div v-if="step === 1">
          <!--CLIENT-->
          <Sign-up-client :defaultUser="defaultUser" :states="states" @onBack="onClickBack" v-if="userType === 'client'"></Sign-up-client>
          <!---MEDIATOR-->
          <Sign-up-mediator :states="states" @onBack="onClickBack" v-else></Sign-up-mediator>
        </div>
      </form>
    </div>
  </div>
</template>

<script>
import SignUpClient from '../ClientControllers/SignUpClient.vue'
import SignUpMediator from '../MediatorControllers/SignUpMediator.vue'

export default {
  name: 'SignUp',
  components: {
    SignUpClient, SignUpMediator
  },
  data () {
    return {
      states: [],
      step: 0,
      userType: '',
      defaultUser: null
    }
  },
  async mounted () {
    this.loadStates()
    const queryParams = new URLSearchParams(window.location.search)
    const requestId = queryParams.get('id')
    if (requestId) {
      const response = await this.$store.dispatch('getExistingUser', { token: requestId })
      if (response.success) {
        this.step = 1
        this.userType = 'client'
        this.defaultUser = {
          name: response.data.name,
          email: response.data.email,
          phone: response.data.phone_number
        }
      }
    }
  },
  methods: {
    showAlert (message, type) {
      this.alert = {
        message,
        type,
        timeout: 5000,
        visible: true
      }
    },
    showAlertWithTimeout (message, type, timeout) {
      this.alert = {
        message,
        type,
        visible: true,
        timeout
      }
    },
    onClickBack () {
      this.userType = ''
      this.step = 0
    },
    async loadStates () {
      const response = await this.$store.dispatch('getStates')
      if (response.errorCode) {
        this.showAlert(response.message, 'danger')
      } else {
        this.states = response
      }
    },
    onClickLogin () {
      this.$router.push({ path: '/auth/sign-in' })
    },
    selectUserType (type) {
      this.userType = type
      this.step = 1
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
