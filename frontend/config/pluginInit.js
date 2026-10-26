// Plain DOM helpers left over from the sofbox admin template. These used to
// depend on jQuery (~97 KB in the vendor bundle) for a loader fade, a click
// ripple and a fullscreen toggle; they're small enough to do with native DOM
// APIs, so jQuery is no longer shipped at all. The owl.carousel jQuery plugin
// that used to drive the sign-in page slider is replaced by AuthCarousel.vue.
// smooth-scrollbar is still loaded dynamically, only when its target exists.

// Document-level listeners are delegated, so register them once per page
// load rather than on every layout mount (the jQuery version stacked a new
// handler each time StandardLayout mounted).
let rippleBound = false
let fullscreenBound = false

const LOADER_FADE_MS = 150

export const sofbox = {
  async index () {
    this.loaderInit()
    await this.SmoothScrollbar()
  },
  mainIndex () {
    this.wrapperMenuToggle()
    this.ripple()
    this.fullscreen()
  },
  loaderInit () {
    // Hide the full-screen boot loader as soon as the page has mounted. This
    // used to wait a fixed 1s and then run a 600ms jQuery fade, which held a
    // spinner over every freshly loaded page (and after login) for ~1.6s
    // regardless of how fast the page was actually ready.
    const load = document.getElementById('load')
    if (load) load.style.display = 'none'
    const loading = document.getElementById('loading')
    if (!loading || loading.style.display === 'none') return
    loading.style.transition = `opacity ${LOADER_FADE_MS}ms ease`
    loading.style.opacity = '0'
    setTimeout(() => { loading.style.display = 'none' }, LOADER_FADE_MS)
  },
  ripple () {
    if (rippleBound) return
    rippleBound = true
    document.addEventListener('click', function (e) {
      const target = e.target instanceof Element ? e.target.closest('.iq-waves-effect') : null
      if (!target) return
      // Remove any old one
      document.querySelectorAll('.ripple').forEach((el) => el.remove())

      const rect = target.getBoundingClientRect()
      // Make it round!
      const size = Math.max(rect.width, rect.height)
      // Get the center of the element
      const x = e.clientX - rect.left - size / 2
      const y = e.clientY - rect.top - size / 2

      const ripple = document.createElement('span')
      ripple.className = 'ripple'
      Object.assign(ripple.style, {
        width: size + 'px',
        height: size + 'px',
        top: y + 'px',
        left: x + 'px'
      })
      target.prepend(ripple)
      ripple.classList.add('rippleEffect')
    })
  },

  fullscreen () {
    if (fullscreenBound || !this.checkElement('class', 'iq-full-screen')) return
    fullscreenBound = true
    document.addEventListener('click', function (e) {
      const elem = e.target instanceof Element ? e.target.closest('.iq-full-screen') : null
      if (!elem) return
      const docEl = document.documentElement
      if (!document.fullscreenElement &&
        !document.mozFullScreenElement &&
        !document.webkitFullscreenElement &&
        !document.msFullscreenElement) {
        if (docEl.requestFullscreen) {
          docEl.requestFullscreen()
        } else if (docEl.mozRequestFullScreen) {
          docEl.mozRequestFullScreen()
        } else if (docEl.webkitRequestFullscreen) {
          docEl.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT)
        } else if (docEl.msRequestFullscreen) {
          docEl.msRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT)
        }
      } else {
        if (document.cancelFullScreen) {
          document.cancelFullScreen()
        } else if (document.mozCancelFullScreen) {
          document.mozCancelFullScreen()
        } else if (document.webkitCancelFullScreen) {
          document.webkitCancelFullScreen()
        } else if (document.msExitFullscreen) {
          document.msExitFullscreen()
        }
      }
      elem.querySelectorAll('i').forEach((icon) => {
        icon.classList.toggle('ri-fullscreen-line')
        icon.classList.toggle('ri-fullscreen-exit-line')
      })
    })
  },

  wrapperMenuToggle () {
    const elementExist = this.checkElement('class', 'wrapper-menu')
    if (elementExist) {
      const wrapperMenu = document.querySelectorAll('.wrapper-menu')
      const body = document.querySelector('body')
      for (let i = 0; i < wrapperMenu.length; i++) {
        wrapperMenu[i].addEventListener('click', function () {
          wrapperMenu[i].classList.toggle('open')
          body.classList.toggle('sidebar-main')
        })
      }
    }
  },

  checkElement (type, element) {
    let found = false
    let elements
    switch (type) {
      case 'class':
        elements = document.getElementsByClassName(element)
        if (elements !== undefined && elements !== null && elements.length > 0) {
          found = true
        }
        break

      case 'id':
        elements = document.getElementById(element)

        if (elements !== undefined && elements !== null) {
          found = true
        }
        break
    }
    return found
  },

  async SmoothScrollbar () {
    const elementExistMain = this.checkElement('id', 'sidebar-scrollbar')
    const elementExistRight = this.checkElement('id', 'right-sidebar-scrollbar')
    if (!elementExistMain && !elementExistRight) return

    const { default: Scrollbar } = await import(/* webpackChunkName: "smooth-scrollbar" */ 'smooth-scrollbar')
    if (elementExistMain && !document.body.classList.contains('compact-sidebar')) {
      Scrollbar.init(document.querySelector('#sidebar-scrollbar'))
    }
    if (elementExistRight) {
      Scrollbar.init(document.querySelector('#right-sidebar-scrollbar'))
    }
  },

  getActiveLink (item, activeRoute) {
    if (item.children && item.children.length) {
      return item.children.some((child) => sofbox.getActiveLink(child, activeRoute))
    }
    if (item.link && item.link.name) {
      return item.link.name === activeRoute
    }
    return false
  }
}
