<template>
  <span class="kadr-pro-badge" :class="`kadr-pro-badge--${size}`" :title="title">
    <i class="ri-vip-crown-fill kadr-pro-badge__icon" aria-hidden="true" />
    <span class="kadr-pro-badge__text">Pro</span>
  </span>
</template>

<script>
export default {
  name: 'MediatorProBadge',
  props: {
    size: {
      type: String,
      default: 'md',
      validator: (v) => ['sm', 'md'].includes(v)
    },
    title: {
      type: String,
      default: 'Kadr Pro member'
    }
  }
}
</script>

<style scoped>
.kadr-pro-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #5c3d00;
  background: linear-gradient(135deg, #ffe9a8 0%, #ffd24d 45%, #f5b800 100%);
  border: 1px solid rgba(180, 120, 0, 0.35);
  box-shadow: 0 2px 8px rgba(245, 184, 0, 0.28);
  border-radius: 999px;
  line-height: 1;
  white-space: nowrap;
}
.kadr-pro-badge--md {
  font-size: 0.68rem;
  padding: 0.28rem 0.55rem 0.28rem 0.45rem;
}
.kadr-pro-badge--sm {
  font-size: 0.58rem;
  padding: 0.18rem 0.42rem 0.18rem 0.32rem;
}
.kadr-pro-badge__icon {
  font-size: 1.05em;
  line-height: 1;
}
.kadr-pro-badge--sm .kadr-pro-badge__icon {
  font-size: 1em;
}
</style>
