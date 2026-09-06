<template>
  <div class="legal-layout">
    <router-view />
  </div>
</template>

<script>
export default {
  name: 'LegalLayout'
}
</script>

<style>
@import url("../assets/css/custom.css");

/* Legal layout fills viewport height and allows scrolling */
.legal-layout {
  min-height: 100vh;
  overflow-y: auto;
  background: var(--kadr-bg-page, #f6f7fb);
}
</style>
