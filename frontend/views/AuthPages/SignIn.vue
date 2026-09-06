<template>
  <div class="auth-panel">
    <Alert :message="alert.message" :type="alert.type" v-model="alert.visible"></Alert>

    <header class="auth-head">
      <h1 class="auth-title">{{ $t('auth.welcomeBack') }}</h1>
      <p class="auth-sub">{{ $t('auth.signInSubtitle') }}</p>
    </header>

    <div class="auth-body">
      <kadr-form-field
        class="auth-field"
        :label="$t('auth.emailLabel')"
        :error="fieldErrors.email"
        id="signInEmail"
      >
        <template v-slot="{ id, invalid }">
          <div class="input-affix">
            <i class="ri-mail-line input-affix-icon" aria-hidden="true"></i>
            <input
              v-model="emailAddress"
              type="email"
              class="app-input has-affix"
              :class="{ 'is-invalid': invalid }"
              :id="id"
              aria-describedby="emailHelp"
              :placeholder="$t('auth.emailPlaceholder')"
              autocomplete="email"
              @input="fieldErrors.email = ''"
            >
          </div>
        </template>
      </kadr-form-field>

      <kadr-form-field
        v-if="showAccountType"
        class="auth-field"
        :label="$t('auth.accountTypeLabel')"
        :error="fieldErrors.userType"
        :hint="$t('auth.accountTypeHint')"
        id="signInAccountType"
      >
        <template v-slot="{ id, invalid }">
          <div class="app-select-wrap">
            <select
              v-model="userType"
              class="app-input app-select"
              :class="{ 'is-invalid': invalid }"
              :id="id"
              @change="fieldErrors.userType = ''"
            >
              <option disabled value="">{{ $t('auth.selectAccountType') }}</option>
              <option
                v-for="option in accountTypeOptions"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </option>
            </select>
            <i class="ri-arrow-down-s-line app-select-caret" aria-hidden="true"></i>
          </div>
        </template>
      </kadr-form-field>

      <button
        v-if="showAccountType && googleCredential"
        type="button"
        class="btn-primary-cta btn-block-cta"
        :disabled="loading || !userType"
        @click="onClickGoogleLoginWithType"
      >
        {{ $t('auth.continueWithGoogle') }} <i class="ri-arrow-right-line" aria-hidden="true"></i>
      </button>

      <kadr-form-field
        class="auth-field"
        :label="$t('auth.passwordLabel')"
        :error="fieldErrors.password"
        id="signInPassword"
      >
        <template #default="{ id, invalid }">
          <div class="input-affix">
            <i class="ri-lock-2-line input-affix-icon" aria-hidden="true"></i>
            <input
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              class="app-input has-affix has-suffix"
              :class="{ 'is-invalid': invalid }"
              :id="id"
              :placeholder="$t('auth.passwordPlaceholder')"
              autocomplete="current-password"
              @input="fieldErrors.password = ''"
              @keyup.enter="onClickLogin"
            >
            <button
              type="button"
              class="input-suffix-btn"
              @click="togglePasswordVisibility"
              :aria-label="showPassword ? $t('auth.hidePassword') : $t('auth.showPassword')"
            >
              <i :class="showPassword ? 'ri-eye-off-line' : 'ri-eye-line'"></i>
            </button>
          </div>
        </template>
      </kadr-form-field>

      <div class="auth-forgot-row">
        <a href="#" @click.prevent="onClickForgotPassword">{{ $t('auth.forgotPassword') }}</a>
      </div>

      <button type="button" class="btn-primary-cta btn-block-cta" :disabled="loading" @click="onClickLogin">
        {{ $t('auth.signIn') }} <i class="ri-arrow-right-line" aria-hidden="true"></i>
      </button>

      <div class="auth-divider"><span>{{ $t('auth.orDivider') }}</span></div>

      <div class="google-signin-wrapper">
        <!-- Google renders its official sign-in button here. One click on it
             opens the account popup directly (no intermediate overlay). -->
        <div ref="googleButton" class="google-btn-host"></div>
        <!-- Fallback shown only until GIS is ready (or if it fails to load). -->
        <button
          v-if="!googleReady"
          type="button"
          class="btn-google-signin"
          disabled
        >
          <svg class="google-icon" viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          {{ $t('auth.googleLoading') }}
        </button>
      </div>

      <div class="auth-alt-action">
        <span>{{ $t('auth.noAccount') }}</span>
        <a href="#" @click.prevent="onClickSignUp">{{ $t('auth.createAccount') }}</a>
      </div>
    </div>
  </div>
