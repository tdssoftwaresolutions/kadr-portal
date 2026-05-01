<template>
  <div class="iq-sidebar compact-sidebar-shell">
    <div class="compact-sidebar-panel">
      <div class="iq-sidebar-logo compact-sidebar-logo" style="padding:0px">
        <router-link :to="homeURL" aria-label="Go to dashboard">
          <span class="compact-brand-mark">
            <img :src="logo" class="img-fluid" alt="logo">
          </span>
          <span class="compact-brand-text">kADR.live</span>
        </router-link>
      </div>
      <div id="sidebar-scrollbar" class="compact-sidebar-scroll">
        <nav class="iq-sidebar-menu compact-sidebar-menu" :class="horizontal ? 'd-xl-none' : ''">
          <List :items="items" :open="true" :horizontal="horizontal"/>
        </nav>
      </div>
      <div class="compact-sidebar-footer">
        <button
          type="button"
          class="compact-action-button"
          title="Logout"
          aria-label="Logout"
          @click="$emit('logout')"
        >
          <span class="compact-action-icon">
            <i class="ri-logout-box-line"></i>
          </span>
          <span class="compact-action-label">Logout</span>
        </button>
        <button
          type="button"
          class="compact-profile-button"
          :title="profileName || 'Edit profile'"
          aria-label="Edit profile"
          @click="$emit('edit-profile')"
        >
          <span class="compact-profile-avatar">
            <img :src="userProfile" alt="profile">
          </span>
          <span class="compact-action-label">Profile</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import List from '../menus/ListStyle1'
