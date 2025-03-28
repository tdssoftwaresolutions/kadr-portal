/**
 * File customize-preview.js.
 *
 * Instantly live-update customizer settings in the preview for improved user experience.
 */

(function ($) {
  'use strict'
  // Collect information from customize-controls.js about which panels are opening.
  wp.customize.bind('preview-ready', function () {
    // Initially hide the theme option placeholders on load
    $('.panel-placeholder').hide()

    wp.customize.preview.bind('section-highlight', function (data) {
      // Only on the front page.
      if (!$('body').hasClass('sofbox-front-page')) {
        return
      }

      // When the section is expanded, show and scroll to the content placeholders, exposing the edit links.
      if (data.expanded === true) {
        $('body').addClass('highlight-front-sections')
        $('.panel-placeholder').slideDown(200, function () {
          $.scrollTo($('#panel1'), {
            duration: 600,
            offset: { 'top': -70 } // Account for sticky menu.
          })
        })

        // If we've left the panel, hide the placeholders and scroll back to the top.
      } else {
        $('body').removeClass('highlight-front-sections')
        // Don't change scroll when leaving - it's likely to have unintended consequences.
        $('.panel-placeholder').slideUp(200)
      }
    })
  })

  // Site title and description.
  wp.customize('blogname', function (value) {
    value.bind(function (to) {
      $('.site-title a').text(to)
    })
  })
  wp.customize('blogdescription', function (value) {
    value.bind(function (to) {
      $('.site-description').text(to)
    })
  })

  // Header text color.
  wp.customize('header_textcolor', function (value) {
    value.bind(function (to) {
      if (to === 'blank') {
        $('.site-title, .site-description').css({
          clip: 'rect(1px, 1px, 1px, 1px)',
          position: 'absolute'
        })
        // Add class for different logo styles if title and description are hidden.
        $('body').addClass('title-tagline-hidden')
      } else {
        // Check if the text color has been removed and use default colors in theme stylesheet.
        if (!to.length) {
          $('#sofbox-custom-header-styles').remove()
        }
        $('.site-title, .site-description').css({
          clip: 'auto',
          position: 'relative'
        })
        $('.site-branding, .site-branding a, .site-description, .site-description a').css({
          color: to
        })
        // Add class for different logo styles if title and description are visible.
        $('body').removeClass('title-tagline-hidden')
      }
    })
  })

  // Color scheme.
  wp.customize('colorscheme', function (value) {
    value.bind(function (to) {
      // Update color body class.
      $('body')
        .removeClass('colors-light colors-dark colors-custom')
        .addClass('colors-' + to)
    })
  })

  // Custom color hue.
  wp.customize('colorscheme_hue', function (value) {
    value.bind(function (to) {
      // Update custom color CSS.
      let style = $('#custom-theme-colors')
      let hue = style.data('hue')
      let css = style.html()

      // Equivalent to css.replaceAll, with hue followed by comma to prevent values with units from being changed.
      css = css.split(hue + ',').join(to + ',')
      style.html(css).data('hue', to)
    })
  })

  // Page layouts.
  wp.customize('page_layout', function (value) {
    value.bind(function (to) {
      if (to === 'one-column') {
        $('body').addClass('page-one-column').removeClass('page-two-column')
      } else {
        $('body').removeClass('page-one-column').addClass('page-two-column')
      }
    })
  })

  // Whether a header image is available.
  function hasHeaderImage () {
    let image = wp.customize('header_image')()
    return image !== '' && image !== 'remove-header'
  }

  // Whether a header video is available.
  function hasHeaderVideo () {
    let externalVideo = wp.customize('external_header_video')()
    let video = wp.customize('header_video')()

    return externalVideo !== '' || (video !== 0 && video !== '')
  }

  // Toggle a body class if a custom header exists.
  $.each([ 'external_header_video', 'header_image', 'header_video' ], function (index, settingId) {
    wp.customize(settingId, function (setting) {
      setting.bind(function () {
        if (hasHeaderImage()) {
          $(document.body).addClass('has-header-image')
        } else {
          $(document.body).removeClass('has-header-image')
        }

        if (!hasHeaderVideo()) {
          $(document.body).removeClass('has-header-video')
        }
      })
    })
  })
})(jQuery)
