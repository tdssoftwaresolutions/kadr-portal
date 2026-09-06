<template>
  <kadr-spinner v-if="isVisible" overlay transparent size="lg" />
</template>
<script>
// Programmatic global spinner driven by the Vuex `spinner` state (see App.vue).
// Now delegates to the single canonical KadrSpinner. Props kept for backwards
// compatibility with any callers that still pass size/color, though the
// canonical spinner is brand-colored and token-sized.
export default {
  name: 'Spinner',
  props: {
    isVisible: {
      type: Boolean,
      default: true
    },
    size: {
      type: String,
      default: '50px'
    },
    color: {
      type: String,
      default: ''
    }
  }
}
</script>
