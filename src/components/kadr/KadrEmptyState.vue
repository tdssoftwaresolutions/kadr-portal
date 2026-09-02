<template>
  <div :class="compact ? 'empty-box' : 'empty-state'">
    <i v-if="icon && !compact" :class="icon" class="empty-state-icon" aria-hidden="true"></i>
    <h5 v-if="title" class="empty-state-title">{{ title }}</h5>
    <p v-if="description" class="empty-state-description">{{ description }}</p>
    <button
      v-if="actionLabel"
      type="button"
      class="btn btn-primary btn-sm"
      @click="$emit('action')"
    >
      {{ actionLabel }}
    </button>
    <slot />
  </div>
</template>

<script>
export default {
  name: 'KadrEmptyState',
  props: {
    icon: {
      type: String,
      default: 'fas fa-inbox'
    },
    title: {
      type: String,
      default: ''
    },
    description: {
      type: String,
      default: ''
    },
    actionLabel: {
      type: String,
      default: ''
    },
    compact: {
      type: Boolean,
      default: false
    }
  }
}
</script>
