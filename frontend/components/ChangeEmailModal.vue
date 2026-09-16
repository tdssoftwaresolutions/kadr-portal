<template>
  <b-modal
    :model-value="visible"
    size="md"
    :title="$t('profileEdit.changeEmailTitle')"
    @update:model-value="(val) => { if (!val) onClose() }"
  >
    <p class="text-muted small mb-3">{{ $t('profileEdit.changeEmailIntro') }}</p>

    <div v-if="stage === 'enterEmail'">
      <kadr-form-field :label="$t('profileEdit.newEmailLabel')" id="changeEmailNew" :error="emailError">
        <template v-slot="{ id }">
          <b-form-input :id="id" v-model="newEmail" type="email" @input="emailError = ''" />
        </template>
      </kadr-form-field>
    </div>

    <div v-else>
      <p class="mb-2">{{ $t('profileEdit.otpSentTo', { email: newEmail }) }}</p>
      <kadr-form-field :label="$t('profileEdit.otpLabel')" id="changeEmailOtp" :error="otpError">
        <template v-slot="{ id }">
          <b-form-input :id="id" v-model="otp" maxlength="6" inputmode="numeric" @input="otpError = ''" />
        </template>
      </kadr-form-field>
      <button type="button" class="btn btn-link p-0 small" :disabled="requesting" @click="requestOtp">
        {{ $t('profileEdit.resendOtp') }}
      </button>
    </div>

    <template #footer>
      <b-button variant="secondary" :disabled="requesting || confirming" @click="onClose">
        {{ $t('common.cancel') }}
      </b-button>
      <b-button v-if="stage === 'enterEmail'" variant="primary" :disabled="requesting" @click="requestOtp">
        {{ $t('profileEdit.sendCode') }}
      </b-button>
      <b-button v-else variant="primary" :disabled="confirming" @click="confirmChange">
        {{ $t('profileEdit.confirmChange') }}
      </b-button>
    </template>
  </b-modal>
</template>

<script>
import KadrFormField from './kadr/KadrFormField.vue'

export default {
  name: 'ChangeEmailModal',
  components: { KadrFormField },
  props: {
    visible: { type: Boolean, default: false }
  },
  data () {
    return {
      stage: 'enterEmail',
      newEmail: '',
      otp: '',
      emailError: '',
      otpError: '',
      requesting: false,
      confirming: false
    }
  },
  watch: {
    visible (val) {
      if (val) {
        this.stage = 'enterEmail'
        this.newEmail = ''
        this.otp = ''
        this.emailError = ''
        this.otpError = ''
      }
    }
  },
  methods: {
    onClose () {
      this.$emit('close')
    },
    async requestOtp () {
      const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
      if (!emailPattern.test(this.newEmail)) {
        this.emailError = this.$t('profileEdit.invalidEmail')
        return
      }
      this.requesting = true
      try {
        const response = await this.$store.dispatch('requestProfileEmailChange', { newEmail: this.newEmail })
        if (response.success) {
          this.stage = 'enterOtp'
          this.otp = ''
        }
      } finally {
        this.requesting = false
      }
    },
    async confirmChange () {
      if (!this.otp.trim()) {
        this.otpError = this.$t('profileEdit.enterOtp')
        return
      }
      this.confirming = true
      try {
        const response = await this.$store.dispatch('confirmProfileEmailChange', { newEmail: this.newEmail, otp: this.otp })
        if (response.success) {
          this.$emit('updated', response.data.email)
          this.onClose()
        }
      } finally {
        this.confirming = false
      }
    }
  }
}
</script>
