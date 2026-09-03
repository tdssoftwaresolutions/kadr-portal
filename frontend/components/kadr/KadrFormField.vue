<template>
  <div class="kadr-form-field" :class="{ 'is-invalid': !!error }">
    <label v-if="label" :for="inputId">{{ label }}</label>
    <slot :id="inputId" :invalid="!!error" />
    <span v-if="error" class="kadr-form-field__error" role="alert">{{ error }}</span>
    <small v-else-if="hint" class="text-muted-kadr">{{ hint }}</small>
  </div>
</template>

<script>
let fieldIdCounter = 0

export default {
  name: 'KadrFormField',
  props: {
    label: {
      type: String,
      default: ''
    },
    error: {
      type: String,
      default: ''
    },
    hint: {
      type: String,
      default: ''
    },
    id: {
      type: String,
      default: ''
    }
  },
  data () {
    return {
      generatedId: `kadr-field-${++fieldIdCounter}`
    }
  },
  computed: {
    inputId () {
      return this.id || this.generatedId
    }
  }
}
</script>
