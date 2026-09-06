<template>
  <!-- Full-screen boot loader. Keeps the #loading id so the existing
       loaderInit() fade-out in pluginInit.js continues to work. -->
  <div id="loading">
    <div id="loading-center">
      <kadr-spinner overlay size="lg" />
    </div>
  </div>
</template>
<script>
export default {
  name: 'Loader'
}
</script>
