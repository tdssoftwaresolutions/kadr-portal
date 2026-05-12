<template>
  <div :class="'iq-card ' + className">
    <slot name="cardImage"/>
    <div v-if="hasHeaderTitleSlot || hasHeaderActionSlot" :class="'iq-card-header d-flex justify-content-between '+headerClass">
      <div class="iq-header-title">
        <slot name="headerTitle" />
      </div>
      <div class="iq-card-header-toolbar d-flex align-items-center">
        <slot name="headerAction" />
      </div>
    </div>
    <b-card-body :body-class="'iq-card-body ' + bodyClass" v-if="hasBodySlot">
      <slot name="body"/>
    </b-card-body>
    <slot />
    <div v-if="hasFooterSlot" :class="'card-footer' + footerClass">
      <slot name="footer"/>
    </div>
  </div>
</template>
<script>
export default {
  name: 'iq-card',
  props: {
    className: { type: String, default: '' },
    bodyClass: { type: String, default: '' },
    headerClass: { type: String, default: '' },
    footerClass: { type: String, default: '' }
  },
  mounted () {
  },
  computed: {
    hasHeaderTitleSlot () {
      return !!this.$slots.headerTitle
    },
    hasHeaderActionSlot () {
      return !!this.$slots.headerAction
    },
    hasBodySlot () {
      // Vue 2: v-slot:body populates $scopedSlots.body; $slots.body can be empty on first paint
      // before parent finishes rendering, which left b-card-body permanently hidden.
      return !!(this.$slots.body || (this.$scopedSlots && this.$scopedSlots.body))
    },
    hasFooterSlot () {
      return !!this.$slots.footer
    }
  }
}
</script>
