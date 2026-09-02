<template>
  <div>
    <Loader/>
    <vue-scroll-progress-bar @complete="handleComplete" height="0.2rem" backgroundColor="linear-gradient(to right, var(--kadr-primary), var(--kadr-primary-hover))" style="z-index: 10000" />
    <div class="wrapper">
      <SideBarStyle1
        :items="sidebar"
        :logo="logo"
        :userProfile="userProfile"
        :profileName="user ? user.name : 'Edit Profile'"
        :show-pro-badge="isMediatorPro"
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
      <div class="mobile-nav-brand">
        <span>Kadr.live</span>
        <mediator-pro-badge v-if="isMediatorPro" size="sm" class="ml-2" />
      </div>
      <button v-if="user && mobileNavTree.length" class="mobile-top-nav-toggle" @click="toggleMobileNav" type="button" aria-label="Open navigation">
        <i class="ri-menu-line" style="font-size:18px"></i>
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
          <template v-for="item in mobileNavTree">
            <li
              v-if="!isMobileGroup(item)"
              :key="item.name"
              class="mobile-top-nav-list-item"
            >
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
            <li
              v-else
              :key="`group-${item.name}`"
              class="mobile-top-nav-list-item mobile-top-nav-group"
              :class="{ 'is-expanded': isMobileGroupExpanded(item) }"
            >
              <button
                type="button"
                class="mobile-top-nav-group-toggle"
                :class="{ active: isMobileGroupActive(item) }"
                :aria-expanded="isMobileGroupExpanded(item) ? 'true' : 'false'"
                @click="toggleMobileGroup(item.name)"
              >
                <i v-if="item.is_icon_class" :class="item.icon"></i>
                <span>{{ item.title }}</span>
                <i class="ri-arrow-down-s-line mobile-top-nav-group-chevron"></i>
              </button>
              <ul v-show="isMobileGroupExpanded(item)" class="mobile-top-nav-sublist">
                <li
                  v-for="child in item.children"
                  :key="child.name"
                  class="mobile-top-nav-sublist-item"
                >
                  <router-link
                    :to="child.link"
                    class="mobile-top-nav-link mobile-top-nav-sublink"
                    :class="{ active: isNavItemActive(child) }"
                    @click.native="closeMobileNav"
                  >
                    <i v-if="child.is_icon_class" :class="child.icon"></i>
                    <span>{{ child.title }}</span>
                  </router-link>
                </li>
              </ul>
            </li>
          </template>
          <li key="profile" class="mobile-top-nav-list-item" @click="onClickEditProfile">
            <div class="mobile-top-nav-link">
              <i class="ri-user-line"></i>
              <span>Profile</span>
              <mediator-pro-badge v-if="isMediatorPro" size="sm" class="ml-auto" />
            </div>
          </li>
          <li key="language" class="mobile-top-nav-list-item" @click="toggleLocale">
            <div class="mobile-top-nav-link">
              <i class="ri-translate-2"></i>
              <span>{{ $i18n.locale === 'hi' ? 'English' : 'हिन्दी' }}</span>
            </div>
          </li>
          <li key="logout" class="mobile-top-nav-list-item" @click="onClickSignOut">
            <div class="mobile-top-nav-link">
              <i class="ri-logout-box-line"></i>
              <span>Logout</span>
            </div>
          </li>
        </ul>
      </div>
    </div>
    <KadrSupportFab v-if="user" :user-type="user.type" />

    <FooterStyle1>
      <template v-slot:left>
        <li class="list-inline-item"><a href="#">Privacy Policy</a></li>
        <li class="list-inline-item"><a href="#">Terms of Use</a></li>
      </template>
      <template v-slot:right>
        Copyright {{ currentYear }} <a href="https://kadr.live">KADR.live</a> All Rights Reserved.
      </template>
    </FooterStyle1>
  </div>
