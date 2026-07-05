(function () {
  var DISMISS_KEY = 'kadr_pwa_install_dismissed'
  var DISMISS_DAYS = 7

  function wasDismissed () {
    try {
      var raw = localStorage.getItem(DISMISS_KEY)
      if (!raw) return false
      var ts = parseInt(raw, 10)
      if (!Number.isFinite(ts)) return false
      return Date.now() - ts < DISMISS_DAYS * 86400000
    } catch (e) {
      return false
    }
  }

  function dismiss () {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())) } catch (e) {}
    var el = document.getElementById('kadrPwaBanner')
    if (el) el.remove()
  }

  function isIos () {
    return /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream
  }

  function isStandalone () {
    return window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true
  }

  function registerServiceWorker () {
    if (!('serviceWorker' in navigator)) return
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(function () {})
  }

  function ensureStyles () {
    if (document.getElementById('kadr-pwa-install-css')) return
    var link = document.createElement('link')
    link.id = 'kadr-pwa-install-css'
    link.rel = 'stylesheet'
    link.href = '/css/pwa-install.css'
    document.head.appendChild(link)
  }

  function showBanner (opts) {
    if (document.getElementById('kadrPwaBanner') || wasDismissed() || isStandalone()) return
    ensureStyles()
    var banner = document.createElement('div')
    banner.id = 'kadrPwaBanner'
    banner.className = 'kadr-pwa-banner'
    banner.setAttribute('role', 'dialog')
    banner.setAttribute('aria-label', 'Install KADR app')

    var iosHint = opts.ios
      ? '<div class="kadr-pwa-ios-steps copy-en">Tap Share → Add to Home Screen</div>' +
        '<div class="kadr-pwa-ios-steps copy-hi">Share dabao → Add to Home Screen</div>'
      : ''

    banner.innerHTML =
      '<div class="kadr-pwa-inner">' +
      '<div class="kadr-pwa-icon">📲</div>' +
      '<div class="kadr-pwa-copy">' +
      '<div class="kadr-pwa-title copy-en">Install KADR on your device</div>' +
      '<div class="kadr-pwa-title copy-hi">KADR apne phone ya desktop pe install karo</div>' +
      '<div class="kadr-pwa-sub copy-en">Get quick access — works like an app on Android, iPhone, and desktop.</div>' +
      '<div class="kadr-pwa-sub copy-hi">Quick access — Android, iPhone aur desktop pe app jaisa.</div>' +
      iosHint +
      '</div>' +
      '<div class="kadr-pwa-actions">' +
      (opts.showInstall
        ? '<button type="button" class="kadr-pwa-btn kadr-pwa-btn--primary" id="kadrPwaInstallBtn">' +
          '<span class="copy-en">Install app</span><span class="copy-hi">Install karo</span></button>'
        : '') +
      '<button type="button" class="kadr-pwa-btn kadr-pwa-btn--ghost" id="kadrPwaDismissBtn">' +
      '<span class="copy-en">Not now</span><span class="copy-hi">Baad mein</span></button>' +
      '</div></div>'

    document.body.appendChild(banner)
    document.getElementById('kadrPwaDismissBtn').addEventListener('click', dismiss)

    if (opts.showInstall && opts.onInstall) {
      document.getElementById('kadrPwaInstallBtn').addEventListener('click', opts.onInstall)
    }
  }

  var deferredPrompt = null

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault()
    deferredPrompt = e
    showBanner({
      showInstall: true,
      ios: false,
      onInstall: function () {
        if (!deferredPrompt) return
        deferredPrompt.prompt()
        deferredPrompt.userChoice.then(function () {
          deferredPrompt = null
          dismiss()
        })
      }
    })
  })

  function init () {
    registerServiceWorker()
    if (isStandalone() || wasDismissed()) return
    setTimeout(function () {
      if (deferredPrompt) return
      if (isIos()) {
        showBanner({ showInstall: false, ios: true })
      } else if (/android/i.test(navigator.userAgent)) {
        showBanner({ showInstall: false, ios: false })
      } else {
        showBanner({ showInstall: false, ios: false })
      }
    }, 1200)
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }
})()
