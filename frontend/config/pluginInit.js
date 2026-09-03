import Scrollbar from 'smooth-scrollbar'

const $ = require('jquery')

if (typeof window !== 'undefined') {
  window.$ = $
  window.jQuery = $
  require('owl.carousel/dist/owl.carousel')
}

export const sofbox = {
  index () {
    this.loaderInit()
    this.owlCarousel()
    this.SmoothScrollbar()
  },
  mainIndex () {
    this.wrapperMenuToggle()
    this.sideBarToggle()
    this.ripple()
    this.fullscreen()
  },
  loaderInit () {
    $('#load').fadeOut()
    $('#loading').delay(1000).fadeOut('slow')
  },
  ripple () {
    $(document).on('click', '.iq-waves-effect', function (e) {
      // Remove any old one
      $('.ripple').remove()
      // Setup
      const posX = $(this).offset().left
      const posY = $(this).offset().top
      let buttonWidth = $(this).width()
      let buttonHeight = $(this).height()

      // Add the element
      $(this).prepend("<span class='ripple'></span>")

      // Make it round!
      if (buttonWidth >= buttonHeight) {
        buttonHeight = buttonWidth
      } else {
        buttonWidth = buttonHeight
      }

      // Get the center of the element
      const x = e.pageX - posX - buttonWidth / 2
      const y = e.pageY - posY - buttonHeight / 2

      // Add the ripples CSS and start the animation
      $('.ripple').css({
        width: buttonWidth,
        height: buttonHeight,
        top: y + 'px',
        left: x + 'px'
      }).addClass('rippleEffect')
    })
  },

  fullscreen () {
    const elementExist = this.checkElement('class', 'iq-full-screen')
    if (elementExist) {
      $(document).on('click', '.iq-full-screen', function () {
        const elem = $(this)
        if (!document.fullscreenElement &&
          !document.mozFullScreenElement &&
          !document.webkitFullscreenElement &&
          !document.msFullscreenElement) {
          if (document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen()
          } else if (document.documentElement.mozRequestFullScreen) {
            document.documentElement.mozRequestFullScreen()
          } else if (document.documentElement.webkitRequestFullscreen) {
            document.documentElement.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT)
          } else if (document.documentElement.msRequestFullscreen) {
            document.documentElement.msRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT)
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
        elem.find('i').toggleClass('ri-fullscreen-line').toggleClass('ri-fullscreen-exit-line')
      })
    }
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

  sideBarToggle () {
    const elementExist = this.checkElement('class', 'iq-sidebar-menu')
    if (elementExist) {
      $(document).on('click', '.iq-sidebar-menu li', function () {

      })
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

  owlCarousel () {
    const elementExist = this.checkElement('class', 'owl-carousel')
    if (elementExist) {
      // eslint-disable-next-line no-undef
      $('.owl-carousel').each(function () {
        // eslint-disable-next-line no-undef
        const $carousel = $(this)
        $carousel.owlCarousel({
          items: $carousel.data('items'),
          loop: $carousel.data('loop'),
          margin: $carousel.data('margin'),
          nav: $carousel.data('nav'),
          dots: $carousel.data('dots'),
          autoplay: $carousel.data('autoplay'),
          autoplayTimeout: $carousel.data('autoplay-timeout'),
          navText: ['<i class="fas fa-angle-left fa-2x"></i>', '<i class="fas fa-angle-right fa-2x"></i>'],
          responsiveClass: true,
          responsive: {
            // breakpoint from 0 up
            0: {
              items: $carousel.data('items-mobile-sm')
            },
            // breakpoint from 480 up
            480: {
              items: $carousel.data('items-mobile')
            },
            // breakpoint from 786 up
            786: {
              items: $carousel.data('items-tab')
            },
            // breakpoint from 1023 up
            1023: {
              items: $carousel.data('items-laptop')
            },
            1199: {
              items: $carousel.data('items')
            }
          }
        })
      })
    }
  },

  SmoothScrollbar () {
    const elementExistMain = this.checkElement('id', 'sidebar-scrollbar')
    if (elementExistMain && !document.body.classList.contains('compact-sidebar')) {
      Scrollbar.init(document.querySelector('#sidebar-scrollbar'))
    }
    const elementExistRight = this.checkElement('id', 'right-sidebar-scrollbar')
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
