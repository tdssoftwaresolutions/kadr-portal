<template>
  <!-- Full-page / overlay loader -->
  <div
    v-if="overlay"
    class="kadr-spinner-overlay"
    :class="{ 'kadr-spinner-overlay--transparent': transparent }"
    role="status"
    aria-live="polite"
  >
    <span class="kadr-spinner" :class="sizeClass">
      <span class="kadr-spinner__ring"></span>
    </span>
    <p v-if="label" class="kadr-spinner-overlay__text">{{ label }}</p>
    <span class="visually-hidden">{{ label || 'Loading' }}</span>
  </div>

  <!-- Inline loader (buttons, rows, panels) -->
  <span
    v-else
    class="kadr-spinner"
    :class="sizeClass"
    role="status"
    aria-live="polite"
  >
    <span class="kadr-spinner__ring"></span>
    <span v-if="label" class="kadr-spinner__label">{{ label }}</span>
    <span v-else class="visually-hidden">Loading</span>
  </span>
</template>

<script>
/**
 * KadrSpinner — the single loading indicator used across the app.
 *
 * Replaces the legacy sofbox 3D cube loader, the Dashboard 3-dot spinner,
 * the sofbox ring spinner, and scattered Bootstrap `.spinner-border` usages.
 *
 * It is a pure-CSS ring that renders in `currentColor`, so it defaults to the
 * brand color (--kadr-primary) and can be recolored by setting `color` on any
 * ancestor (e.g. inside a white button, wrap it and set color to inherit).
 */
export default {
  name: 'KadrSpinner',
  props: {
    /** Size preset: 'xs' | 'sm' | 'md' | 'lg'. */
    size: {
      type: String,
      default: 'md',
      validator: (v) => ['xs', 'sm', 'md', 'lg'].includes(v)
    },
    /** Render as a centered full-page overlay instead of inline. */
    overlay: {
      type: Boolean,
      default: false
    },
    /** For overlays: use a translucent, blurred backdrop instead of solid. */
    transparent: {
      type: Boolean,
      default: false
    },
    /** Optional visible text shown next to / under the ring. */
    label: {
      type: String,
      default: ''
    }
  },
  computed: {
    sizeClass () {
      return `kadr-spinner--${this.size}`
    }
  }
}
</script>