</template>
<script>
import Loader from '../components/sofbox/loader/Loader'
import KadrSupportFab from '../components/KadrSupportFab.vue'
import SideBarStyle1 from '../components/sofbox/sidebars/SideBarStyle1'
import MediatorProBadge from '../components/mediator/MediatorProBadge.vue'
import SideBarItemsClient from '../config/navigation/SideBarClient.json'
import SideBarItemsMediator from '../config/navigation/SideBarMediator.json'
import SideBarItemAdmin from '../config/navigation/SideBarAdmin.json'
import profile from '../assets/images/default_avatar.jpeg'
import logo from '../assets/images/logo.png'
import { sofbox } from '../config/pluginInit'
import {
  filterAdminSidebarItems,
  adminCanAccessRoute,
  firstAllowedAdminRouteFromFilteredSidebar
} from '../utils/adminAccess'
import {
  filterMediatorSidebar,
  mediatorCanAccessRoute
} from '../utils/mediatorEntitlements'
import { applyServerPreferences } from '../utils/timezone'

export default {
  name: 'StandardLayout',
  components: {
    Loader,
    KadrSupportFab,
    SideBarStyle1,
    MediatorProBadge
  },
  async created () {
    const { hasStoredSession } = await import('../utils/tokenStorage')
    const sessionOk = await hasStoredSession()
    if (!sessionOk) {
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
  watch: {
    $route (to) {
      if (this.user && this.user.type === 'ADMIN' && !adminCanAccessRoute(this.user, to)) {
        const nextName = firstAllowedAdminRouteFromFilteredSidebar(
          this.user,
          filterAdminSidebarItems(this.sidebar, this.user)
        )
        if (!nextName || nextName === to.name) return
        this.$router.replace({ name: nextName })
      }
      if (this.user && this.user.type === 'MEDIATOR') {
        this.enforceMediatorRouteAccess(to)
      }
      if (this.isMobileNavOpen) {
        this.expandMobileGroupForActiveRoute()
      }
    },
    '$store.state.mediatorFeatures' () {
      if (this.user && this.user.type === 'MEDIATOR') {
        this.applyMediatorSidebar()
      }
    }
  },
  data () {
    return {
      sidebar: SideBarItemsClient,
      userProfile: profile,
      logo,
      user: null,
      isMobileNavOpen: false,
      mobileExpandedGroups: {}
    }
  },
  computed: {
    currentYear () {
      return new Date().getFullYear()
    },
    mobileNavTree () {
      return (this.sidebar || []).filter((item) => !item.is_heading)
    },
    isMediatorPro () {
      return this.user?.type === 'MEDIATOR' && this.$store.getters.isMediatorPro
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
    async isSessionAvailable () {
      const { hasStoredSession } = await import('../utils/tokenStorage')
      return hasStoredSession()
    },
    async validateData (data) {
      const userData = data.userData

      // Unblock router-view immediately; verify + subscription run in parallel after.
      switch (userData.type) {
        case 'MEDIATOR':
          this.applyMediatorSidebar()
          break
        case 'CLIENT':
          this.sidebar = SideBarItemsClient
          break
        case 'ADMIN':
          this.sidebar = filterAdminSidebarItems(SideBarItemAdmin, userData)
          break
      }
      this.user = userData
      this.userProfile = userData.photo || profile

      if (userData.timezone) {
        applyServerPreferences({
          timezone: userData.timezone,
          locale: userData.locale
        })
      }

      const verifyPromise = this.$store.dispatch('verifySignature', {
        signature: data.signature,
        userData,
        silent: true
      })
      const subscriptionPromise = userData.type === 'MEDIATOR'
        ? this.$store.dispatch('loadMediatorSubscription')
        : Promise.resolve({ success: true })

      const [verifyResponse] = await Promise.all([verifyPromise, subscriptionPromise])

      if (!verifyResponse.success) {
        this.user = null
        this.$router.push({ path: '/auth/sign-in' })
        return
      }

      if (userData.type === 'MEDIATOR') {
        this.applyMediatorSidebar()
        this.$nextTick(() => this.enforceMediatorRouteAccess())
      }
      if (userData.type === 'ADMIN') {
        this.$nextTick(() => this.enforceAdminRouteAccess())
      }
    },
    applyMediatorSidebar () {
      this.sidebar = filterMediatorSidebar(
        SideBarItemsMediator,
        this.$store.state.mediatorFeatures
      )
    },
    enforceMediatorRouteAccess (route = this.$route) {
      if (!this.user || this.user.type !== 'MEDIATOR' || !route) return
      if (mediatorCanAccessRoute(this.$store.state.mediatorFeatures, route)) return
      if (route.name === 'dashboard.home') return
      this.$router.replace({ name: 'dashboard.home' })
    },
    enforceAdminRouteAccess () {
      if (!this.user || this.user.type !== 'ADMIN' || !this.$route) return
      if (!adminCanAccessRoute(this.user, this.$route)) {
        const nextName = firstAllowedAdminRouteFromFilteredSidebar(this.user, this.sidebar)
        if (!nextName || nextName === this.$route.name) return
        this.$router.replace({ name: nextName })
      }
    },
    handleComplete () {},
    onClickEditProfile () {
      this.isMobileNavOpen = false
      this.$router.push({ path: '/user/profile-edit' })
    },
    async onClickSignOut () {
      const response = await this.$store.dispatch('logout')
      if (!response.errorCode) {
        this.$store.commit('clearMediatorSubscription')
        this.isMobileNavOpen = false
        this.$router.push({ path: '/auth/sign-in' })
      }
    },
    toggleLocale () {
      if (this.$i18n) {
        this.$i18n.locale = this.$i18n.locale === 'en' ? 'hi' : 'en'
        this.$forceUpdate()
      }
    },
    toggleMobileNav () {
      this.isMobileNavOpen = !this.isMobileNavOpen
      if (this.isMobileNavOpen) {
        this.expandMobileGroupForActiveRoute()
      }
    },
    closeMobileNav () {
      this.isMobileNavOpen = false
    },
    isMobileGroup (item) {
      return !!(item.children && item.children.length && (!item.link || item.is_group))
    },
    isMobileGroupExpanded (item) {
      return !!this.mobileExpandedGroups[item.name]
    },
    toggleMobileGroup (groupName) {
      this.$set(this.mobileExpandedGroups, groupName, !this.mobileExpandedGroups[groupName])
    },
    isMobileGroupActive (item) {
      return sofbox.getActiveLink(item, this.$route.name)
    },
    expandMobileGroupForActiveRoute () {
      const routeName = this.$route && this.$route.name
      if (!routeName) return
      this.mobileNavTree.forEach((item) => {
        if (this.isMobileGroup(item) && sofbox.getActiveLink(item, routeName)) {
          this.$set(this.mobileExpandedGroups, item.name, true)
        }
      })
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
    cursor: pointer;
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

  .mobile-top-nav-group-toggle {
    display: flex;
    align-items: center;
    gap: 1rem;
    width: 100%;
    padding: 1rem 1.5rem;
    border: 0;
    border-left: 4px solid transparent;
    background: transparent;
    color: rgba(255, 255, 255, 0.9);
    font-size: 1rem;
    font-weight: 600;
    text-align: left;
    cursor: pointer;
    transition: background 0.2s ease, color 0.2s ease, border-color 0.2s ease;
  }

  .mobile-top-nav-group-toggle:hover,
  .mobile-top-nav-group-toggle.active {
    background: rgba(255, 255, 255, 0.05);
    color: #ffffff;
    border-color: #3c7dff;
  }

  .mobile-top-nav-group-toggle i:first-child {
    min-width: 1.4rem;
    font-size: 1.1rem;
    color: #8ca2ff;
  }

  .mobile-top-nav-group-toggle span {
    flex: 1;
  }

  .mobile-top-nav-group-chevron {
    font-size: 1.2rem;
    color: #8ca2ff;
    transition: transform 0.2s ease;
  }

  .mobile-top-nav-group.is-expanded .mobile-top-nav-group-chevron {
    transform: rotate(180deg);
  }

  .mobile-top-nav-sublist {
    list-style: none;
    margin: 0;
    padding: 0 0 0.35rem;
    background: rgba(0, 0, 0, 0.18);
  }

  .mobile-top-nav-sublist-item + .mobile-top-nav-sublist-item {
    margin-top: 0;
  }

  .mobile-top-nav-sublink {
    padding-left: 2.75rem !important;
    font-size: 0.95rem;
  }

  .mobile-top-nav-sublink i {
    min-width: 1.2rem;
    font-size: 1rem;
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
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.35rem;
      font-weight: 600;
      color: #333;
      margin-right: auto;
      font-size: 1.3rem;
    }
    .mobile-top-nav-link {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .mobile-top-nav-link .ml-auto {
      margin-left: auto;
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
      position: relative;
      z-index: 1;
    }

    body.compact-sidebar .content-page {
      padding-top: 24px;
      padding-left: 28px;
      padding-right: 24px;
    }
  }
</style>
