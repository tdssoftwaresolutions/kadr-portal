<template>
  <b-container fluid>
    <Alert :message="alert.message" :type="alert.type" v-model="alert.visible" :timeout="alert.timeout"></Alert>
    <kadr-page-header :title="$t('profileEdit.title')" :subtitle="$t('profileEdit.subtitle')" />
    <b-row>
      <b-col lg="12">
        <iq-card>
          <template v-slot:body>
            <div class="iq-edit-list">
              <ul class="iq-edit-profile nav nav-pills mb-4" :class="{ 'iq-edit-profile--mediator': isMediator }">
                <li class="iq-edit-profile__tab">
                  <a class="nav-link" :class="{active: activeTab==='personal'}" @click="activeTab='personal'">
                    {{ $t('profileEdit.tabPersonal') }}
                  </a>
                </li>
                <li class="iq-edit-profile__tab">
                  <a class="nav-link" :class="{active: activeTab==='password'}" @click="activeTab='password'">
                    {{ $t('profileEdit.tabPassword') }}
                  </a>
                </li>
                <li class="iq-edit-profile__tab">
                  <a class="nav-link" :class="{active: activeTab==='preferences'}" @click="activeTab='preferences'">
                    {{ $t('profileEdit.tabPreferences') }}
                  </a>
                </li>
                <li v-if="isMediator" class="iq-edit-profile__tab">
                  <a class="nav-link" :class="{active: activeTab==='subscription'}" @click="activeTab='subscription'">
                    {{ $t('profileEdit.tabSubscription') }}
                  </a>
                </li>
                <li class="iq-edit-profile__tab">
                  <a class="nav-link" :class="{active: activeTab==='account'}" @click="activeTab='account'">
                    {{ $t('profileEdit.tabAccount') }}
                  </a>
                </li>
              </ul>
            </div>
            <div class="iq-edit-list-data">
              <div v-show="activeTab==='personal'" class="profile-section">
                <h4 class="profile-section-title">{{ $t('profileEdit.personalHeading') }}</h4>
                <b-form @submit.prevent="onSave">
                  <div class="form-group row align-items-center">
                    <div class="col-md-12">
                      <label class="d-block font-weight-bold mb-2">{{ $t('profileEdit.profilePicture') }}</label>
                      <p class="text-muted small mb-2">{{ $t('profileEdit.profilePictureHint') }}</p>
                      <div class="profile-img-edit">
                        <img
                          class="profile-pic"
                          :src="profilePicturePreview || form.profile_picture_url || defaultProfileImage"
                          :alt="$t('profileEdit.profilePictureAlt')"
                          @click="triggerProfilePictureUpload"
                        >
                        <div class="p-image" @click.stop="triggerProfilePictureUpload" :title="$t('profileEdit.changeProfilePicture')">
                          <i class="ri-pencil-line upload-button" aria-hidden="true"></i>
                          <input
                            ref="profilePictureInput"
                            class="file-upload"
                            type="file"
                            accept="image/jpeg,image/png"
                            @change="onProfilePictureChange"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div class="row align-items-center">
                    <div class="col-sm-6 mb-3">
                      <kadr-form-field :label="$t('profileEdit.fullName')" id="name">
                        <template v-slot="{ id }">
                          <b-form-input :id="id" v-model="form.name" required />
                        </template>
                      </kadr-form-field>
                    </div>
                    <div class="col-sm-6 mb-3">
                      <kadr-form-field :label="$t('profileEdit.email')" id="email" :hint="$t('profileEdit.emailHint')">
                        <template v-slot="{ id }">
                          <b-form-input :id="id" :value="user.email" readonly />
                        </template>
                      </kadr-form-field>
                    </div>
                    <div class="col-sm-6 mb-3">
                      <kadr-form-field :label="$t('profileEdit.phoneNumber')" id="phone">
                        <template v-slot="{ id }">
                          <b-form-input :id="id" v-model="form.phone_number" />
                        </template>
                      </kadr-form-field>
                    </div>
                  </div>
                  <div v-if="isMediator" class="reward-profile-link mb-4 p-3 border rounded bg-light">
                    <div class="d-flex justify-content-between align-items-center flex-wrap">
                      <div>
                        <strong>{{ $t('profileEdit.rewardPoints') }}</strong>
                        <p class="mb-0 text-muted small">{{ $t('profileEdit.rewardBalance', { balance: rewardBalance.toLocaleString() }) }}</p>
                      </div>
                      <b-button variant="outline-primary" size="sm" class="mt-2 mt-sm-0" @click="goToRewards">
                        {{ $t('profileEdit.rewardStoreReferral') }}
                      </b-button>
                    </div>
                  </div>
                  <button type="submit" class="btn btn-primary me-2">
                    <span>{{ $t('profileEdit.save') }}</span>
                  </button>
                </b-form>
              </div>
              <div v-show="activeTab==='preferences'" class="profile-section">
                <h4 class="profile-section-title">{{ $t('profileEdit.preferencesHeading') }}</h4>
                <p class="text-muted small mb-3">{{ $t('profileEdit.preferencesHint') }}</p>
                <b-form @submit.prevent="onSavePreferences">
                  <div class="mb-3">
                    <label class="d-block mb-2">{{ $t('profileEdit.timezone') }}</label>
                    <b-form-radio-group
                      v-model="prefs.timezoneMode"
                      :options="timezoneModeOptions"
                      name="timezoneMode"
                      stacked
                      class="mb-2"
                    />
                    <p v-if="prefs.timezoneMode === 'auto'" class="text-muted small mb-0">
                      {{ $t('profileEdit.timezoneDetected', { timezone: detectedTimezone }) }}
                    </p>
                    <div v-else style="max-width: 360px;">
                      <kadr-form-field :label="$t('profileEdit.selectTimezone')" id="prefTimezone">
                        <template v-slot="{ id }">
                          <b-form-select :id="id" v-model="prefs.timezone" :options="timezoneOptions" />
                        </template>
                      </kadr-form-field>
                    </div>
                  </div>
                  <div class="mb-3">
                    <b-form-checkbox v-model="prefs.notificationEmail">
                      {{ $t('profileEdit.receiveNotificationEmails') }}
                    </b-form-checkbox>
                  </div>
                  <button type="submit" class="btn btn-primary me-2">{{ $t('profileEdit.savePreferences') }}</button>
                </b-form>
              </div>
              <div v-show="activeTab==='subscription' && isMediator" class="profile-section">
                <h4 class="profile-section-title">{{ $t('profileEdit.subscriptionHeading') }}</h4>
                <p v-if="subscriptionLoading" class="text-muted">{{ $t('profileEdit.planLoading') }}</p>
                <template v-else>
                  <p class="mb-2">{{ $t('profileEdit.currentPlan') }} <b-badge :variant="subscription.tier === 'PRO' ? 'success' : 'secondary'">{{ subscription.tier === 'PRO' ? $t('profileEdit.planPro') : $t('profileEdit.planFree') }}</b-badge></p>
                  <p v-if="subscription.tier === 'PRO' && subscriptionExpiryLabel" class="text-muted small">{{ $t('profileEdit.validThrough', { date: subscriptionExpiryLabel }) }}</p>
                  <b-button v-if="subscription.tier !== 'PRO'" variant="primary" class="mt-2" @click="showProPayment = true">{{ $t('profileEdit.upgradeToPro', { amount: subscription.monthlyPriceInr }) }}</b-button>
                </template>
              </div>
              <div v-show="activeTab==='account'" class="profile-section">
                <h4 class="profile-section-title text-danger">{{ $t('profileEdit.deleteAccountHeading') }}</h4>
                <p>
                  {{ $t('profileEdit.deleteAccountInfo') }}
                </p>
                <b-form-checkbox v-model="deleteConfirm" class="mb-3">
                  {{ $t('profileEdit.deleteAccountConfirm') }}
                </b-form-checkbox>
                <button type="button" class="btn btn-danger" :disabled="!deleteConfirm" @click="onDeleteAccount">
                  {{ $t('profileEdit.deleteMyAccount') }}
                </button>
              </div>
              <div v-show="activeTab==='password'" class="profile-section">
                <h4 class="profile-section-title">{{ $t('profileEdit.changePasswordHeading') }}</h4>
                <p class="text-muted small mb-3">{{ $t('profileEdit.passwordHint') }}</p>
                <b-form @submit.prevent="onSavePassword">
                  <div class="mb-3 position-relative">
                    <kadr-form-field :label="$t('profileEdit.currentPassword')" id="profileCurrentPassword">
                      <template v-slot="{ id }">
                        <div class="position-relative">
                          <input v-model="form.currentPassword" :type="showPassword ? 'text' : 'password'" class="form-control mb-0" :id="id" :placeholder="$t('profileEdit.currentPassword')" autocomplete="current-password">
                          <button type="button" class="password-toggle-icon-btn" @click="togglePasswordVisibility" :aria-label="showPassword ? $t('profileEdit.hidePassword') : $t('profileEdit.showPassword')">
                            <i :class="showPassword ? 'ri-eye-off-line' : 'ri-eye-line'"></i>
                          </button>
                        </div>
                      </template>
                    </kadr-form-field>
                  </div>
                  <div class="mb-3 position-relative">
                    <kadr-form-field :label="$t('profileEdit.newPassword')" id="profilePassword">
                      <template v-slot="{ id }">
                        <div class="position-relative">
                          <input v-model="form.password" :type="showPassword ? 'text' : 'password'" class="form-control mb-0" :id="id" :placeholder="$t('profileEdit.newPassword')" autocomplete="new-password">
                          <button type="button" class="password-toggle-icon-btn" @click="togglePasswordVisibility" :aria-label="showPassword ? $t('profileEdit.hidePassword') : $t('profileEdit.showPassword')">
                            <i :class="showPassword ? 'ri-eye-off-line' : 'ri-eye-line'"></i>
                          </button>
                        </div>
                      </template>
                    </kadr-form-field>
                  </div>
                  <div class="mb-3 position-relative">
                    <kadr-form-field :label="$t('profileEdit.confirmNewPassword')" id="profileConfirmPassword">
                      <template v-slot="{ id }">
                        <div class="position-relative">
                          <input v-model="form.confirmPassword" :type="showPassword ? 'text' : 'password'" class="form-control mb-0" :id="id" :placeholder="$t('profileEdit.confirmNewPassword')" autocomplete="new-password">
                          <button type="button" class="password-toggle-icon-btn" @click="togglePasswordVisibility" :aria-label="showPassword ? $t('profileEdit.hidePassword') : $t('profileEdit.showPassword')">
                            <i :class="showPassword ? 'ri-eye-off-line' : 'ri-eye-line'"></i>
                          </button>
                        </div>
                      </template>
                    </kadr-form-field>
                  </div>
                  <button type="submit" class="btn btn-primary me-2">
                    <span>{{ $t('profileEdit.changePasswordButton') }}</span>
                  </button>
                </b-form>
              </div>
            </div>
          </template>
        </iq-card>
      </b-col>
    </b-row>
    <PaymentCheckout
      :visible="showProPayment"
      purpose="MEDIATOR_PRO"
      :amount-inr="subscription.monthlyPriceInr || 1000"
      :title="$t('profileEdit.checkoutTitle')"
      :subtitle="$t('profileEdit.checkoutSubtitle')"
      @close="showProPayment = false"
    />
  </b-container>
