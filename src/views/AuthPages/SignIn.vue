<template>
  <div>
    <Alert :message="alert.message" :type="alert.type" v-model="alert.visible" ></Alert>
    <Spinner :isVisible="loading" />
    <h1 class="mb-0">Sign in</h1>
    <div class="mt-4">
      <div class="mb-3">
        <label for="exampleInputEmail1">Username</label>
        <input v-model="emailAddress" type="email" class="form-control mb-0" id="exampleInputEmail1" aria-describedby="emailHelp" placeholder="Enter email address">
      </div>
      <div class="mb-3 position-relative">
        <label for="exampleInputPassword1">Password</label>
        <a href="#" @click="onClickForgotPassword" style="float:right">Forgot password?</a>
        <input v-model="password" :type="showPassword ? 'text' : 'password'" class="form-control mb-0" id="exampleInputPassword1" placeholder="Password" @keyup.enter="onClickLogin" >
        <i class="ri-eye-line password-toggle-icon" @click="togglePasswordVisibility" :class="{'ri-eye-off-line': !showPassword, 'ri-eye-line': showPassword}"></i>
      </div>
      <div class="d-inline-block w-100" style="display:none;">
        <button class="btn btn-primary float-right" @click="onClickLogin">Sign in</button>
      </div>
      <div class="sign-info">
        <span class="dark-color d-inline-block line-height-2">Don't have an account? <a href="#" @click="onClickSignUp">Sign up</a></span>
      </div>
    </div>
  </div>
</template>
<script>
import Alert from '../../components/sofbox/alert/Alert.vue'
import Spinner from '../../components/sofbox/spinner/spinner.vue'

export default {
  name: 'SignIn',
  components: {
    Alert, Spinner
  },
  data () {
    return {
      emailAddress: '',
      password: '',
      showPassword: false,
      alert: {
        visible: false,
        message: '',
        type: 'primary'
      },
      loading: false
    }
  },
  mounted () {
    if (this.isSessionAvailable()) {
      this.$router.push({ name: 'dashboard.home' })
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
    isSessionAvailable () {
      if (this.$cookies.get('accessToken')) {
        return true
      }
      return false
    },
    togglePasswordVisibility () {
      this.showPassword = !this.showPassword
    },
    async onClickLogin () {
      if (this.emailAddress.trim() === '') {
        this.showAlert('Enter username', 'danger')
        return
      }
      if (this.password.trim() === '') {
        this.showAlert('Enter password', 'danger')
        return
      }
      const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
      if (!emailPattern.test(this.emailAddress)) {
        this.showAlert('Invalid email address. Please enter a valid email address in the format \'example@domain.com\'.', 'danger')
        return
      }

      await this.$store.dispatch('login', {
        username: this.emailAddress,
        password: this.password
      })
      this.$store.dispatch('resetState')
    },
    onClickSignUp () {
      this.$router.push({ path: '/auth/sign-up' })
    },
    onClickForgotPassword () {
      this.$router.push({ path: '/auth/password-reset' })
    }
  }
}
</script>
<style>
  .password-toggle-icon {
    position: absolute;
    right: 10px;
    top: 70%;
    transform: translateY(-50%);
    cursor: pointer;
    font-size: 1.2rem;
  }

  .form-group {
    position: relative;
  }
</style>
