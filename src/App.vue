<template>
  <div>
    <Alert :message="alert.message" :type="alert.type" v-model="alert.visible" :timeout="alert.timeout"></Alert>
    <Spinner :isVisible="spinner" />
    <router-view/>
  </div>
</template>
<script>
import './assets/scss/style.scss'
import Alert from './components/sofbox/alert/Alert.vue'
import Spinner from './components/sofbox/spinner/spinner.vue'
import { mapState } from 'vuex'

export default {
  name: 'App',
  components: {
    Alert, Spinner
  },
  computed: {
    ...mapState('alert', ['visible', 'message', 'type', 'timeout']),
    ...mapState('spinner', ['spinner']),
    alert () {
      return {
        timeout: this.timeout,
        visible: this.visible,
        message: this.message,
        type: this.type,
        spinner: this.spinner
      }
    }
  }
}
</script>
<style lang="scss">
</style>
