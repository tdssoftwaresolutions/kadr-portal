<template>
  <div class="container-fluid p-0 kadr-animate-in">
    <div class="row g-0">
      <div class="col-12 text-center">
        <div class="iq-error">
          <h1>{{ this.$route.params.code }}</h1>
          <h4 class="mb-0">Oops! This Page is Not Found.</h4>
          <p>{{ ERRORS.NOT_FOUND }}</p>
          <router-link class="btn btn-primary mt-3" to="/"><i class="ri-home-4-line"></i> Back to dashboard</router-link>
          <img :src="require('../../assets/images/error/01.png')" class="img-fluid iq-error-img" alt="error">
        </div>
      </div>
    </div>
  </div>
</template>
<script>
import { sofbox } from '../../config/pluginInit'
import { ERRORS } from '../../constants/messages'

export default {
  name: 'ErrorPage',
  data () {
    return { ERRORS }
  },
  mounted () {
    sofbox.index()
  }
}
</script>
