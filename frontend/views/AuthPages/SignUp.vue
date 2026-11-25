<template>
  <div class="signup-root" :class="{ 'signup-root--mediator-only': mediatorOnly }">
    <header v-if="mediatorOnly" class="mediator-signup-brand">
      <div class="mediator-signup-lockup">
        <img :src="logo" alt="" class="mediator-signup-logo" />
        <span class="mediator-signup-wordmark">
          <strong>KADR</strong>
          <span>Online Mediation Platform</span>
        </span>
      </div>
      <nav class="mediator-signup-actions" aria-label="Page actions">
        <a href="/terms_of_use_experts.html" target="_blank" rel="noopener noreferrer">
          Mediator Terms &amp; Conditions
        </a>
        <button type="button" class="mediator-signup-language" @click="toggleLocale">
          <i class="ri-translate-2" aria-hidden="true"></i>
          {{ $i18n.locale === 'hi' ? 'English' : 'हिन्दी' }}
        </button>
      </nav>
    </header>
    <!-- Step 0: role selection -->
    <div v-if="step === 0 && !mediatorOnly" class="signup-step-zero">
      <header class="signup-intro">
        <h1 class="signup-title">{{ $t('auth.signup.createTitle') }}</h1>
        <p class="signup-lead">
          {{ $t('auth.signup.createLead') }}
        </p>
      </header>

      <div class="role-grid" role="group" :aria-label="$t('auth.signup.createTitle')">
        <button
          type="button"
          class="role-card"
          @click="selectUserType('client')"
        >
          <span class="role-icon role-icon--client">
            <i class="ri-user-3-line" aria-hidden="true"></i>
          </span>
          <span class="role-body">
            <span class="role-name">{{ $t('auth.signup.roleClientName') }}</span>
            <span class="role-desc">{{ $t('auth.signup.roleClientDesc') }}</span>
          </span>
          <i class="ri-arrow-right-line role-arrow" aria-hidden="true"></i>
        </button>

        <button
          type="button"
          class="role-card"
          @click="selectUserType('mediator')"
        >
          <span class="role-icon role-icon--mediator">
            <i class="ri-scales-3-line" aria-hidden="true"></i>
          </span>
          <span class="role-body">
            <span class="role-name">{{ $t('auth.signup.roleMediatorName') }}</span>
            <span class="role-desc">{{ $t('auth.signup.roleMediatorDesc') }}</span>
          </span>
          <i class="ri-arrow-right-line role-arrow" aria-hidden="true"></i>
        </button>
      </div>

      <div class="signup-login-row">
        <span>{{ $t('auth.signup.alreadyHaveAccount') }}</span>
        <a href="#" @click.prevent="onClickLogin">{{ $t('auth.signup.logIn') }}</a>
      </div>
    </div>

    <div v-if="step === 1" class="signup-form-host">
      <Sign-up-client
        v-if="userType === 'client'"
        :defaultUser="defaultUser"
        :states="states"
        @onBack="onClickBack"
      />
      <Sign-up-mediator v-else :states="states" :allow-back="!mediatorOnly" :show-login-link="!mediatorOnly" @onBack="onClickBack" />
    </div>
  </div>
</template>

<script>
import SignUpClient from '../ClientControllers/SignUpClient.vue'
import SignUpMediator from '../MediatorControllers/SignUpMediator.vue'
import { sofbox } from '../../config/pluginInit'
import logo from '../../assets/images/logo.png'

