<template>
  <div class="iq-sidebar compact-sidebar-shell">
    <div class="compact-sidebar-panel">
      <div class="iq-sidebar-logo compact-sidebar-logo" style="padding:0px;margin-bottom:1rem;">
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
        <div class="compact-sidebar-footer">
          <button
            type="button"
            class="compact-action-button"
            title="Logout"
            data-flyout-label="Logout"
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
            :data-flyout-label="profileName || 'Edit profile'"
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
  </div>
</template>

<script>
import List from '../menus/ListStyle1'

const COMPACT_FLYOUT_GAP = 14
const COMPACT_SUBMENU_GAP = 2
const COMPACT_SUBMENU_HIDE_DELAY = 150

export default {
  name: 'SideBarStyle1',
  props: {
    homeURL: { type: Object, default: () => ({ name: 'layout.dashboard' }) },
    items: { type: Array },
    logo: { type: String, default: require('../../../assets/logo.jpeg') },
    userProfile: { type: String, default: require('../../../assets/images/default_avatar.jpeg') },
    profileName: { type: String, default: '' },
    horizontal: { type: Boolean }
  },
  components: {
    List
  },
  data () {
    return {
      flyoutEl: null,
      flyoutBound: false,
      flyoutActiveSubmenu: null,
      submenuHideTimer: null
    }
  },
  mounted () {
    this._onFlyoutResize = () => this.hideFlyoutTip()
    window.addEventListener('resize', this._onFlyoutResize, { passive: true })
    this.$nextTick(() => {
      this.bindCompactFlyoutTips()
      // Parent StandardLayout adds body.compact-sidebar after child mount.
      setTimeout(() => this.bindCompactFlyoutTips(), 0)
    })
  },
  beforeDestroy () {
    window.removeEventListener('resize', this._onFlyoutResize)
    this.clearSubmenuHideTimer()
    this.unbindCompactFlyoutTips()
    this.hideFlyoutTip()
    this.hideSubmenuFlyout()
    this.removeFlyoutElement()
  },
  methods: {
    isCompactFlyoutEnabled () {
      return typeof window !== 'undefined' &&
        window.matchMedia('(min-width: 992px)').matches &&
        this.$el &&
        this.$el.classList.contains('compact-sidebar-shell')
    },
    flyoutTriggerSelector () {
      return 'a.sidebar-link.root-link, .compact-action-button, .compact-profile-button'
    },
    getFlyoutScrollEl () {
      return this.$el && this.$el.querySelector('#sidebar-scrollbar')
    },
    findFlyoutTrigger (target) {
      if (!target || !target.closest) return null
      const scrollEl = this.getFlyoutScrollEl()
      if (!scrollEl) return null
      const trigger = target.closest(this.flyoutTriggerSelector())
      return trigger && scrollEl.contains(trigger) ? trigger : null
    },
    findGroupMenuItem (target) {
      if (!target || !target.closest) return null
      const scrollEl = this.getFlyoutScrollEl()
      if (!scrollEl) return null
      const li = target.closest('li.is-group-item')
      if (!li || !scrollEl.contains(li)) return null
      const submenu = li.querySelector(':scope > .iq-submenu')
      return submenu ? li : null
    },
    flyoutTextForTrigger (trigger) {
      const labelEl = trigger.querySelector('.menu-title, .compact-action-label')
      const labelText = labelEl && labelEl.textContent ? labelEl.textContent.trim() : ''
      return (
        trigger.getAttribute('data-flyout-label') ||
        labelText ||
        trigger.getAttribute('title') ||
        trigger.getAttribute('aria-label') ||
        ''
      ).trim()
    },
    bindCompactFlyoutTips () {
      if (!this.isCompactFlyoutEnabled()) {
        this.unbindCompactFlyoutTips()
        return
      }

      if (this.flyoutBound) return

      const scrollEl = this.$el.querySelector('#sidebar-scrollbar')
      if (!scrollEl) return

      this._flyoutActiveTrigger = null
      this._flyoutActiveGroup = null

      this._onFlyoutMouseOver = (event) => {
        const groupLi = this.findGroupMenuItem(event.target)
        if (groupLi) {
          this.clearSubmenuHideTimer()
          if (groupLi !== this._flyoutActiveGroup) {
            this.hideFlyoutTip()
            this._flyoutActiveTrigger = null
            this._flyoutActiveGroup = groupLi
            this.showSubmenuFlyout(groupLi)
          }
          return
        }

        const trigger = this.findFlyoutTrigger(event.target)
        if (!trigger || trigger === this._flyoutActiveTrigger) return
        const text = this.flyoutTextForTrigger(trigger)
        if (!text) return
        this.hideSubmenuFlyout()
        this._flyoutActiveGroup = null
        this._flyoutActiveTrigger = trigger
        this.showFlyoutTip(trigger, text)
      }

      this._onSubmenuMouseEnter = () => {
        this.clearSubmenuHideTimer()
      }

      this._onSubmenuMouseLeave = (event) => {
        const related = event.relatedTarget
        if (this._flyoutActiveGroup && related && this._flyoutActiveGroup.contains(related)) return
        if (this.flyoutActiveSubmenu && related && this.flyoutActiveSubmenu.contains(related)) return
        this.scheduleHideSubmenuFlyout()
      }

      this._onFlyoutMouseOut = (event) => {
        const groupLi = this.findGroupMenuItem(event.target)
        if (groupLi && groupLi === this._flyoutActiveGroup) {
          const related = event.relatedTarget
          if (related && groupLi.contains(related)) return
          if (this.flyoutActiveSubmenu && related && this.flyoutActiveSubmenu.contains(related)) return
          this.scheduleHideSubmenuFlyout()
          return
        }

        const trigger = this.findFlyoutTrigger(event.target)
        if (!trigger || trigger !== this._flyoutActiveTrigger) return
        const related = event.relatedTarget
        if (related && trigger.contains(related)) return
        this._flyoutActiveTrigger = null
        this.hideFlyoutTip()
      }

      this._onFlyoutFocusIn = (event) => {
        const groupLi = this.findGroupMenuItem(event.target)
        if (groupLi) {
          this.hideFlyoutTip()
          this._flyoutActiveGroup = groupLi
          this.showSubmenuFlyout(groupLi)
          return
        }

        const trigger = this.findFlyoutTrigger(event.target)
        if (!trigger) return
        const text = this.flyoutTextForTrigger(trigger)
        if (!text) return
        this.hideSubmenuFlyout()
        this._flyoutActiveGroup = null
        this._flyoutActiveTrigger = trigger
        this.showFlyoutTip(trigger, text)
      }

      this._onFlyoutFocusOut = (event) => {
        const groupLi = this.findGroupMenuItem(event.target)
        if (groupLi && groupLi === this._flyoutActiveGroup) {
          const related = event.relatedTarget
          if (related && groupLi.contains(related)) return
          if (this.flyoutActiveSubmenu && related && this.flyoutActiveSubmenu.contains(related)) return
          this.scheduleHideSubmenuFlyout()
          return
        }

        const trigger = this.findFlyoutTrigger(event.target)
        if (!trigger || trigger !== this._flyoutActiveTrigger) return
        const related = event.relatedTarget
        if (related && trigger.contains(related)) return
        this._flyoutActiveTrigger = null
        this.hideFlyoutTip()
      }

      this._onFlyoutScroll = () => {
        this._flyoutActiveTrigger = null
        this._flyoutActiveGroup = null
        this.hideFlyoutTip()
        this.hideSubmenuFlyout()
      }

      scrollEl.addEventListener('mouseover', this._onFlyoutMouseOver)
      scrollEl.addEventListener('mouseout', this._onFlyoutMouseOut)
      scrollEl.addEventListener('focusin', this._onFlyoutFocusIn)
      scrollEl.addEventListener('focusout', this._onFlyoutFocusOut)
      scrollEl.addEventListener('scroll', this._onFlyoutScroll, { passive: true })

      this._flyoutScrollEl = scrollEl
      this.flyoutBound = true
    },
    unbindCompactFlyoutTips () {
      if (this._flyoutScrollEl) {
        this._flyoutScrollEl.removeEventListener('mouseover', this._onFlyoutMouseOver)
        this._flyoutScrollEl.removeEventListener('mouseout', this._onFlyoutMouseOut)
        this._flyoutScrollEl.removeEventListener('focusin', this._onFlyoutFocusIn)
        this._flyoutScrollEl.removeEventListener('focusout', this._onFlyoutFocusOut)
        this._flyoutScrollEl.removeEventListener('scroll', this._onFlyoutScroll)
      }
      if (this.flyoutActiveSubmenu) {
        this.flyoutActiveSubmenu.removeEventListener('mouseenter', this._onSubmenuMouseEnter)
        this.flyoutActiveSubmenu.removeEventListener('mouseleave', this._onSubmenuMouseLeave)
      }
      this._flyoutScrollEl = null
      this.flyoutBound = false
      this._flyoutActiveTrigger = null
      this._flyoutActiveGroup = null
      this.clearSubmenuHideTimer()
      this.hideFlyoutTip()
      this.hideSubmenuFlyout()
    },
    clearSubmenuHideTimer () {
      if (this.submenuHideTimer) {
        clearTimeout(this.submenuHideTimer)
        this.submenuHideTimer = null
      }
    },
    scheduleHideSubmenuFlyout () {
      this.clearSubmenuHideTimer()
      this.submenuHideTimer = setTimeout(() => {
        this._flyoutActiveGroup = null
        this.hideSubmenuFlyout()
      }, COMPACT_SUBMENU_HIDE_DELAY)
    },
    ensureFlyoutElement () {
      if (this.flyoutEl) return this.flyoutEl
      const el = document.createElement('div')
      el.className = 'compact-sidebar-flyout'
      el.setAttribute('aria-hidden', 'true')
      document.body.appendChild(el)
      this.flyoutEl = el
      return el
    },
    removeFlyoutElement () {
      if (this.flyoutEl && this.flyoutEl.parentNode) {
        this.flyoutEl.parentNode.removeChild(this.flyoutEl)
      }
      this.flyoutEl = null
    },
    showFlyoutTip (trigger, text) {
      if (!this.isCompactFlyoutEnabled()) return
      const rect = trigger.getBoundingClientRect()
      const el = this.ensureFlyoutElement()
      el.textContent = text
      el.style.top = `${rect.top + rect.height / 2}px`
      el.style.left = `${rect.right + COMPACT_FLYOUT_GAP}px`
      el.style.display = 'block'
      el.style.visibility = 'visible'
      el.style.opacity = '1'
    },
    hideFlyoutTip () {
      if (this.flyoutEl) {
        this.flyoutEl.style.display = 'none'
        this.flyoutEl.textContent = ''
      }
    },
    showSubmenuFlyout (groupLi) {
      if (!this.isCompactFlyoutEnabled()) return
      const submenu = groupLi.querySelector(':scope > .iq-submenu')
      if (!submenu) return

      this.clearSubmenuHideTimer()

      if (this.flyoutActiveSubmenu && this.flyoutActiveSubmenu !== submenu) {
        this.flyoutActiveSubmenu.removeEventListener('mouseenter', this._onSubmenuMouseEnter)
        this.flyoutActiveSubmenu.removeEventListener('mouseleave', this._onSubmenuMouseLeave)
        this.hideSubmenuFlyout()
      }

      const trigger = groupLi.querySelector('.menu-group-trigger') || groupLi
      const rect = trigger.getBoundingClientRect()
      this.flyoutActiveSubmenu = submenu
      submenu.classList.add('iq-submenu--flyout')
      submenu.style.position = 'fixed'
      submenu.style.left = `${rect.right + COMPACT_SUBMENU_GAP}px`
      submenu.style.top = `${rect.top}px`
      submenu.style.zIndex = '12001'
      submenu.style.opacity = '1'
      submenu.style.visibility = 'visible'
      submenu.style.pointerEvents = 'auto'
      submenu.style.transform = 'translateX(0)'

      submenu.removeEventListener('mouseenter', this._onSubmenuMouseEnter)
      submenu.removeEventListener('mouseleave', this._onSubmenuMouseLeave)
      submenu.addEventListener('mouseenter', this._onSubmenuMouseEnter)
      submenu.addEventListener('mouseleave', this._onSubmenuMouseLeave)
    },
    hideSubmenuFlyout () {
      const submenu = this.flyoutActiveSubmenu
      if (!submenu) return
      submenu.removeEventListener('mouseenter', this._onSubmenuMouseEnter)
      submenu.removeEventListener('mouseleave', this._onSubmenuMouseLeave)
      submenu.classList.remove('iq-submenu--flyout')
      submenu.style.position = ''
      submenu.style.left = ''
      submenu.style.top = ''
      submenu.style.zIndex = ''
      submenu.style.opacity = ''
      submenu.style.visibility = ''
      submenu.style.pointerEvents = ''
      submenu.style.transform = ''
      this.flyoutActiveSubmenu = null
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
    height: 100vh;
    max-height: 100vh;
    padding: 0;
    background: linear-gradient(180deg, #ffffff 0%, #f6faff 100%);
    border-right: 1px solid rgba(0, 132, 255, 0.08);
    border-radius: 0;
    box-shadow: 14px 0 28px rgba(45, 69, 95, 0.08);
    overflow: visible;
    z-index: 1100;
  }

  body.compact-sidebar .compact-sidebar-panel {
    width: 100%;
    height: 100%;
    max-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 14px 8px 16px;
    box-sizing: border-box;
    background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
    overflow: visible;
  }

  body.compact-sidebar .compact-sidebar-logo {
    width: 100%;
    flex-shrink: 0;
    display: flex;
    justify-content: center;
    align-items: center;
    padding-bottom: 10px;
  }

  body.compact-sidebar .iq-sidebar.compact-sidebar-shell #sidebar-scrollbar.compact-sidebar-scroll {
    width: 100%;
    flex: 1 1 auto;
    min-height: 0;
    margin-top: 0;
    overflow-x: hidden !important;
    overflow-y: auto !important;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: thin;
    scrollbar-color: rgba(0, 132, 255, 0.35) transparent;
  }

  body.compact-sidebar .iq-sidebar.compact-sidebar-shell #sidebar-scrollbar.compact-sidebar-scroll::-webkit-scrollbar {
    width: 4px;
  }

  body.compact-sidebar .iq-sidebar.compact-sidebar-shell #sidebar-scrollbar.compact-sidebar-scroll::-webkit-scrollbar-thumb {
    background: rgba(0, 132, 255, 0.35);
    border-radius: 4px;
  }

  body.compact-sidebar .iq-sidebar.compact-sidebar-shell #sidebar-scrollbar.compact-sidebar-scroll .scroll-content,
  body.compact-sidebar .iq-sidebar.compact-sidebar-shell #sidebar-scrollbar.compact-sidebar-scroll .scrollbar-track,
  body.compact-sidebar .iq-sidebar.compact-sidebar-shell #sidebar-scrollbar.compact-sidebar-scroll .scrollbar-track-x {
    overflow-x: hidden !important;
    max-width: 100% !important;
  }

  body.compact-sidebar .iq-sidebar.compact-sidebar-shell #sidebar-scrollbar.compact-sidebar-scroll .scrollbar-track-x {
    display: none !important;
    height: 0 !important;
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
    max-width: 100%;
    overflow: visible;
  }

  body.compact-sidebar .compact-sidebar-menu .iq-menu {
    display: flex !important;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    width: 100%;
    max-width: 76px;
    margin: 0 auto;
    padding: 4px 0 8px;
    overflow: visible;
  }

  body.compact-sidebar .compact-sidebar-menu .iq-menu-title {
    display: none;
  }

  body.compact-sidebar .compact-sidebar-menu .iq-menu > li {
    width: 64px;
    max-width: 64px;
    display: flex;
    justify-content: center;
    align-items: center;
    position: relative;
    overflow: visible;
  }

  body.compact-sidebar .compact-sidebar-menu .iq-menu > li > a.sidebar-link.root-link,
  body.compact-sidebar .compact-sidebar-menu .iq-menu > li > button.menu-group-trigger.sidebar-link.root-link {
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

  body.compact-sidebar .compact-sidebar-menu .iq-menu > li > a.sidebar-link.root-link::before,
  body.compact-sidebar .compact-sidebar-menu .iq-menu > li > button.menu-group-trigger.sidebar-link.root-link::before {
    display: none;
  }

  body.compact-sidebar .compact-sidebar-menu .iq-menu > li > button.menu-group-trigger.sidebar-link.root-link {
    border: 0;
    cursor: pointer;
    font: inherit;
  }

  body.compact-sidebar .compact-sidebar-menu .iq-menu > li > a.sidebar-link.root-link:hover,
  body.compact-sidebar .compact-sidebar-menu .iq-menu > li > button.menu-group-trigger.sidebar-link.root-link:hover,
  body.compact-sidebar .compact-sidebar-menu .iq-menu > li.active > a.sidebar-link.root-link,
  body.compact-sidebar .compact-sidebar-menu .iq-menu > li.active > button.menu-group-trigger.sidebar-link.root-link,
  body.compact-sidebar .compact-sidebar-menu .iq-menu > li > a.sidebar-link.root-link.router-link-exact-active {
    color: #0084ff;
    background: linear-gradient(180deg, rgba(214, 235, 255, 0.95) 0%, rgba(198, 228, 255, 0.88) 100%);
    box-shadow: 0 10px 20px rgba(0, 132, 255, 0.12), inset 0 0 0 1px rgba(0, 132, 255, 0.08);
    transform: translateY(-1px) scale(1.02);
  }

  body.compact-sidebar .compact-sidebar-menu .iq-menu > li > a.sidebar-link.root-link .menu-icon-wrap,
  body.compact-sidebar .compact-sidebar-menu .iq-menu > li > button.menu-group-trigger.sidebar-link.root-link .menu-icon-wrap {
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

  body.compact-sidebar .compact-sidebar-menu .iq-menu > li > a.sidebar-link.root-link .menu-icon-wrap i,
  body.compact-sidebar .compact-sidebar-menu .iq-menu > li > button.menu-group-trigger.sidebar-link.root-link .menu-icon-wrap i {
    display: flex;
    align-items: center;
    justify-content: center !important;
    width: 24px;
    height: 24px;
    line-height: 1;
    font-size: 20px;
    text-align: center;
  }

  body.compact-sidebar .compact-sidebar-menu .iq-menu > li > a.sidebar-link.root-link .menu-title,
  body.compact-sidebar .compact-sidebar-menu .iq-menu > li > button.menu-group-trigger.sidebar-link.root-link .menu-title {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
    opacity: 0;
    pointer-events: none;
  }

  body.compact-sidebar .compact-sidebar-menu .iq-menu > li > a.sidebar-link.root-link .menu-title::before,
  body.compact-sidebar .compact-sidebar-menu .iq-menu > li > button.menu-group-trigger.sidebar-link.root-link .menu-title::before {
    display: none;
  }

  body.compact-sidebar .compact-sidebar-menu .iq-menu > li > a.sidebar-link.root-link .iq-arrow-right,
  body.compact-sidebar .compact-sidebar-menu .iq-menu > li > button.menu-group-trigger.sidebar-link.root-link .iq-arrow-right,
  body.compact-sidebar .compact-sidebar-menu .iq-menu > li > a.sidebar-link.root-link small,
  body.compact-sidebar .compact-sidebar-menu .iq-menu > li > button.menu-group-trigger.sidebar-link.root-link small {
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
    z-index: 1104;
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

  body.compact-sidebar .compact-sidebar-menu .iq-menu > li:hover > .iq-submenu:not(.iq-submenu--flyout),
  body.compact-sidebar .compact-sidebar-menu .iq-menu > li:focus-within > .iq-submenu:not(.iq-submenu--flyout) {
    opacity: 1;
    visibility: visible;
    pointer-events: auto;
    transform: translateX(0);
  }

  body.compact-sidebar .compact-sidebar-menu .iq-submenu.iq-submenu--flyout {
    list-style: none;
    display: block !important;
    max-height: calc(100vh - 32px);
    overflow-y: auto;
    margin-left: 0;
    padding-left: 16px;
    background-clip: padding-box;
  }

  body.compact-sidebar .compact-sidebar-menu .iq-submenu.iq-submenu--flyout::before {
    content: '';
    position: absolute;
    top: 0;
    right: 100%;
    width: 36px;
    height: 100%;
    background: transparent;
    pointer-events: auto;
  }

  body.compact-sidebar .compact-sidebar-menu .iq-submenu li {
    width: 100%;
  }

  body.compact-sidebar .compact-sidebar-menu .iq-submenu a.sidebar-link.child-link {
    position: relative;
    display: flex;
    align-items: center;
    width: 100%;
    min-height: 44px;
    padding: 10px 12px 10px 12px;
    border-radius: 12px;
    color: #5b6472;
    gap: 12px;
    overflow: visible;
    text-indent: 0;
    white-space: nowrap;
  }

  body.compact-sidebar .compact-sidebar-menu .iq-submenu a.sidebar-link.child-link .menu-icon-wrap {
    position: static;
    inset: auto;
    width: 22px;
    min-width: 22px;
    height: 22px;
    margin: 0;
    flex: 0 0 22px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
  }

  body.compact-sidebar .compact-sidebar-menu .iq-submenu a.sidebar-link.child-link .menu-icon-wrap i {
    width: 18px;
    height: 18px;
    font-size: 18px;
    line-height: 1;
  }

  body.compact-sidebar .compact-sidebar-menu .iq-submenu a.sidebar-link.child-link:hover,
  body.compact-sidebar .compact-sidebar-menu .iq-submenu li.active > a.sidebar-link.child-link,
  body.compact-sidebar .compact-sidebar-menu .iq-submenu a.sidebar-link.child-link.router-link-exact-active {
    color: #0084ff;
    background: rgba(0, 132, 255, 0.08);
  }

  body.compact-sidebar .compact-sidebar-menu .iq-submenu a.sidebar-link.child-link .menu-title {
    position: static;
    flex: 1 1 auto;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    opacity: 1;
    visibility: visible;
    transform: none;
    padding: 0;
    margin: 0;
    width: auto;
    height: auto;
    clip: auto;
    background: transparent;
    box-shadow: none;
    color: inherit;
    font-size: 13px;
    font-weight: 600;
    pointer-events: none;
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
    gap: 10px;
    margin-top: 16px;
    padding: 16px 0 8px;
    border-top: 1px solid rgba(0, 132, 255, 0.08);
    overflow: visible;
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
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
    opacity: 0;
    pointer-events: none;
  }

  body.compact-sidebar .compact-action-label::before {
    display: none;
  }
}

.compact-sidebar-flyout {
  display: none;
  position: fixed;
  z-index: 12000;
  margin: 0;
  transform: translateY(-50%);
  background: #1f2a37;
  color: #ffffff;
  padding: 9px 12px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.01em;
  white-space: nowrap;
  pointer-events: none;
  box-shadow: 0 14px 30px rgba(15, 23, 42, 0.2);
}

.compact-sidebar-flyout::before {
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
</style>
