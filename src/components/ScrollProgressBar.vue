<template>
  <div class="scroll-progress-bar" :style="{ width: progress + '%' }" aria-hidden="true" />
</template>

<script>
/**
 * Replaces @guillaumebriday/vue-scroll-progress-bar (Vue 2 only).
 * A thin, fixed-top bar that tracks document scroll progress.
 */
export default {
  name: 'ScrollProgressBar',
  data () {
    return { progress: 0 }
  },
  mounted () {
    window.addEventListener('scroll', this._onScroll, { passive: true })
    this._onScroll()
  },
  beforeUnmount () {
    window.removeEventListener('scroll', this._onScroll)
  },
  methods: {
    _onScroll () {
      const scrollTop = window.scrollY || document.documentElement.scrollTop
      const docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight
      this.progress = docHeight > 0 ? Math.min(100, (scrollTop / docHeight) * 100) : 0
    }
  }
}
</script>

<style scoped>
.scroll-progress-bar {
  position: fixed;
  top: 0;
  left: 0;
  height: 0.2rem;
  background: linear-gradient(to right, var(--kadr-primary, #3c7dff), var(--kadr-primary-hover, #5a93ff));
  z-index: 10000;
  transition: width 0.1s linear;
  pointer-events: none;
}
</style>
