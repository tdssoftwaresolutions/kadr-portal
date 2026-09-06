<template>
  <div class="auth-panel">
    <Alert :message="alert.message" :type="alert.type" v-model="alert.visible"></Alert>

    <header class="auth-head">
      <h1 class="auth-title">{{ $t('auth.recover.title') }}</h1>
      <p class="auth-sub" v-if="otpOption === false">
        {{ $t('auth.recover.subtitleRequest') }}
      </p>
      <p class="auth-sub" v-else>
        {{ $t('auth.recover.subtitleVerify') }}
      </p>
    </header>

    <!-- Step 1: request OTP -->
    <div v-if="otpOption === false" class="auth-body">
      <div class="auth-field">
        <label for="recoverEmail" class="field-label">{{ $t('auth.recover.emailLabel') }}</label>
        <div class="input-affix">
          <i class="ri-mail-line input-affix-icon" aria-hidden="true"></i>
          <input
            v-model="emailAddress"
            type="email"
            class="app-input has-affix"
            id="recoverEmail"
            :placeholder="$t('auth.emailPlaceholder')"
            autocomplete="email"
            @keyup.enter="onClickResetPassword"
          >
        </div>
      </div>

      <div class="auth-btn-row">
        <button type="button" class="btn-ghost" @click="onClickBack">
          <i class="ri-arrow-left-line" aria-hidden="true"></i> {{ $t('auth.recover.back') }}
        </button>
        <button type="button" class="btn-primary-cta btn-block-cta" @click="onClickResetPassword">
          {{ $t('auth.recover.sendOtp') }} <i class="ri-mail-send-line" aria-hidden="true"></i>
        </button>
      </div>
    </div>

    <!-- Step 2: verify OTP + set new password -->
    <div v-else class="auth-body">
      <div class="auth-field">
        <label for="recoverOtp" class="field-label">{{ $t('auth.recover.otpLabel') }}</label>
        <div class="input-affix">
          <i class="ri-shield-keyhole-line input-affix-icon" aria-hidden="true"></i>
          <input
            v-model="otp"
            type="text"
            inputmode="numeric"
            maxlength="6"
            class="app-input has-affix"
            id="recoverOtp"
            :placeholder="$t('auth.recover.otpPlaceholder')"
          >
        </div>
      </div>

      <div class="auth-field">
        <label for="recoverPassword" class="field-label">{{ $t('auth.recover.newPasswordLabel') }}</label>
        <div class="input-affix">
          <i class="ri-lock-2-line input-affix-icon" aria-hidden="true"></i>
          <input
            v-model="password"
            :type="showPassword ? 'text' : 'password'"
            class="app-input has-affix has-suffix"
            id="recoverPassword"
            :placeholder="$t('auth.recover.newPasswordPlaceholder')"
            autocomplete="new-password"
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
        <small class="field-hint">{{ $t('auth.recover.passwordRule') }}</small>
      </div>

      <div class="auth-field">
        <label for="recoverConfirm" class="field-label">{{ $t('auth.recover.confirmPasswordLabel') }}</label>
        <div class="input-affix">
          <i class="ri-lock-2-line input-affix-icon" aria-hidden="true"></i>
          <input
            v-model="confirmPassword"
            :type="showConfirmPassword ? 'text' : 'password'"
            class="app-input has-affix has-suffix"
            id="recoverConfirm"
            :placeholder="$t('auth.recover.confirmPasswordPlaceholder')"
            autocomplete="new-password"
            @keyup.enter="onClickConfirmPassword"
          >
          <button
            type="button"
            class="input-suffix-btn"
            @click="toggleConfirmPasswordVisibility"
            :aria-label="showConfirmPassword ? $t('auth.hidePassword') : $t('auth.showPassword')"
          >
            <i :class="showConfirmPassword ? 'ri-eye-off-line' : 'ri-eye-line'"></i>
          </button>
        </div>
      </div>

      <div class="auth-btn-row">
        <button type="button" class="btn-ghost" @click="onClickBackOTP">
          <i class="ri-arrow-left-line" aria-hidden="true"></i> {{ $t('auth.recover.back') }}
        </button>
        <button type="button" class="btn-primary-cta btn-block-cta btn-success-cta" @click="onClickConfirmPassword">
          <i class="ri-check-line" aria-hidden="true"></i> {{ $t('auth.recover.resetPassword') }}
        </button>
      </div>
    </div>
  </div>