export default {
  name: 'SideBarStyle1',
  props: {
    homeURL: { type: Object, default: () => ({ name: 'layout.dashboard' }) },
    items: { type: Array },
    logo: { type: String, default: require('../../../assets/logo.jpeg') },
    userProfile: { type: String, default: require('../../../assets/images/user/1.jpeg') },
    profileName: { type: String, default: '' },
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

<style>
@media (min-width: 992px) {
  body.compact-sidebar .iq-sidebar.compact-sidebar-shell {
    top: 0;
    left: 0;
    width: 92px;
    height: 100%;
    padding: 0;
    background: linear-gradient(180deg, #ffffff 0%, #f6faff 100%);
    border-right: 1px solid rgba(0, 132, 255, 0.08);
    border-radius: 0;
    box-shadow: 14px 0 28px rgba(45, 69, 95, 0.08);
    overflow: visible;
  }

  body.compact-sidebar .compact-sidebar-panel {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 18px 12px 20px;
    background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
  }

  body.compact-sidebar .iq-sidebar.compact-sidebar-shell #sidebar-scrollbar.compact-sidebar-scroll {
    width: 100%;
    flex: 1 1 auto;
    margin-top: 26px;
    overflow: visible !important;
  }

  body.compact-sidebar .iq-sidebar.compact-sidebar-shell .scroll-content {
    width: 100%;
  }

  body.compact-sidebar .compact-sidebar-logo {
    width: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  body.compact-sidebar .compact-brand {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 60px;
    height: 60px;
    margin: 0 auto;
    padding: 0;
    border-radius: 50%;
    background: linear-gradient(180deg, #fff8ec 0%, #eef6ff 100%);
    box-shadow: 0 10px 24px rgba(0, 132, 255, 0.08), inset 0 0 0 1px rgba(0, 132, 255, 0.08);
  }

  body.compact-sidebar .compact-brand-mark {
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto;
    border-radius: 50%;
    overflow: hidden;
  }

  body.compact-sidebar .compact-brand-mark img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    border-radius: 50%;
  }

  body.compact-sidebar .compact-brand-text {
    display: none;
  }

  body.compact-sidebar .compact-sidebar-menu {
    width: 100%;
  }

  body.compact-sidebar .compact-sidebar-menu .iq-menu {
    display: flex !important;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    width: 100%;
    padding: 0;
  }

  body.compact-sidebar .compact-sidebar-menu .iq-menu-title {
    display: none;
  }

  body.compact-sidebar .compact-sidebar-menu .iq-menu > li {
    width: 64px;
    display: flex;
    justify-content: center;
    align-items: center;
    position: relative;
  }

  body.compact-sidebar .compact-sidebar-menu .iq-menu > li > a.sidebar-link.root-link {
    display: flex;
    align-items: center;
    justify-content: center !important;
    width: 52px;
    min-width: 52px;
    height: 52px;
    margin: 0 auto;
    border-radius: 16px;
    padding: 0 !important;
    color: #65758b;
    background: rgba(255, 255, 255, 0.7);
    overflow: visible;
    line-height: 1;
    box-shadow: inset 0 0 0 1px rgba(0, 132, 255, 0.05);
    transition: all 0.2s ease, transform 0.18s ease, box-shadow 0.18s ease;
    position: relative;
    text-indent: 0;
  }

  body.compact-sidebar .compact-sidebar-menu .iq-menu > li > a.sidebar-link.root-link::before {
    display: none;
  }

  body.compact-sidebar .compact-sidebar-menu .iq-menu > li > a.sidebar-link.root-link:hover,
  body.compact-sidebar .compact-sidebar-menu .iq-menu > li.active > a.sidebar-link.root-link,
  body.compact-sidebar .compact-sidebar-menu .iq-menu > li > a.sidebar-link.root-link.router-link-exact-active {
    color: #0084ff;
    background: linear-gradient(180deg, rgba(214, 235, 255, 0.95) 0%, rgba(198, 228, 255, 0.88) 100%);
    box-shadow: 0 10px 20px rgba(0, 132, 255, 0.12), inset 0 0 0 1px rgba(0, 132, 255, 0.08);
    transform: translateY(-1px) scale(1.02);
  }

  body.compact-sidebar .compact-sidebar-menu .menu-icon-wrap {
    position: absolute;
    inset: 0;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center !important;
    font-size: 1.35rem;
    line-height: 1;
    flex: 0 0 24px;
    margin: auto;
    pointer-events: none;
  }

  body.compact-sidebar .compact-sidebar-menu .menu-icon-wrap i {
    display: flex;
    align-items: center;
    justify-content: center !important;
    width: 24px;
    height: 24px;
    line-height: 1;
    font-size: 20px;
    text-align: center;
  }

  body.compact-sidebar .compact-sidebar-menu .iq-menu > li > a.sidebar-link.root-link .menu-title {
    position: absolute;
    left: calc(100% + 14px);
    top: 50%;
    transform: translateY(-50%) translateX(-8px);
    background: #1f2a37;
    color: #ffffff;
    padding: 9px 12px;
    border-radius: 10px;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.01em;
    white-space: nowrap;
    opacity: 0;
    visibility: hidden;
    pointer-events: none;
    box-shadow: 0 14px 30px rgba(15, 23, 42, 0.2);
    transition: all 0.18s ease;
    z-index: 1002;
  }

  body.compact-sidebar .compact-sidebar-menu .iq-menu > li > a.sidebar-link.root-link .menu-title::before {
    content: '';
    position: absolute;
    top: 50%;
    left: -5px;
    width: 10px;
    height: 10px;
    background: #1f2a37;
    transform: translateY(-50%) rotate(45deg);
    border-radius: 2px;
  }

  body.compact-sidebar .compact-sidebar-menu .iq-menu > li:hover > a.sidebar-link.root-link .menu-title,
  body.compact-sidebar .compact-sidebar-menu .iq-menu > li:focus-within > a.sidebar-link.root-link .menu-title {
    opacity: 1;
    visibility: visible;
    transform: translateY(-50%) translateX(0);
  }

  body.compact-sidebar .compact-sidebar-menu .iq-menu > li > a.sidebar-link.root-link .iq-arrow-right,
  body.compact-sidebar .compact-sidebar-menu .iq-menu > li > a.sidebar-link.root-link small {
    display: none;
  }

  body.compact-sidebar .compact-sidebar-menu .iq-submenu {
    position: absolute;
    left: calc(100% + 18px);
    top: 0;
    min-width: 220px;
    margin: 0;
    padding: 10px;
    border-radius: 18px;
    background: #ffffff;
    box-shadow: 0 20px 45px rgba(15, 23, 42, 0.14);
    opacity: 0;
    visibility: hidden;
    pointer-events: none;
    transform: translateX(-10px);
    transition: all 0.18s ease;
    z-index: 1001;
  }

  body.compact-sidebar .compact-sidebar-menu .iq-menu > li::after {
    content: '';
    position: absolute;
    inset: -6px 0;
    border-radius: 20px;
    background: linear-gradient(180deg, rgba(0, 132, 255, 0.04) 0%, rgba(255, 255, 255, 0) 100%);
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.18s ease;
  }

  body.compact-sidebar .compact-sidebar-menu .iq-menu > li:hover::after,
  body.compact-sidebar .compact-sidebar-menu .iq-menu > li.active::after {
    opacity: 1;
  }

  body.compact-sidebar .compact-sidebar-menu .iq-menu > li:hover > .iq-submenu,
  body.compact-sidebar .compact-sidebar-menu .iq-menu > li:focus-within > .iq-submenu {
    opacity: 1;
    visibility: visible;
    pointer-events: auto;
    transform: translateX(0);
  }

  body.compact-sidebar .compact-sidebar-menu .iq-submenu li {
    width: 100%;
  }

  body.compact-sidebar .compact-sidebar-menu .iq-submenu a.sidebar-link.child-link {
    width: 100%;
    min-height: 44px;
    padding: 10px 12px;
    border-radius: 12px;
    color: #5b6472;
    gap: 12px;
    overflow: hidden;
  }

  body.compact-sidebar .compact-sidebar-menu .iq-submenu a.sidebar-link.child-link:hover,
  body.compact-sidebar .compact-sidebar-menu .iq-submenu li.active > a.sidebar-link.child-link,
  body.compact-sidebar .compact-sidebar-menu .iq-submenu a.sidebar-link.child-link.router-link-exact-active {
    color: #0084ff;
    background: rgba(0, 132, 255, 0.08);
  }

  body.compact-sidebar .compact-sidebar-menu .iq-submenu a.sidebar-link.child-link .menu-title {
    position: static;
    opacity: 1;
    visibility: visible;
    transform: none;
    padding: 0;
    background: transparent;
    box-shadow: none;
    color: inherit;
    font-size: 13px;
    font-weight: 600;
  }

  body.compact-sidebar .compact-sidebar-menu .iq-submenu a.sidebar-link.child-link .menu-title::before {
    display: none;
  }

  body.compact-sidebar .compact-sidebar-menu .iq-submenu .iq-arrow-right {
    margin-left: auto;
  }

  body.compact-sidebar .compact-sidebar-footer {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    padding-top: 18px;
    margin-top: 14px;
    border-top: 1px solid rgba(0, 132, 255, 0.08);
  }

  body.compact-sidebar .compact-action-button,
  body.compact-sidebar .compact-profile-button {
    width: 52px;
    height: 52px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    border: 0;
    border-radius: 16px;
    background: rgba(255, 255, 255, 0.78);
    color: #65758b;
    cursor: pointer;
    box-shadow: inset 0 0 0 1px rgba(0, 132, 255, 0.05);
    transition: all 0.18s ease;
    position: relative;
  }

  body.compact-sidebar .compact-action-button:hover,
  body.compact-sidebar .compact-profile-button:hover {
    transform: translateY(-1px);
    color: #0084ff;
    background: linear-gradient(180deg, rgba(214, 235, 255, 0.95) 0%, rgba(198, 228, 255, 0.88) 100%);
    box-shadow: 0 10px 20px rgba(0, 132, 255, 0.12), inset 0 0 0 1px rgba(0, 132, 255, 0.08);
  }

  body.compact-sidebar .compact-action-icon,
  body.compact-sidebar .compact-profile-avatar {
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  body.compact-sidebar .compact-action-icon i {
    font-size: 20px;
    line-height: 1;
  }

  body.compact-sidebar .compact-profile-avatar {
    width: 34px;
    height: 34px;
    border-radius: 50%;
    overflow: hidden;
  }

  body.compact-sidebar .compact-profile-avatar img {
    width: 34px;
    height: 34px;
    border-radius: 50%;
    object-fit: cover;
    display: block;
  }

  body.compact-sidebar .compact-action-label {
    position: absolute;
    left: calc(100% + 14px);
    top: 50%;
    transform: translateY(-50%) translateX(-8px);
    background: #1f2a37;
    color: #ffffff;
    padding: 9px 12px;
    border-radius: 10px;
    font-size: 12px;
    font-weight: 600;
    white-space: nowrap;
    opacity: 0;
    visibility: hidden;
    pointer-events: none;
    box-shadow: 0 14px 30px rgba(15, 23, 42, 0.2);
    transition: all 0.18s ease;
    z-index: 1002;
  }

  body.compact-sidebar .compact-action-label::before {
    content: '';
    position: absolute;
    top: 50%;
    left: -5px;
    width: 10px;
    height: 10px;
    background: #1f2a37;
    transform: translateY(-50%) rotate(45deg);
    border-radius: 2px;
  }

  body.compact-sidebar .compact-action-button:hover .compact-action-label,
  body.compact-sidebar .compact-profile-button:hover .compact-action-label,
  body.compact-sidebar .compact-action-button:focus .compact-action-label,
  body.compact-sidebar .compact-profile-button:focus .compact-action-label {
    opacity: 1;
    visibility: visible;
    transform: translateY(-50%) translateX(0);
  }
}
</style>
