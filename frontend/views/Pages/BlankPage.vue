<template>
  <div></div>
</template>
<script>
import { sofbox } from '../../config/pluginInit'

export default {
  name: 'BlankPage',
  mounted () {
    sofbox.index()
  }
}
</script>
