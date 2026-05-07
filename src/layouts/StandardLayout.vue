<template>
  <div>
    <Loader/>
    <vue-scroll-progress-bar @complete="handleComplete" height="0.2rem" backgroundColor="linear-gradient(to right, #067bfe, #0885ff)" style="z-index: 10000" />
    <div class="wrapper">
      <SideBarStyle1
        :items="sidebar"
        :logo="logo"
        :userProfile="userProfile"
        :profileName="user ? user.name : 'Edit Profile'"
        @edit-profile="onClickEditProfile"
        @logout="onClickSignOut"
      />
      <div id="content-page" class="content-page">
        <transition name="router-anim" v-if="user!= null">
          <router-view :user="user"/>
        </transition>
      </div>
    </div>
    <nav v-if="user && mobileNavItems.length" class="mobile-bottom-nav" aria-label="Mobile navigation">
      <router-link
        v-for="item in mobileNavItems"
        :key="item.name"
        :to="item.link"
        class="mobile-bottom-nav-item"
        :class="{ active: isNavItemActive(item) }"
      >
        <i v-if="item.is_icon_class" :class="item.icon"></i>
        <span style="text-align: center;">{{ item.title }}</span>
      </router-link>
    </nav>
    <FooterStyle1>
      <template v-slot:left>
        <li class="list-inline-item"><a href="#">Privacy Policy</a></li>
        <li class="list-inline-item"><a href="#">Terms of Use</a></li>
      </template>
      <template v-slot:right>
        Copyright 2020 <a href="#">KADR.live</a> All Rights Reserved.
      </template>
    </FooterStyle1>
  </div>
</template>
<script>
import Loader from '../components/sofbox/loader/Loader'
import SideBarStyle1 from '../components/sofbox/sidebars/SideBarStyle1'
import SideBarItems from '../FackApi/json/SideBar'
import SideBarItemsMediator from '../FackApi/json/SideBarMediator'
import SideBarItemAdmin from '../FackApi/json/SideBarAdmin'
import profile from '../assets/images/user/1.jpeg'
import logo from '../assets/images/logo.png'
import { sofbox } from '../config/pluginInit'

export default {
  name: 'StandardLayout',
  components: {
    Loader, SideBarStyle1
  },
  async created () {
    if (!this.isSessionAvailable()) {
      this.$router.push({ path: '/auth/sign-in' })
    } else {
      const response = await this.$store.dispatch('getUserData')
      if (response.success) this.validateData(response.data)
    }
  },
  mounted () {
    sofbox.mainIndex()
    this.applyCompactSidebarState()
  },
  beforeDestroy () {
    this.removeCompactSidebarState()
  },
  data () {
    return {
      sidebar: SideBarItems,
      userProfile: profile,
      logo,
      user: null
    }
  },
  computed: {
    mobileNavItems () {
      return (this.sidebar || [])
        .filter(item => !item.is_heading && item.link)
        .slice(0, 5)
    }
  },
  methods: {
    applyCompactSidebarState () {
      document.body.classList.add('compact-sidebar')
      document.body.classList.remove('sidebar-main')
      const wrapperMenus = document.querySelectorAll('.wrapper-menu')
      wrapperMenus.forEach((menu) => menu.classList.remove('open'))
    },
    removeCompactSidebarState () {
      document.body.classList.remove('compact-sidebar')
    },
    isSessionAvailable () {
      if (this.$cookies.get('accessToken')) {
        return true
      }
      return false
    },
    async validateData (data) {
      const response = await this.$store.dispatch('verifySignature', {
        signature: data.signature,
        userData: data.userData
      })

      if (response.success) {
        switch (data.userData.type) {
          case 'MEDIATOR':
            this.sidebar = SideBarItemsMediator
            break
          case 'CLIENT':
            this.sidebar = SideBarItems
            break
          case 'ADMIN':
            this.sidebar = SideBarItemAdmin
            break
        }
        this.user = data.userData
        this.userProfile = data.userData.photo || profile
      }
    },
    handleComplete () {},
    onClickEditProfile () {
      this.$router.push({ path: '/user/profile-edit' })
    },
    async onClickSignOut () {
      const response = await this.$store.dispatch('logout')
      if (!response.errorCode) {
        this.$cookies.remove('accessToken')
        this.$router.push({ path: '/auth/sign-in' })
      }
    },
    isNavItemActive (item) {
      return this.$route && item.link && this.$route.name === item.link.name
    }
  }
}
</script>
<style>
  @import url("../assets/css/custom.css");

  body.compact-sidebar {
    overflow-x: hidden;
  }

  body.compact-sidebar .wrapper,
  body.compact-sidebar .content-page {
    max-width: 100%;
    overflow-x: clip;
  }

  .mobile-bottom-nav {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 1040;
    display: none;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 0;
    background: #ffffff;
    border-top: 1px solid #e6ebf5;
    box-shadow: 0 -8px 24px rgba(20, 44, 75, 0.1);
    padding-bottom: env(safe-area-inset-bottom);
  }

  .mobile-bottom-nav-item {
    min-height: 62px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    color: #5f6b7a;
    font-size: 11px;
    font-weight: 600;
    text-decoration: none;
  }

  .mobile-bottom-nav-item i {
    font-size: 18px;
    line-height: 1;
  }

  .mobile-bottom-nav-item.active {
    color: #0084ff;
    background: linear-gradient(180deg, rgba(229, 241, 255, 0.8) 0%, rgba(245, 250, 255, 0.8) 100%);
  }

  @media (min-width: 992px) {
    body.compact-sidebar .content-page,
    body.compact-sidebar .iq-footer {
      margin-left: 92px;
      margin-top: 2rem;
    }

    body.compact-sidebar .content-page {
      padding-top: 24px;
      padding-left: 28px;
      padding-right: 24px;
    }
  }

  @media (max-width: 991px) {
    .mobile-bottom-nav {
      display: grid;
    }

    .content-page {
      padding-bottom: calc(78px + env(safe-area-inset-bottom));
    }
  }
</style>
