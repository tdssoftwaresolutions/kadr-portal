<template>
  <b-container fluid class="mediator-rewards-page">
    <mediator-rewards-panel />
  </b-container>
</template>

<script>
import { sofbox } from '../../config/pluginInit'
import MediatorRewardsPanel from './MediatorRewardsPanel.vue'

export default {
  name: 'MediatorRewardsView',
  components: { MediatorRewardsPanel },
  mounted () {
    sofbox.index()
  }
}
</script>

<style scoped>
.mediator-rewards-page {
  padding-bottom: 2rem;
}
</style>
