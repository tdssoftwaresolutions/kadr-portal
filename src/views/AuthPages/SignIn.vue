<template>
  <div>
    <Alert :message="alert.message" :type="alert.type" v-model="alert.visible"></Alert>
    <Spinner :isVisible="loading" />
    <h1 class="mb-0">Sign in</h1>
    <div class="mt-4">
      <kadr-form-field
        class="mb-3"
        :label="AUTH.EMAIL_LABEL"
        :error="fieldErrors.email"
        id="signInEmail"
      >
        <template v-slot="{ id, invalid }">
          <input
            v-model="emailAddress"
            type="email"
            class="form-control mb-0"
            :class="{ 'is-invalid': invalid }"
            :id="id"
            aria-describedby="emailHelp"
            placeholder="Enter email address"
            autocomplete="email"
            @input="fieldErrors.email = ''"
          >
        </template>
      </kadr-form-field>
      <kadr-form-field
        v-if="showAccountType"
        class="mb-3"
        :label="AUTH.ACCOUNT_TYPE_LABEL"
        :error="fieldErrors.userType"
        :hint="AUTH.ACCOUNT_TYPE_HINT"
        id="signInAccountType"
      >
        <template v-slot="{ id, invalid }">
          <select
            v-model="userType"
            class="form-control mb-0"
            :class="{ 'is-invalid': invalid }"
            :id="id"
            @change="fieldErrors.userType = ''"
          >
            <option disabled value="">Select account type</option>
            <option
              v-for="option in accountTypeOptions"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>
        </template>
      </kadr-form-field>
      <div class="position-relative mb-3">
        <a
          href="#"
          class="signin-forgot-link"
          @click.prevent="onClickForgotPassword"
        >{{ AUTH.FORGOT_PASSWORD }}</a>
        <kadr-form-field
          :label="AUTH.PASSWORD_LABEL"
          :error="fieldErrors.password"
          id="signInPassword"
        >
          <template v-slot="{ id, invalid }">
            <div class="position-relative">
              <input
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                class="form-control mb-0"
                :class="{ 'is-invalid': invalid }"
                :id="id"
                placeholder="Password"
                autocomplete="current-password"
                @input="fieldErrors.password = ''"
                @keyup.enter="onClickLogin"
              >
              <button
                type="button"
                class="password-toggle-btn"
                @click="togglePasswordVisibility"
                :aria-label="showPassword ? 'Hide password' : 'Show password'"
              >
                <i :class="showPassword ? 'ri-eye-off-line' : 'ri-eye-line'"></i>
              </button>
            </div>
          </template>
        </kadr-form-field>
      </div>
      <div class="d-inline-block w-100">
        <button type="button" class="btn btn-primary float-right" @click="onClickLogin">Sign in</button>
      </div>
      <div class="google-signin-divider">
        <span>or</span>
      </div>
      <div class="google-signin-wrapper">
        <button type="button" class="btn btn-google-signin" @click="onClickGoogleLogin" :disabled="!googleReady">
          <svg class="google-icon" viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Sign in with Google
        </button>
      </div>
      <div class="sign-info">
        <span class="dark-color d-inline-block line-height-2">
          {{ AUTH.NO_ACCOUNT }}
          <a href="#" @click.prevent="onClickSignUp">{{ AUTH.CREATE_ACCOUNT }}</a>
        </span>
      </div>
    </div>
  </div>
</template>
<script>
import Alert from '../../components/sofbox/alert/Alert.vue'
import Spinner from '../../components/sofbox/spinner/spinner.vue'
import KadrFormField from '../../components/kadr/KadrFormField.vue'
import { AUTH } from '../../constants/messages'

const ACCOUNT_TYPE_LABELS = {
  CLIENT: 'Client',
  MEDIATOR: 'Dispute Resolution Expert',
  ADMIN: 'Admin'
}

