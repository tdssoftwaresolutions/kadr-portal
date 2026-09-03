<template>
  <b-breadcrumb :items="items" />
</template>
<script>
export default {
  name: 'BreadCrumbStyle1',
  props: {
    items: {
      type: Array
    }
  },
  data () {
    return {
    }
  }
}
</script>
