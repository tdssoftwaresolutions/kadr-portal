<template>
  <!-- TOP Nav Bar -->
  <div class="iq-top-navbar">
    <div class="iq-navbar-custom">
      <div class="iq-sidebar-logo">
        <div class="top-logo">
          <a href="/admin">
            <img :src="logo" class="img-fluid" alt="logo">
            <span>RAMC</span>
          </a>
        </div>
      </div>
      <div class="navbar-breadcrumb">
        <h5 class="mb-0">{{ title }}</h5>
        <!--BreadCrumbStyle1 :items="breadCrumb"></BreadCrumbStyle1-->
      </div>
      <nav class="navbar navbar-expand-lg navbar-light p-0">
        <!--<button class="navbar-toggler" type="button" data-toggle="collapse" data-target="#navbarSupportedContent" aria-controls="navbarSupportedContent" aria-expanded="false" aria-label="Toggle navigation">
        </button>-->
        <b-navbar-toggle target="nav-collapse">
          <i class="ri-menu-3-line"></i>
        </b-navbar-toggle>
        <div class="iq-menu-bt align-self-center">
          <div class="wrapper-menu">
            <div class="line-menu half start"></div>
            <div class="line-menu"></div>
            <div class="line-menu half end"></div>
          </div>
        </div>
        <b-collapse id="nav-collapse" is-nav style="display: flex !important;justify-content: flex-end;">
          <slot name="responsiveRight" />
        </b-collapse>
        <slot name="right" />
      </nav>
    </div>
  </div>
  <!-- TOP Nav Bar END -->
</template>
<script>
export default {
  name: 'NavBarStyle1',
  props: {
    homeURL: { type: Object, default: () => ({ name: 'layout.dashboard' }) },
    title: { type: String, default: 'Dashboard' },
    breadCrumb: { type: Array,
      default: () => ([
        {
          text: 'Home',
          href: '/admin'
        },
        {
          text: 'Edit Profile',
          href: '#'
        }
      ])
    },
    logo: { type: String, default: require('../../../assets/logo.jpeg') }
  },
  data () {
    return {
    }
  }
}
</script>