export default {
  name: 'SignIn',
  components: {
    Alert,
    Spinner,
    KadrFormField
  },
  data () {
    return {
      AUTH,
      emailAddress: '',
      password: '',
      userType: '',
      showAccountType: false,
      availableTypes: ['CLIENT', 'MEDIATOR', 'ADMIN'],
      showPassword: false,
      googleReady: false,
      googleCredential: null,
      fieldErrors: {
        email: '',
        password: '',
        userType: ''
      },
      alert: {
        visible: false,
        message: '',
        type: 'primary'
      },
      loading: false
    }
  },
  computed: {
    accountTypeOptions () {
      return (this.availableTypes || []).map((value) => ({
        value,
        label: ACCOUNT_TYPE_LABELS[value] || value
      }))
    }
  },
  async mounted () {
    const { hasStoredSession } = await import('../../utils/tokenStorage')
    if (await hasStoredSession()) {
      this.$router.push({ name: 'dashboard.home' })
    }
    this.loadGoogleIdentityServices()
  },
  methods: {
    showAlert (message, type) {
      this.alert = {
        message,
        type,
        visible: true
      }
    },
    isSessionAvailable () {
      if (this.$cookies.get('accessToken')) {
        return true
      }
      return false
    },
    togglePasswordVisibility () {
      this.showPassword = !this.showPassword
    },
    validateFields () {
      this.fieldErrors = { email: '', password: '', userType: '' }
      let valid = true
      if (this.emailAddress.trim() === '') {
        this.fieldErrors.email = AUTH.EMAIL_REQUIRED
        valid = false
      } else {
        const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
        if (!emailPattern.test(this.emailAddress)) {
          this.fieldErrors.email = AUTH.EMAIL_INVALID
          valid = false
        }
      }
      if (this.password.trim() === '') {
        this.fieldErrors.password = AUTH.PASSWORD_REQUIRED
        valid = false
      }
      if (this.showAccountType && !this.userType) {
        this.fieldErrors.userType = AUTH.ACCOUNT_TYPE_REQUIRED
        valid = false
      }
      return valid
    },
    async onClickLogin () {
      if (!this.validateFields()) return

      // Clear only user-sensitive caches before login; do not wipe the whole store.
      this.$store.commit('invalidateDashboardCaches')
      this.$store.commit('clearMediatorSubscription')
      this.$store.commit('setUser', null)

      const result = await this.$store.dispatch('login', {
        username: this.emailAddress,
        password: this.password,
        userType: this.userType || undefined
      })

      if (result && result.needsAccountType) {
        this.showAccountType = true
        this.availableTypes = result.availableTypes?.length
          ? result.availableTypes
          : ['CLIENT', 'MEDIATOR', 'ADMIN']
        this.fieldErrors.userType = AUTH.ACCOUNT_TYPE_REQUIRED
        this.showAlert(result.message || AUTH.ACCOUNT_TYPE_REQUIRED, 'warning')
      }
    },
    onClickSignUp () {
      this.$router.push({ path: '/auth/sign-up' })
    },
    onClickForgotPassword () {
      this.$router.push({ path: '/auth/password-reset' })
    },
    loadGoogleIdentityServices () {
      if (window.google && window.google.accounts) {
        this.initializeGoogle()
        return
      }
      const script = document.createElement('script')
      script.src = 'https://accounts.google.com/gsi/client'
      script.async = true
      script.defer = true
      script.onload = () => this.initializeGoogle()
      document.head.appendChild(script)
    },
    initializeGoogle () {
      window.google.accounts.id.initialize({
        client_id: process.env.VUE_APP_GOOGLE_CLIENT_ID,
        callback: this.handleGoogleCallback,
        auto_select: false
      })
      this.googleReady = true
    },
    onClickGoogleLogin () {
      if (!this.googleReady) return
      window.google.accounts.id.prompt((notification) => {
        // If One Tap is not displayed or skipped, it means the user needs to
        // interact with a rendered button. We'll render it in a hidden container
        // and auto-click, or just show an alert.
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          this.renderGoogleButton()
        }
      })
    },
    renderGoogleButton () {
      // Create a temporary container for the Google button
      let container = document.getElementById('google-signin-temp')
      if (!container) {
        container = document.createElement('div')
        container.id = 'google-signin-temp'
        container.style.position = 'fixed'
        container.style.top = '50%'
        container.style.left = '50%'
        container.style.transform = 'translate(-50%, -50%)'
        container.style.zIndex = '9999'
        container.style.background = '#fff'
        container.style.padding = '2rem'
        container.style.borderRadius = '8px'
        container.style.boxShadow = '0 4px 24px rgba(0,0,0,0.18)'
        document.body.appendChild(container)
      }
      container.innerHTML = '<p style="margin-bottom:1rem;text-align:center;">Select your Google account</p><div id="google-btn-render"></div><p style="text-align:center;margin-top:1rem;"><a href="#" id="google-popup-close" style="font-size:0.875rem;">Cancel</a></p>'
      window.google.accounts.id.renderButton(
        document.getElementById('google-btn-render'),
        { theme: 'outline', size: 'large', width: 280 }
      )
      document.getElementById('google-popup-close').addEventListener('click', (e) => {
        e.preventDefault()
        container.remove()
      })
    },
    async handleGoogleCallback (response) {
      if (!response.credential) {
        this.showAlert('Google sign-in failed. Please try again.', 'danger')
        return
      }

      this.$store.commit('invalidateDashboardCaches')
      this.$store.commit('clearMediatorSubscription')
      this.$store.commit('setUser', null)

      const result = await this.$store.dispatch('googleLogin', {
        credential: response.credential,
        userType: this.userType || undefined
      })

      if (result && result.needsAccountType) {
        this.googleCredential = response.credential
        this.showAccountType = true
        this.availableTypes = result.availableTypes?.length
          ? result.availableTypes
          : ['CLIENT', 'MEDIATOR', 'ADMIN']
        this.fieldErrors.userType = AUTH.ACCOUNT_TYPE_REQUIRED
        this.showAlert(result.message || AUTH.ACCOUNT_TYPE_REQUIRED, 'warning')
      }
    },
    async onClickGoogleLoginWithType () {
      if (!this.googleCredential || !this.userType) return
      const result = await this.$store.dispatch('googleLogin', {
        credential: this.googleCredential,
        userType: this.userType
      })
      if (result && !result.success) {
        this.showAlert(result.message || 'Login failed', 'danger')
      }
    }
  }
}
</script>
<style scoped>
  .signin-forgot-link {
    position: absolute;
    right: 0;
    top: 0;
    z-index: 1;
    font-size: 0.875rem;
  }

  .password-toggle-btn {
    position: absolute;
    right: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    border: 0;
    background: transparent;
    color: #6c757d;
    padding: 0;
    line-height: 1;
  }

  .google-signin-divider {
    text-align: center;
    margin: 1.25rem 0;
    position: relative;
  }

  .google-signin-divider::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 0;
    right: 0;
    height: 1px;
    background-color: #dee2e6;
  }

  .google-signin-divider span {
    background-color: #fff;
    padding: 0 0.75rem;
    position: relative;
    color: #6c757d;
    font-size: 0.875rem;
  }

  .google-signin-wrapper {
    margin-bottom: 1rem;
  }

  .btn-google-signin {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.625rem 1rem;
    border: 1px solid #dadce0;
    border-radius: 4px;
    background-color: #fff;
    color: #3c4043;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s, box-shadow 0.2s;
  }

  .btn-google-signin:hover:not(:disabled) {
    background-color: #f8f9fa;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
  }

  .btn-google-signin:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .google-icon {
    flex-shrink: 0;
  }
</style>
