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
    <div class="mobile-top-nav-shell">
      <div class="mobile-nav-brand">Kadr.live</div>
      <button v-if="user && mobileNavItems.length" class="mobile-top-nav-toggle" @click="toggleMobileNav" type="button" aria-label="Open navigation">
        <i class="las la-bars" style="font-size:18px"></i>
        <span>Menu</span>
      </button>
    </div>
    <div v-if="isMobileNavOpen" class="mobile-top-nav-overlay" @click.self="closeMobileNav">
      <div class="mobile-top-nav-panel">
        <div class="mobile-top-nav-header">
          <span>Navigation</span>
          <button type="button" class="mobile-top-nav-close" @click="closeMobileNav" aria-label="Close navigation">×</button>
        </div>
        <ul class="mobile-top-nav-list">
          <li v-for="item in mobileNavItems" :key="item.name" class="mobile-top-nav-list-item">
            <router-link
              :to="item.link"
              class="mobile-top-nav-link"
              :class="{ active: isNavItemActive(item) }"
              @click.native="closeMobileNav"
            >
              <i v-if="item.is_icon_class" :class="item.icon"></i>
              <span>{{ item.title }}</span>
            </router-link>
          </li>
        </ul>
      </div>
    </div>
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
      user: null,
      isMobileNavOpen: false
    }
  },
  computed: {
    mobileNavItems () {
      return (this.sidebar || [])
        .filter(item => !item.is_heading && item.link)
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
    toggleMobileNav () {
      this.isMobileNavOpen = !this.isMobileNavOpen
    },
    closeMobileNav () {
      this.isMobileNavOpen = false
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
    margin:0rem;
  }

  body.compact-sidebar .wrapper,
  body.compact-sidebar .content-page {
    max-width: 100%;
    overflow-x: clip;
  }

  .mobile-top-nav-shell {
    display: none;
  }

  .mobile-top-nav-toggle {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    z-index: 1050;
    align-items: center;
    gap: 0.5rem;
    padding: 0.85rem 1rem;
    border-radius: 999px;
    border: 1px solid rgba(13, 96, 255, 0.12);
    background: rgba(10, 17, 30, 0.85);
    color: #ffffff;
    font-weight: 700;
    box-shadow: 0 16px 40px rgba(13, 96, 255, 0.12);
    cursor: pointer;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }

  .mobile-top-nav-toggle:hover {
    transform: translateY(-1px);
    box-shadow: 0 18px 44px rgba(13, 96, 255, 0.18);
  }

  .mobile-top-nav-overlay {
    position: fixed;
    inset: 0;
    z-index: 2000;
    background: rgba(10, 17, 30, 0.85);
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding: 2rem 1rem 1rem;
  }

  .mobile-top-nav-panel {
    width: min(100%, 400px);
    max-width: 100%;
    background: #11161f;
    border-radius: 24px;
    box-shadow: 0 24px 60px rgba(0, 0, 0, 0.35);
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, 0.08);
  }

  .mobile-top-nav-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1.25rem 1.5rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    color: #f5f7ff;
    font-size: 0.95rem;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .mobile-top-nav-close {
    border: none;
    background: transparent;
    color: #f5f7ff;
    font-size: 1.8rem;
    line-height: 1;
    cursor: pointer;
  }

  .mobile-top-nav-list {
    list-style: none;
    margin: 0;
    padding: 1.25rem 0 1.5rem;
  }

  .mobile-top-nav-list-item + .mobile-top-nav-list-item {
    margin-top: 0.25rem;
  }

  .mobile-top-nav-link {
    display: flex;
    align-items: center;
    gap: 1rem;
    width: 100%;
    padding: 1rem 1.5rem;
    color: rgba(255, 255, 255, 0.82);
    text-decoration: none;
    font-size: 1rem;
    border-left: 4px solid transparent;
    transition: background 0.2s ease, color 0.2s ease, border-color 0.2s ease;
  }

  .mobile-top-nav-link:hover,
  .mobile-top-nav-link.active {
    background: rgba(255, 255, 255, 0.05);
    color: #ffffff;
    border-color: #3c7dff;
  }

  .mobile-top-nav-link i {
    min-width: 1.4rem;
    font-size: 1.1rem;
    color: #8ca2ff;
  }

  .mobile-top-nav-link span {
    flex: 1;
  }

  @media (max-width: 991px) {

    .mobile-top-nav-shell {
      position: fixed;
      inset: 0 0 auto 0;
      z-index: 1048;
      min-height: 72px;
      padding: 0 1rem;
      display: flex;
      align-items: center;
    }

    .mobile-top-nav-shell::before {
      content: '';
      position: absolute;
      inset: 0;
      background: #f3f7fd;
      z-index: -1;
    }

    .mobile-nav-brand {
      font-weight: 600;
      color: #333;
      margin-right: auto;
      font-size: 1.3rem;
    }

    .mobile-top-nav-toggle {
      display: inline-flex;
    }

    .content-page {
      padding-top: 72px !important;
    }
  }

  @media (min-width: 992px) {
    .mobile-top-nav-toggle {
      display: none;
    }

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
</style>
