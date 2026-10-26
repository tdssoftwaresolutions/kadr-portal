<template>
  <ul :class="`nav nav-${pills ? 'pills' : ''}${tabs ? 'tabs' : ''} ${vertical ? 'flex-column' : ''} ${align ? 'justify-content-'+align : ''}`" :id="id">
    <slot />
  </ul>
</template>
<script>
export default {
  name: 'tab-nav',
  props: {
    id: { type: String, default: 'myTab' },
    pills: { type: Boolean, default: false },
    vertical: { type: Boolean, default: false },
    tabs: { type: Boolean, default: false },
    align: { type: String, default: '' }
  },
  mounted () {
    // Native replacement for the old jQuery/Bootstrap `.tab('show')` plugin:
    // activate the clicked link and the pane its href points at.
    this.$el.addEventListener('click', this.onClick)
  },
  beforeUnmount () {
    this.$el.removeEventListener('click', this.onClick)
  },
  methods: {
    onClick (event) {
      const link = event.target instanceof Element ? event.target.closest('a.nav-link') : null
      if (!link || !this.$el.contains(link)) return
      const selector = link.getAttribute('href')
      if (!selector || !selector.startsWith('#') || selector.length < 2) return
      event.preventDefault()
      const pane = document.getElementById(selector.slice(1))
      this.$el.querySelectorAll('a.nav-link').forEach((a) => {
        a.classList.remove('active', 'show')
        a.setAttribute('aria-selected', 'false')
      })
      link.classList.add('active')
      link.setAttribute('aria-selected', 'true')
      if (pane && pane.parentElement) {
        Array.from(pane.parentElement.children).forEach((el) => el.classList.remove('active', 'show'))
        pane.classList.add('active', 'show')
      }
      this.$emit('change', { target: link, relatedTarget: null })
    }
  }
}
</script>
