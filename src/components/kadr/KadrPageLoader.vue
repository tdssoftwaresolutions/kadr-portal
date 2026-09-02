<template>
  <b-overlay :show="show" :opacity="0.6" rounded="sm" spinner-variant="primary">
    <slot />
    <template #overlay>
      <div class="kadr-page-loader text-center" role="status" aria-live="polite">
        <b-spinner variant="primary" label="Loading"></b-spinner>
        <p v-if="message" class="mt-2 mb-0 text-muted-kadr">{{ message }}</p>
      </div>
    </template>
  </b-overlay>
</template>

<script>
export default {
  name: 'KadrPageLoader',
  props: {
    show: {
      type: Boolean,
      default: false
    },
    message: {
      type: String,
      default: 'Loading…'
    }
  }
}
</script>

<style scoped>
.kadr-page-loader {
  padding: 1.5rem;
}
</style>