</template>
<script>
import Alert from '../../components/sofbox/alert/Alert.vue'

export default {
  name: 'RecoverPassword',
  components: {
    Alert
  },
  mounted () {
  },
  data () {
    return {
      showPassword: false,
      showConfirmPassword: false,
      emailAddress: '',
      otp: '',
      password: '',
      confirmPassword: '',
      otpOption: false,
      alert: {
        visible: false,
        message: '',
        type: 'primary'
      }
    }
  },
  methods: {
    showAlert (message, type) {
      this.alert = {
        message,
        type,
        visible: true
      }
    },
    togglePasswordVisibility () {
      this.showPassword = !this.showPassword
    },
    toggleConfirmPasswordVisibility () {
      this.showConfirmPassword = !this.showConfirmPassword
    },
    onClickBackOTP () {
      this.otpOption = false
    },
    async onClickResetPassword () {
      if (this.emailAddress.trim() === '') {
        this.showAlert(this.$t('auth.recover.enterEmail'), 'danger')
        return
      }
      const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
      if (!emailPattern.test(this.emailAddress)) {
        this.showAlert(this.$t('auth.recover.invalidEmail'), 'danger')
        return
      }
      const response = await this.$store.dispatch('resetPassword', {
        emailAddress: this.emailAddress
      })
      if (response.success) {
        this.showAlert(this.$t('auth.recover.otpSentNotice'), 'success')
        this.otpOption = true
      }
    },
    validatePassword (password) {
      if (password.length < 7) {
        return {
          error: true,
          message: this.$t('auth.recover.ruleMinLength')
        }
      }

      const hasNumber = /[0-9]/
      const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/
      const hasAlphabet = /[a-zA-Z]/
      const hasUpperCase = /[A-Z]/

      if (!hasNumber.test(password)) {
        return {
          error: true,
          message: this.$t('auth.recover.ruleNumber')
        }
      }

      if (!hasSpecialChar.test(password)) {
        return {
          error: true,
          message: this.$t('auth.recover.ruleSpecial')
        }
      }

      if (!hasAlphabet.test(password)) {
        return {
          error: true,
          message: this.$t('auth.recover.ruleAlphabet')
        }
      }

      if (!hasUpperCase.test(password)) {
        return {
          error: true,
          message: this.$t('auth.recover.ruleUppercase')
        }
      }

      return {
        error: false,
        message: ''
      }
    },
    async onClickConfirmPassword () {
      if (String(this.otp).trim() === '') {
        this.showAlert(this.$t('auth.recover.enterOtp'), 'danger')
        return
      }
      if (this.password.trim() === '') {
        this.showAlert(this.$t('auth.recover.enterPassword'), 'danger')
        return
      }
      const passwordValidation = this.validatePassword(this.password)
      if (passwordValidation.error) {
        this.showAlert(passwordValidation.message, 'danger')
        return
      }
      if (this.confirmPassword.trim() === '') {
        this.showAlert(this.$t('auth.recover.enterConfirmPassword'), 'danger')
        return
      }
      if (this.password !== this.confirmPassword) {
        this.showAlert(this.$t('auth.recover.passwordMismatch'), 'danger')
        return
      }
      const response = await this.$store.dispatch('confirmPasswordChange', {
        emailAddress: this.emailAddress,
        otp: this.otp,
        password: this.password
      })
      if (response.success) {
        this.showAlert(response.message, 'success')
        setTimeout(() => {
          this.onClickBack()
        }, 1000)
      }
    },
    onClickBack () {
      this.$router.push({ path: '/auth/sign-in' })
    }
  }
}
</script>
<style scoped>
@import "../../assets/css/signupForm.css";
@import "../../assets/css/authShared.css";
</style>
