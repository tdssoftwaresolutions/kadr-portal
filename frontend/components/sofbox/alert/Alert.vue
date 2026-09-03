<template>
    <div v-if="modelValue" :class="['alert', alertClass, textColor]" role="alert">
      <div class="iq-alert-text">{{ message }}</div>
    </div>
</template>
<script>
export default {
  name: 'Alert',
  props: {
    message: {
      type: String,
      required: true
    },
    type: {
      type: String,
      required: true,
      validator (value) {
        return [
          'primary',
          'secondary',
          'success',
          'danger',
          'warning',
          'info',
          'light',
          'dark',
          'error'
        ].includes(value)
      }
    },
    modelValue: {
      type: Boolean,
      default: false
    },
    timeout: {
      type: Number,
      default: 5000
    }
  },
  computed: {
    alertClass () {
      const type = this.type === 'error' ? 'danger' : this.type
      return `bg-${type}`
    },
    textColor () {
      return this.type === 'light' ? 'text-dark' : 'text-white'
    }
  },
  data () {
    return {
      autoHideTimeout: null
    }
  },
  emits: ['update:modelValue'],
  watch: {
    modelValue (newValue) {
      if (newValue) {
        this.startAutoHide()
      }
    }
  },
  methods: {
    closeAlert () {
      this.$emit('update:modelValue', false)
    },
    startAutoHide () {
      if (this.autoHideTimeout) {
        clearTimeout(this.autoHideTimeout)
      }

      this.autoHideTimeout = setTimeout(() => {
        this.closeAlert()
      }, this.timeout)
    }
  },
  beforeUnmount () {
    if (this.autoHideTimeout) {
      clearTimeout(this.autoHideTimeout)
    }
  }
}
</script>
<style>
.alert {
  position: fixed; /* Fixes the alert box to the screen */
  top: 5rem; /* Aligns it to the top of the viewport */
  left: 50%; /* Positions it horizontally at the center */
  transform: translateX(-50%); /* Adjusts for the width of the alert to truly center it */
  z-index: 9999; /* Ensures the alert is above other content */
  width: auto; /* Optional: Set a width if you need the alert to have a specific width */
  padding: 15px; /* Optional: You can adjust the padding */
}

.iq-alert-text {
  font-size: 16px; /* Optional: Adjust font size */
}
</style>
