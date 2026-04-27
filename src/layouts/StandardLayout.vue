<template>
  <div>
    <Loader/>
    <vue-scroll-progress-bar @complete="handleComplete" height="0.2rem" backgroundColor="linear-gradient(to right, #067bfe, #0885ff)" style="z-index: 10000" />
    <div class="wrapper">
      <!-- Sidebar  -->
      <SideBarStyle1 :items="sidebar" :logo="logo" />
      <!-- TOP Nav Bar -->
      <NavBarStyle1 :title="pageTitle" :logo="logo" >
        <template slot="responsiveRight">
          <ul class="navbar-nav ms-auto navbar-list">
            <li class="nav-item iq-full-screen"><a href="#" class="iq-waves-effect" id="btnFullscreen"><i class="ri-fullscreen-line"></i></a></li>
          </ul>
        </template>
        <template slot="right">
          <ul class="navbar-list">
            <li :class="profileClass">
              <a href="#" @click="onClickProfile" class="search-toggle iq-waves-effect bg-primary text-white active">
                <img :src="userProfile" class="img-fluid rounded" alt="user">
              </a>
              <div class="iq-sub-dropdown iq-user-dropdown" v-if="user!= null">
                <div class="iq-card shadow-none m-0">
                  <div class="iq-card-body p-0 ">
                    <div class="bg-primary p-3">
                      <h5 class="mb-0 text-white line-height">Hello {{ user.name }}</h5>
                    </div>
                     <a v-on:click="onClickEditProfile" class="iq-sub-card iq-bg-primary-hover">
                      <div class="media align-items-center" style="cursor: pointer;">
                          <div class="iq-card-icon iq-bg-success">
                            <i class="ri-profile-line"></i>
                          </div>
                          <div class="media-body ml-3">
                            <h6 class="mb-0 ">Edit Profile</h6>
                            <p class="mb-0 font-size-12">Modify your personal details.</p>
                          </div>
                      </div>
                    </a>
                    <div class="d-inline-block w-100 text-center p-3">
                      <a class="iq-bg-danger iq-sign-btn" v-on:click="onClickSignOut" role="button">Sign out<i class="ri-login-box-line ms-2"></i></a>
                    </div>
                  </div>
                </div>
              </div>
            </li>
          </ul>
        </template>
      </NavBarStyle1>
      <!-- TOP Nav Bar END -->
      <div id="content-page" class="content-page">
        <transition name="router-anim" v-if="user!= null">
          <router-view :user="user"/>
        </transition>
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
import NavBarStyle1 from '../components/sofbox/navbars/NavBarStyle1'
import SideBarItems from '../FackApi/json/SideBar'
import SideBarItemsMediator from '../FackApi/json/SideBarMediator'
import SideBarItemAdmin from '../FackApi/json/SideBarAdmin'
import profile from '../assets/images/user/1.jpeg'
import logo from '../assets/images/logo.png'
import { sofbox } from '../config/pluginInit'

export default {
  name: 'StandardLayout',
  components: {
    Loader, SideBarStyle1, NavBarStyle1
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
  },
  data () {
    return {
      sidebar: SideBarItems,
      userProfile: profile,
      logo,
      user: null,
      profileClass: '',
      pageTitle: ''
    }
  },
  methods: {
    onClickProfile () {
      this.profileClass = this.profileClass === '' ? 'iq-show' : ''
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
      this.onClickProfile()
    },
    async onClickSignOut () {
      const response = await this.$store.dispatch('logout')
      if (!response.errorCode) {
        this.$cookies.remove('accessToken')
        this.$router.push({ path: '/auth/sign-in' })
      }
    }
  }
}
</script>
<style>
  @import url("../assets/css/custom.css");
</style>