</template>
<script>
import { sofbox } from '../../config/pluginInit'
import profile from '../../assets/images/default_avatar.jpeg'
import Alert from '../../components/sofbox/alert/Alert.vue'
import PaymentCheckout from '../../components/payment/PaymentCheckout.vue'
import KadrPageHeader from '../../components/kadr/KadrPageHeader.vue'
import KadrFormField from '../../components/kadr/KadrFormField.vue'
import {
  getUserPreferences,
  setUserPreferences,
  getTimezoneOptions,
  detectDeviceTimezone,
  applyServerPreferences
} from '../../utils/timezone'
import { validatePasswordStrength } from '../../utils/passwordValidation'

const allowedTypes = [
  'image/jpeg',
  'image/png'
]
const maxSize = 2 * 1024 * 1024

export default {
  name: 'ProfileEdit',
  watchTimezone: true,
  components: {
    Alert,
    PaymentCheckout,
    KadrPageHeader,
    KadrFormField
  },
  data () {
    return {
      showPassword: false,
      defaultProfileImage: profile,
      activeTab: 'personal',
      form: {
        name: '',
        profile_picture_url: null,
        phone_number: '',
        currentPassword: '',
        password: '',
        confirmPassword: ''
      },
      user: {
        email: '',
        name: '',
        phone_number: '',
        profile_picture_url: '',
        url: ''
      },
      prefs: getUserPreferences(),
      timezoneOptions: getTimezoneOptions(),
      detectedTimezone: detectDeviceTimezone(),
      profilePictureFile: null,
      profilePicturePreview: null,
      alert: {
        visible: false,
        message: '',
        timeout: 5000,
        type: 'primary'
      },
      deleteConfirm: false,
      rewardBalance: 0,
      subscription: { tier: 'FREE', expiresAt: null, monthlyPriceInr: 1000, features: [] },
      subscriptionLoading: false,
      showProPayment: false
    }
  },
  computed: {
    timezoneModeOptions () {
      return [
        { text: this.$t('profileEdit.timezoneModeAuto'), value: 'auto' },
        { text: this.$t('profileEdit.timezoneModeManual'), value: 'manual' }
      ]
    },
    isMediator () {
      return this.$store.state.currentUser && this.$store.state.currentUser.type === 'MEDIATOR'
    },
    subscriptionExpiryLabel () {
      if (this.subscription.expiresAtLabel) return this.subscription.expiresAtLabel
      if (!this.subscription.expiresAt) return ''
      return this.$formatDate(this.subscription.expiresAt)
    }
  },
  async created () {
    await this.initUserData()
    if (this.isMediator) {
      await Promise.all([this.loadRewardBalance(), this.loadSubscription()])
    }
  },
  mounted () {
    sofbox.index()
  },
  methods: {
    togglePasswordVisibility () {
      this.showPassword = !this.showPassword
    },
    validatePassword (password) {
      return validatePasswordStrength(password)
    },
    async initUserData () {
      const response = await this.$store.dispatch('getUserData')
      if (response.success) {
        const user = response.data.userData
        this.user = user
        this.form.name = user.name || ''
        this.form.phone_number = user.phone || ''
        this.form.profile_picture_url = user.photo || ''
        if (user.timezone) {
          applyServerPreferences({
            timezone: user.timezone,
            locale: user.locale
          })
          this.prefs = getUserPreferences()
        }
        if (this.$store.state.currentUser) {
          this.$store.commit('setUser', {
            ...this.$store.state.currentUser,
            name: user.name,
            phone: user.phone,
            photo: user.photo
          })
        }
      }
    },
    async loadRewardBalance () {
      const res = await this.$store.dispatch('getMyRewards', { page: 1 })
      if (res.success && res.data) {
        this.rewardBalance = res.data.balance ?? 0
      }
    },
    goToRewards () {
      this.$router.push({ name: 'app.rewards' })
    },
    formatDate (v) {
      return this.$formatDateTime(v)
    },
    formatDateTime (v) {
      return this.$formatDateTime(v)
    },
    async loadSubscription () {
      this.subscriptionLoading = true
      try {
        const res = await this.$store.dispatch('getMySubscription')
        if (res.success) {
          this.subscription = {
            tier: res.tier || res.data?.tier || 'FREE',
            expiresAt: res.expiresAt || res.data?.expiresAt,
            expiresAtLabel: res.expiresAtLabel || res.data?.expiresAtLabel || null,
            monthlyPriceInr: res.monthlyPriceInr || res.data?.monthlyPriceInr || 1000,
            features: res.features || res.data?.features || []
          }
        }
      } finally {
        this.subscriptionLoading = false
      }
    },
    triggerProfilePictureUpload () {
      this.$refs.profilePictureInput.click()
    },
    onProfilePictureChange (event) {
      const ref = this
      const file = event.target.files[0]
      if (file) {
        this.profilePictureFile = file
        const reader = new FileReader()
        reader.onload = e => {
          if (!allowedTypes.includes(ref.profilePictureFile.type)) {
            ref.showAlert(ref.$t('profileEdit.alertInvalidFileType'), 'danger')
            return
          }
          if (ref.profilePictureFile.size > maxSize) {
            ref.showAlert(ref.$t('profileEdit.alertFileTooLarge'), 'danger')
            return
          }
          this.profilePicturePreview = e.target.result
        }
        reader.readAsDataURL(file)
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
    async onSave () {
      const response = await this.updateUserProfile({
        name: this.form.name,
        phone_number: this.form.phone_number,
        profile_picture: this.profilePicturePreview
      })
      if (response.success) {
        const updated = response.data?.user
        if (updated) {
          this.form.name = updated.name || this.form.name
          this.form.phone_number = updated.phone || this.form.phone_number
          if (updated.photo) {
            this.form.profile_picture_url = updated.photo
            this.profilePicturePreview = null
            this.profilePictureFile = null
          }
          this.user = {
            ...this.user,
            name: updated.name || this.user.name,
            phone: updated.phone || this.user.phone,
            photo: updated.photo || this.user.photo
          }
        }
        this.showAlert(response.message || this.$t('profileEdit.alertProfileUpdated'), 'success')
      }
    },
    async updateUserProfile (payload) {
      return await this.$store.dispatch('updateUserProfile', payload)
    },
    async onSavePreferences () {
      const mode = this.prefs.timezoneMode === 'manual' ? 'manual' : 'auto'
      const timezone = mode === 'manual' ? (this.prefs.timezone || detectDeviceTimezone()) : detectDeviceTimezone()
      this.prefs = setUserPreferences({
        timezoneMode: mode,
        timezone,
        locale: this.prefs.locale,
        notificationEmail: Boolean(this.prefs.notificationEmail)
      })
      this.detectedTimezone = detectDeviceTimezone()
      await this.$store.dispatch('updateUserProfile', {
        timezone: mode === 'manual' ? timezone : null,
        locale: this.prefs.locale || null
      })
      this.showAlert(this.$t('profileEdit.alertPreferencesSaved'), 'success')
    },
    async onDeleteAccount () {
      if (!this.deleteConfirm) return
      if (!window.confirm(this.$t('profileEdit.confirmDeleteAccount'))) return
      const response = await this.$store.dispatch('deleteMyAccount', { confirm: true })
      if (response.success) {
        this.showAlert(response.message || this.$t('profileEdit.alertAccountRemoved'), 'success')
        setTimeout(async () => {
          await this.$store.dispatch('logout')
          this.$router.push({ name: 'auth.sign-in' })
        }, 1500)
      }
    },
    async onSavePassword () {
      if (this.form.currentPassword.trim() === '') return this.showAlert(this.$t('profileEdit.alertEnterCurrentPassword'), 'danger')
      if (this.form.password.trim() === '') return this.showAlert(this.$t('profileEdit.alertEnterPassword'), 'danger')
      if (this.form.confirmPassword.trim() === '') return this.showAlert(this.$t('profileEdit.alertEnterConfirmPassword'), 'danger')
      if (this.form.password !== this.form.confirmPassword) return this.showAlert(this.$t('profileEdit.alertPasswordsMismatch'), 'danger')
      const passwordValidation = this.validatePassword(this.form.password)
      if (passwordValidation.error) return this.showAlert(passwordValidation.message, 'danger')

      const response = await this.updateUserProfile({
        password: this.form.password,
        current_password: this.form.currentPassword
      })
      if (response.success) {
        this.form.currentPassword = ''
        this.form.password = ''
        this.form.confirmPassword = ''
        this.showAlert(response.message || this.$t('profileEdit.alertPasswordUpdated'), 'success')
      }
    }
  }
}
</script>

<style scoped>
.iq-edit-profile {
  display: flex;
  flex-wrap: nowrap;
  width: 100%;
  margin-bottom: 0;
  padding: 0;
  list-style: none;
}
.iq-edit-profile__tab {
  flex: 1 1 0;
  min-width: 0;
  padding: 0;
}
.iq-edit-profile--mediator .iq-edit-profile__tab {
  flex: 1 1 20%;
}
.iq-edit-profile .nav-link {
  border-radius: 0;
  border: none;
  border-left: 1px solid var(--kadr-border-info);
  color: var(--kadr-text-secondary);
  background: var(--kadr-surface-muted);
  text-align: center;
  font-weight: 500;
  font-size: clamp(0.72rem, 1.1vw, 0.95rem);
  padding: 0.85rem 0.35rem;
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.iq-edit-profile__tab:first-child .nav-link {
  border-left: none;
  border-radius: 5px 0 0 5px;
}
.iq-edit-profile__tab:last-child .nav-link {
  border-radius: 0 5px 5px 0;
}
.iq-edit-profile .nav-link.active {
  background: var(--kadr-primary);
  color: var(--kadr-text-on-primary);
}
.profile-section-title {
  font-size: 1.15rem;
  margin-bottom: 1rem;
}
.password-toggle-icon-btn {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  border: none;
  background: transparent;
  padding: 0;
  cursor: pointer;
  font-size: 1.2rem;
  color: inherit;
}
@media (max-width: 575.98px) {
  .iq-edit-profile {
    flex-wrap: wrap;
  }
  .iq-edit-profile__tab {
    flex: 1 1 50%;
  }
  .iq-edit-profile--mediator .iq-edit-profile__tab {
    flex: 1 1 50%;
  }
  .iq-edit-profile .nav-link {
    white-space: normal;
    font-size: 0.8rem;
    padding: 0.65rem 0.25rem;
  }
}
.profile-img-edit {
  position: relative;
  display: inline-block;
}
.profile-pic {
  width: 130px;
  height: 130px;
  object-fit: cover;
  border-radius: 50%;
  border: 2px solid var(--kadr-border);
  display: block;
  cursor: pointer;
}
.p-image {
  position: absolute;
  bottom: 18px;
  right: 18px;
  background: var(--kadr-primary);
  border-radius: 50%;
  padding: 8px;
  box-shadow: var(--kadr-shadow-sm);
  cursor: pointer;
  font-size: 18px;
  border: 1px solid var(--kadr-border-strong);
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}
.p-image i {
  color: var(--kadr-text-on-primary) !important;
  font-size: 20px;
  line-height: 1;
}
.p-image:hover {
  background: var(--kadr-primary-hover);
}
.file-upload {
  display: none;
}
</style>
