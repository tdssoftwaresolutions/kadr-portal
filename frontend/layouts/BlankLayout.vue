<template>
  <div>
    <Loader />
    <div class="wrapper">
      <router-view/>
    </div>
  </div>
</template>
<script>
import Loader from '../components/sofbox/loader/Loader'
import { sofbox } from '../config/pluginInit'
export default {
  name: 'BlankLayout',
  components: {
    Loader
  },
  mounted () {
    sofbox.mainIndex()
  }
}
</script>
<style>
  @import url("../assets/css/custom.css");
  .modal-backdrop {
    opacity: .5;
  }
</style>
