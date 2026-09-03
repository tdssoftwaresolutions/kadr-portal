<template>
  <div class="signup-root">
    <form>
      <!-- Step 0: role selection -->
      <div v-if="step === 0" class="signup-step-zero mt-4">
        <header class="signup-intro">
          <h1 class="mb-2">Sign up</h1>
          <p class="signup-lead mb-0">
            Are you a dispute resolution expert or a client? Choose your role to continue registration.
          </p>
        </header>

        <div class="signup-actions" role="group" aria-label="Sign up options">
          <button
            type="button"
            class="btn btn-primary btn-block signup-action-btn"
            @click="selectUserType('mediator')"
          >
            Sign up as dispute resolution expert
          </button>
          <button
            type="button"
            class="btn btn-primary btn-block signup-action-btn"
            @click="selectUserType('client')"
          >
            Sign up as client
          </button>
        </div>

        <div class="sign-info">
          <span class="dark-color d-inline-block line-height-2">
            Already have an account?
            <a href="#" @click.prevent="onClickLogin">Log in</a>
          </span>
        </div>
      </div>

      <div v-if="step === 1">
        <Sign-up-client
          v-if="userType === 'client'"
          :defaultUser="defaultUser"
          :states="states"
          @onBack="onClickBack"
        />
        <Sign-up-mediator v-else :states="states" @onBack="onClickBack" />
      </div>
    </form>
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
.signup-root {
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}

.signup-intro h1 {
  font-size: 1.75rem;
  font-weight: 600;
  line-height: 1.25;
}

.signup-lead {
  color: #6c757d;
  font-size: 0.9375rem;
  line-height: 1.55;
  max-width: 36rem;
}

.signup-actions {
  margin-top: 1.75rem;
  margin-bottom: 0.25rem;
}

.signup-action-btn {
  white-space: normal;
  line-height: 1.35;
  padding-top: 0.65rem;
  padding-bottom: 0.65rem;
}

.signup-action-btn + .signup-action-btn {
  margin-top: 0.75rem;
}

.toast.toast-error {
  background-color: #dc3545;
  color: white;
}

.b-toaster-slot {
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
