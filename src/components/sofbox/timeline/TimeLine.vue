<template>
  <ul class="iq-timeline">
    <li v-for="(item,index) in items" :key="index">
      <div class="timeline-dots" :class="'border-' + getDotColor(item, index)"></div>
      <h6 class="float-start mb-1" v-html="item.title"></h6>
      <small class="float-end mt-1" v-html="item.right"></small>
      <div class="d-inline-block w-100">
        <p v-html="item.description"></p>
      </div>
    </li>
  </ul>
</template>

<script>
export default {
  name: 'TimeLine',
  props: {
    items: { type: Array, default: () => [] }
  },
  methods: {
    getDotColor (item, index) {
      if (item.completed) return 'success'

      const nextItem = this.items[index - 1] // Previous item in the array
      if ((nextItem && nextItem.completed) || ((index === 0) && (!item.completed))) return 'primary'

      return 'info'
    }
  }
}
</script>
<style>
  .border-info {
    border-color: #cfcfcf !important;
  }
</style>
