<template>
  <section class="section-card" :class="sectionClass">
    <div v-if="title || subtitle || $slots.head" class="section-head">
      <slot name="head">
        <h5>
          <i v-if="icon" :class="icon" class="section-icon" aria-hidden="true"></i>
          {{ title }}
        </h5>
        <small v-if="subtitle">{{ subtitle }}</small>
      </slot>
    </div>
    <slot />
  </section>
</template>

<script>
export default {
  name: 'KadrSectionCard',
  props: {
    title: {
      type: String,
      default: ''
    },
    subtitle: {
      type: String,
      default: ''
    },
    icon: {
      type: String,
      default: ''
    },
    sectionClass: {
      type: String,
      default: ''
    }
  }
}
</script>
