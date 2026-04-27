<template>
  <!--<div class="iq-sidebar">
    <nav class="iq-sidebar-menu">
      <List :items="items" />
    </nav>
  </div>-->
  <!-- Sidebar  -->
  <div class="iq-sidebar">
    <div class="iq-sidebar-logo d-flex justify-content-between">
      <router-link :to="homeURL">
        <img :src="logo" class="img-fluid" alt="logo">
        <span>kADR.live</span>
      </router-link>
      <div class="iq-menu-bt align-self-center">
        <div class="wrapper-menu">
          <div class="line-menu half start"></div>
          <div class="line-menu"></div>
          <div class="line-menu half end"></div>
        </div>
      </div>
    </div>
    <div id="sidebar-scrollbar">
      <nav class="iq-sidebar-menu" :class="horizontal ? 'd-xl-none' : ''">
        <List :items="items" :open="true" :horizontal="horizontal"/>
      </nav>
      <div class="p-3"></div>
    </div>
  </div>
  <!-- TOP Nav Bar -->
</template>

<script>
import List from '../menus/ListStyle1'
export default {
  name: 'SideBarStyle1',
  props: {
    homeURL: { type: Object, default: () => ({ name: 'layout.dashboard' }) },
    items: { type: Array },
    logo: { type: String, default: require('../../../assets/logo.jpeg') },
    horizontal: { type: Boolean }
  },
  components: {
    List
  },
  data () {
    return {
    }
  }
}
</script>
