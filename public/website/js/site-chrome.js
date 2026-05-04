/**
 * Central header/footer for KADR public static pages.
 * Each page: <div id="kadr-site-header" data-kadr-active="blog" data-kadr-minimal></div>
 * Optional: <div id="kadr-site-footer"></div>
 */
(function () {
  let LINKS = [
    { key: 'home', href: '/', en: 'Home', hi: 'Home' },
    { key: 'how', href: 'how_it_works', en: 'How It Works', hi: 'Kaise Kaam Karta Hai' },
    { key: 'cases', href: 'case_studies', en: 'Case Studies', hi: 'Case Studies' },
    { key: 'pricing', href: 'pricings', en: 'Pricing', hi: 'Pricing' },
    { key: 'org', href: '/#kadr-organisations', en: 'For Organisations', hi: 'Organisations' },
    { key: 'blog', href: 'resources', en: 'Blog', hi: 'Blog' },
    { key: 'reels', href: 'video-reels', en: 'Video Reels', hi: 'Video Reels' },
    { key: 'faq', href: 'faq', en: 'FAQ', hi: 'FAQ' },
    { key: 'contact', href: 'contact', en: 'Contact', hi: 'Contact' }
  ]

  function navigateTo (page) {
    window.location.href = page
  }

  function goToLogin () {
    let adminUrl = localStorage.getItem('adminUrl') || '/admin'
    window.location.href = adminUrl
  }

  function setLanguage (lang, ev) {
    document.body.className = document.body.className.replace(/\blang-\w+\b/g, '').trim() + ' lang-' + lang
    let buttons = document.querySelectorAll('.lt-btn')
    for (let i = 0; i < buttons.length; i++) {
      buttons[i].classList.remove('active')
    }
    let t = ev && ev.target
    if (t) t.classList.add('active')
    localStorage.setItem('language', lang)
  }

  window.navigateTo = navigateTo
  window.goToLogin = goToLogin
  window.setLanguage = setLanguage

  function getCookie (name) {
    let value = '; ' + document.cookie
    let parts = value.split('; ' + name + '=')
    if (parts.length === 2) return parts.pop().split(';').shift()
    return null
  }

  function linkHtml (activeKey, item) {
    let isActive = activeKey === item.key
    let cls = 'kadr-nav-link' + (isActive ? ' kadr-nav-link--active' : '')
    return (
      '<a class="' + cls + '" href="' + item.href + '">' +
      '<span class="copy-en">' + item.en + '</span>' +
      '<span class="copy-hi">' + item.hi + '</span>' +
      '</a>'
    )
  }

  function buildNavInner (activeKey, minimal) {
    let navLinks = LINKS.map(function (item) {
      return linkHtml(activeKey, item)
    }).join('')

    let ctas =
      '<div class="nav-ctas">' +
      '<button type="button" class="btn btn-outline-white btn-sm" id="kadrLoginBtn" onclick="goToLogin()">Login</button>' +
      '<button type="button" class="btn btn-gold btn-sm copy-en" onclick="goToLogin()">Start Case →</button>' +
      '<button type="button" class="btn btn-gold btn-sm copy-hi" onclick="goToLogin()">Case Shuru Karo →</button>' +
      '</div>'

    let lang =
      '<div class="lang-toggle">' +
      '<button type="button" class="lt-btn active" onclick="setLanguage(\'en\', event)">EN</button>' +
      '<button type="button" class="lt-btn" onclick="setLanguage(\'hi\', event)">हि</button>' +
      '</div>'

    let brand =
      '<a class="kadr-brand" href="index">' +
      '<span class="kadr-brand-mark">🌿</span>' +
      '<span class="kadr-brand-text">kADR<small class="copy-en">Online Mediation</small><small class="copy-hi">Online Mediation</small></span>' +
      '</a>'

    let toggle =
      '<button type="button" class="kadr-menu-toggle" aria-label="Open menu" aria-expanded="false" id="kadrMenuToggle">☰</button>'

    let tagline =
      '<span class="kadr-reels-tagline copy-en">Swipe for more reels</span>' +
      '<span class="kadr-reels-tagline copy-hi">Reels ke liye swipe karein</span>'

    if (minimal) {
      return (
        '<div class="kadr-header-row">' +
        brand +
        tagline +
        toggle +
        '<nav class="kadr-nav-links" id="kadrNavLinks" aria-label="Primary">' + navLinks + '</nav>' +
        '<div class="kadr-header-tools">' + lang + '</div>' +
        '</div>'
      )
    }

    return (
      '<div class="kadr-header-row">' +
      brand +
      toggle +
      '<nav class="kadr-nav-links" id="kadrNavLinks" aria-label="Primary">' + navLinks + '</nav>' +
      '<div class="kadr-header-tools">' + lang + ctas + '</div>' +
      '</div>'
    )
  }

  function wireMobileNav () {
    let toggle = document.getElementById('kadrMenuToggle')
    let panel = document.getElementById('kadrNavLinks')
    let backdrop = document.getElementById('kadrNavBackdrop')
    if (!toggle || !panel) return

    function close () {
      panel.classList.remove('kadr-open')
      if (backdrop) backdrop.classList.remove('kadr-open')
      toggle.setAttribute('aria-expanded', 'false')
    }

    function open () {
      panel.classList.add('kadr-open')
      if (backdrop) backdrop.classList.add('kadr-open')
      toggle.setAttribute('aria-expanded', 'true')
    }

    toggle.addEventListener('click', function () {
      if (panel.classList.contains('kadr-open')) close()
      else open()
    })
    if (backdrop) {
      backdrop.addEventListener('click', close)
    }
    panel.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', close)
    })
  }

  function syncLoginLabel () {
    let token = getCookie('accessToken')
    let btn = document.getElementById('kadrLoginBtn')
    if (btn && token) btn.textContent = 'My Account'
  }

  function syncLangFromStorage () {
    let lang = localStorage.getItem('language') || 'en'
    document.body.className = document.body.className.replace(/\blang-\w+\b/g, '').trim() + ' lang-' + lang
    let buttons = document.querySelectorAll('.kadr-site-header .lt-btn')
    buttons.forEach(function (b) {
      b.classList.toggle('active', (lang === 'en' && b.textContent.trim() === 'EN') || (lang === 'hi' && b.textContent.indexOf('हि') !== -1))
    })
  }

  function mountHeader () {
    let host = document.getElementById('kadr-site-header')
    if (!host) return
    let active = host.getAttribute('data-kadr-active') || ''
    let minimal = host.hasAttribute('data-kadr-minimal')
    let backdrop = '<div class="kadr-nav-backdrop" id="kadrNavBackdrop" aria-hidden="true"></div>'
    host.className = 'kadr-site-header' + (minimal ? ' kadr-site-header--minimal' : '')
    host.innerHTML = backdrop + buildNavInner(active, minimal)
    wireMobileNav()
    syncLoginLabel()
  }

  function mountFooter () {
    let host = document.getElementById('kadr-site-footer')
    if (!host) return
    let minimal = host.hasAttribute('data-kadr-minimal')
    if (minimal) {
      host.className = 'kadr-footer-minimal'
      host.innerHTML =
        '<span>© 2026 KADR.live</span>' +
        '<a href="index">Home</a>' +
        '<a href="resources">Blog</a>' +
        '<a href="video-reels">Reels</a>' +
        '<a href="contact">Contact</a>'
      return
    }
    host.innerHTML =
      '<div class="footer">' +
      '<div class="ft-grid">' +
      '<div>' +
      '<div class="ft-logo"><div class="ft-logo-mark">🌿</div><div class="ft-logo-text">k<span>ADR</span>.live</div></div>' +
      '<div class="ft-desc copy-en">India\'s private online mediation platform. Affordable, confidential, and legally valid dispute resolution — aligned with India\'s framework for private mediation.</div>' +
      '<div class="ft-desc copy-hi">India ka online private mediation platform. Affordable, confidential, aur legally valid dispute resolution.</div>' +
      '<div class="ft-contact">📧 contact@kadr.live<br/>📍 Delhi, India</div>' +
      '</div>' +
      '<div><div class="ft-h copy-en">Platform</div><div class="ft-h copy-hi">Platform</div>' +
      '<a class="ft-link" href="how_it_works"><span class="copy-en">How It Works</span><span class="copy-hi">Kaise Kaam Karta Hai</span></a>' +
      '<a class="ft-link" href="case_studies">Case Studies</a>' +
      '<a class="ft-link" href="pricings">Pricing</a>' +
      '<a class="ft-link" href="video-reels"><span class="copy-en">Video Reels</span><span class="copy-hi">Video Reels</span></a>' +
      '</div>' +
      '<div><div class="ft-h copy-en">Learn</div><div class="ft-h copy-hi">Learn</div>' +
      '<a class="ft-link" href="resources">Blog</a>' +
      '<a class="ft-link" href="faq">FAQ</a>' +
      '<a class="ft-link" href="contact">Contact</a>' +
      '<a class="ft-link" href="index#kadr-organisations"><span class="copy-en">For Organisations</span><span class="copy-hi">Organisations</span></a>' +
      '</div>' +
      '<div><div class="ft-h copy-en">Account</div><div class="ft-h copy-hi">Account</div>' +
      '<a class="ft-link" href="#" onclick="goToLogin();return false;"><span class="copy-en">Login / Register</span><span class="copy-hi">Login</span></a>' +
      '</div>' +
      '</div>' +
      '<div class="ft-bottom">' +
      '<div class="ft-copy">© 2026 KADR.live | All Rights Reserved</div>' +
      '<div class="ft-disclaimer copy-en">KADR.live is a technology platform — not a law firm. For legal advice, consult a qualified advocate.</div>' +
      '<div class="ft-disclaimer copy-hi">KADR.live technology platform hai — law firm nahi.</div>' +
      '</div>' +
      '</div>'
  }

  function runChrome () {
    mountHeader()
    mountFooter()
    syncLangFromStorage()
    syncLoginLabel()
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runChrome)
  } else {
    runChrome()
  }
})()
