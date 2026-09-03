<template>
    <div v-if="isVisible" class="spinner-container">
      <div class="spinner" :style="{ width: size, height: size, borderColor: color }"></div>
    </div>
</template>
<script>
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
      default: '#4b8bff'
    }
  }
}
</script>
<style scoped>
  .spinner-container {
    display: flex;
    justify-content: center;
    align-items: center;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5); /* Optional background overlay */
    z-index: 9999; /* Ensures it appears above other elements */
  }
  .spinner {
    border: 5px solid #f3f3f3;
    border-top: 5px solid transparent;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
</style>