</template>
<script>
import Alert from '../../components/sofbox/alert/Alert.vue'
import KadrFormField from '../../components/kadr/KadrFormField.vue'

export default {
  name: 'SignIn',
  components: {
    Alert,
    KadrFormField
  },
  data () {
    return {
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
    accountTypeLabels () {
      return {
        CLIENT: this.$t('auth.client'),
        MEDIATOR: this.$t('auth.expert'),
        ADMIN: this.$t('auth.admin')
      }
    },
    accountTypeOptions () {
      return (this.availableTypes || []).map((value) => ({
        value,
        label: this.accountTypeLabels[value] || value
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
        this.fieldErrors.email = this.$t('auth.emailRequired')
        valid = false
      } else {
        const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
        if (!emailPattern.test(this.emailAddress)) {
          this.fieldErrors.email = this.$t('auth.emailInvalid')
          valid = false
        }
      }
      if (this.password.trim() === '') {
        this.fieldErrors.password = this.$t('auth.passwordRequired')
        valid = false
      }
      if (this.showAccountType && !this.userType) {
        this.fieldErrors.userType = this.$t('auth.accountTypeRequired')
        valid = false
      }
      return valid
    },
    async onClickLogin () {
      if (this.loading) return
      if (!this.validateFields()) return

      // Clear only user-sensitive caches before login; do not wipe the whole store.
      this.$store.commit('invalidateDashboardCaches')
      this.$store.commit('clearMediatorSubscription')
      this.$store.commit('setUser', null)

      this.loading = true
      try {
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
          this.fieldErrors.userType = this.$t('auth.accountTypeRequired')
          this.showAlert(result.message || this.$t('auth.accountTypeRequired'), 'warning')
        }
      } finally {
        this.loading = false
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
      script.onerror = () => {
        this.showAlert(this.$t('auth.googleLoadError'), 'danger')
      }
      document.head.appendChild(script)
    },
    initializeGoogle () {
      if (!process.env.VUE_APP_GOOGLE_CLIENT_ID) {
        this.showAlert(this.$t('auth.googleNotConfigured'), 'warning')
        return
      }
      window.google.accounts.id.initialize({
        client_id: process.env.VUE_APP_GOOGLE_CLIENT_ID,
        callback: this.handleGoogleCallback,
        auto_select: false,
        // Deliver the credential to `callback` via a popup. Without this, the
        // GIS button can fall back to the redirect UX and land the user on a
        // blank https://accounts.google.com/gsi/transform page after they pick
        // an account, instead of returning the token to handleGoogleCallback.
        ux_mode: 'popup',
        // Opt into FedCM. Under FedCM the browser owns the One Tap prompt UI and
        // the legacy "moment" status methods (isNotDisplayed/getNotDisplayedReason/
        // isSkippedMoment) are deprecated, so we no longer inspect them.
        use_fedcm_for_prompt: false
      })
      this.googleReady = true
      // Render Google's official button in-place. A single click on it opens the
      // account popup directly — no custom button and no intermediate overlay.
      // $nextTick ensures the host element is in the DOM (v-if flips on googleReady).
      this.$nextTick(() => this.renderGoogleButton())
    },
    renderGoogleButton () {
      const host = this.$refs.googleButton
      if (!host || !window.google?.accounts?.id) return
      host.innerHTML = ''
      window.google.accounts.id.renderButton(host, {
        theme: 'outline',
        size: 'large',
        type: 'standard',
        text: 'signin_with',
        shape: 'rectangular',
        logo_alignment: 'left',
        width: 280
      })
    },
    async handleGoogleCallback (response) {
      if (!response.credential) {
        this.showAlert(this.$t('auth.googleFailed'), 'danger')
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
        this.fieldErrors.userType = this.$t('auth.accountTypeRequired')
        this.showAlert(result.message || this.$t('auth.accountTypeRequired'), 'warning')
      }
    },
    async onClickGoogleLoginWithType () {
      if (this.loading) return
      if (!this.googleCredential || !this.userType) return
      this.loading = true
      try {
        const result = await this.$store.dispatch('googleLogin', {
          credential: this.googleCredential,
          userType: this.userType
        })
        if (result && !result.success && !result.needsAccountType) {
          this.showAlert(result.message || this.$t('auth.googleFailed'), 'danger')
        }
      } finally {
        this.loading = false
      }
    }
  }
}
</script>
<style scoped>
@import "../../assets/css/signupForm.css";
@import "../../assets/css/authShared.css";
</style>