export default {
  name: 'SignUp',
  props: {
    mediatorOnly: {
      type: Boolean,
      default: false
    }
  },
  components: {
    SignUpClient, SignUpMediator
  },
  data () {
    return {
      states: [],
      step: this.mediatorOnly ? 1 : 0,
      userType: this.mediatorOnly ? 'mediator' : '',
      logo,
      defaultUser: null
    }
  },
  async mounted () {
    // House convention for every route page. AuthLayout also calls this
    // itself (it owns the shared loader/carousel markup), but this page
    // gets its own call too per the house rule for URL-addressable pages —
    // especially relevant here since this page is often reached via a
    // direct email link (?id=...), not client-side navigation.
    sofbox.index()
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
      this.$router.push({ path: '/sign-in' })
    },
    toggleLocale () {
      if (this.$i18n) {
        this.$i18n.setLocale(this.$i18n.locale === 'en' ? 'hi' : 'en')
      }
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

.signup-root--mediator-only :deep(.signup-form) {
  max-height: none;
}

.signup-root--mediator-only :deep(.signup-form-body) {
  flex: 0 0 auto;
  overflow: visible;
  margin-right: 0;
}

.mediator-signup-brand {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
  padding: 1rem 1.25rem;
  background: #e8f2f0;
  border-bottom: 3px solid #1f625b;
  margin: 0 0 1.5rem;
}

.mediator-signup-lockup {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-width: 0;
}

.mediator-signup-logo {
  display: block;
  width: auto;
  height: 2.75rem;
  object-fit: contain;
}

.mediator-signup-wordmark {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  color: #173b39;
  line-height: 1.2;
}

.mediator-signup-wordmark strong {
  font-size: 1.1rem;
  font-weight: 800;
}

.mediator-signup-wordmark > span {
  font-size: 0.76rem;
}

.mediator-signup-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 1.25rem;
}

.mediator-signup-actions a {
  color: #174f4b;
  font-size: 0.9rem;
  font-weight: 600;
  text-align: right;
}

.mediator-signup-language {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  min-height: 2.5rem;
  padding: 0.4rem 0.75rem;
  color: #174f4b;
  background: #fff;
  border: 1px solid #b8d0cc;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
}

@media (max-width: 575.98px) {
  .mediator-signup-brand {
    align-items: flex-start;
    flex-direction: column;
    gap: 0.8rem;
  }

  .mediator-signup-actions {
    width: 100%;
    justify-content: space-between;
    gap: 0.75rem;
  }

  .mediator-signup-actions a {
    text-align: left;
  }
}

.signup-step-zero {
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 60vh;
}

.signup-intro {
  margin-bottom: 1.75rem;
}

.signup-title {
  font-size: 1.85rem;
  font-weight: 700;
  line-height: 1.2;
  color: var(--kadr-text-primary);
  margin-bottom: 0.5rem;
}

.signup-lead {
  color: var(--kadr-text-muted);
  font-size: 0.95rem;
  line-height: 1.55;
  margin: 0;
}

.role-grid {
  display: grid;
  gap: 0.9rem;
}

.role-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  width: 100%;
  text-align: left;
  padding: 1.1rem 1.15rem;
  background: var(--kadr-bg-surface);
  border: 1.5px solid var(--kadr-border-strong);
  border-radius: 14px;
  cursor: pointer;
  transition: border-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease;
}

.role-card:hover {
  border-color: var(--kadr-primary);
  box-shadow: var(--kadr-shadow-primary);
  transform: translateY(-2px);
}

.role-icon {
  flex-shrink: 0;
  width: 3rem;
  height: 3rem;
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
}

.role-icon--client {
  background: var(--kadr-status-info-bg);
  color: var(--kadr-status-info-text);
}

.role-icon--mediator {
  background: var(--kadr-primary-soft);
  color: var(--kadr-primary);
}

.role-body {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-width: 0;
}

.role-name {
  font-size: 1rem;
  font-weight: 600;
  color: var(--kadr-text-primary);
  line-height: 1.3;
}

.role-desc {
  font-size: 0.83rem;
  color: var(--kadr-text-muted);
  line-height: 1.4;
}

.role-arrow {
  margin-left: auto;
  color: var(--kadr-text-label);
  font-size: 1.25rem;
  transition: transform 0.18s ease, color 0.18s ease;
}

.role-card:hover .role-arrow {
  color: var(--kadr-primary);
  transform: translateX(3px);
}

.signup-login-row {
  margin-top: 1.75rem;
  padding-top: 1.25rem;
  border-top: 1px solid var(--kadr-border);
  font-size: 0.9rem;
  color: var(--kadr-text-muted);
}

.signup-login-row a {
  color: var(--kadr-primary);
  font-weight: 600;
  margin-left: 0.35rem;
}

.signup-form-host {
  width: 100%;
}
</style>
