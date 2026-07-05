(function () {
  var API_URL = '/api/public/website-faq'
  var activeCategoryId = null

  function esc (s) {
    if (s == null) return ''
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
  }

  function catButtonStyle (isActive) {
    if (isActive) {
      return 'padding:10px 14px;background:var(--b500);color:#fff;border-radius:var(--r-sm);font-size:12px;font-weight:600;cursor:pointer;border:none;text-align:left;font-family:inherit;width:100%'
    }
    return 'padding:10px 14px;color:var(--text-muted);font-size:12px;cursor:pointer;background:transparent;border:none;text-align:left;font-family:inherit;width:100%'
  }

  function renderFaqItem (item, openFirst) {
    var openClass = openFirst ? ' open' : ''
    return (
      '<div class="faq-item' + openClass + '">' +
      '<div class="faq-q">' +
      '<span class="copy-en">' + esc(item.question_en) + '</span>' +
      '<span class="copy-hi">' + esc(item.question_hi || item.question_en) + '</span>' +
      '<div class="faq-toggle">+</div></div>' +
      '<div class="faq-a copy-en">' + (item.answer_en || '') + '</div>' +
      '<div class="faq-a copy-hi">' + (item.answer_hi || item.answer_en || '') + '</div>' +
      '</div>'
    )
  }

  function renderCategoryPanel (cat, isFirst) {
    var items = cat.items || []
    var html = items.map(function (item, idx) {
      return renderFaqItem(item, isFirst && idx === 0)
    }).join('')
    var display = isFirst ? 'block' : 'none'
    return '<div class="kadr-faq-panel" data-faq-panel="' + esc(cat.id) + '" style="display:' + display + '">' + html + '</div>'
  }

  function renderFaq (categories) {
    var root = document.getElementById('kadr-faq-root')
    if (!root) return

    if (!categories.length) {
      root.innerHTML =
        '<p class="copy-en" style="text-align:center;color:var(--text-muted);padding:40px 20px">No FAQs published yet.</p>' +
        '<p class="copy-hi" style="text-align:center;color:var(--text-muted);padding:0 20px 40px">Abhi koi FAQ publish nahi hui.</p>'
      return
    }

    activeCategoryId = categories[0].id

    var sidebar = categories.map(function (cat, idx) {
      return (
        '<button type="button" class="kadr-faq-cat" data-faq-cat="' + esc(cat.id) + '" style="' + catButtonStyle(idx === 0) + '">' +
        '<span class="copy-en">' + esc(cat.name_en) + '</span>' +
        '<span class="copy-hi">' + esc(cat.name_hi || cat.name_en) + '</span>' +
        '</button>'
      )
    }).join('')

    var panels = categories.map(function (cat, idx) {
      return renderCategoryPanel(cat, idx === 0)
    }).join('')

    root.innerHTML =
      '<div style="display:grid;grid-template-columns:260px 1fr;gap:52px;max-width:1100px;margin:0 auto">' +
      '<div>' +
      '<div class="copy-en" style="font-size:12px;font-weight:700;color:var(--b700);margin-bottom:12px">Categories</div>' +
      '<div class="copy-hi" style="font-size:12px;font-weight:700;color:var(--b700);margin-bottom:12px">Categories</div>' +
      '<div style="display:flex;flex-direction:column;gap:4px" id="kadr-faq-categories">' + sidebar + '</div>' +
      '</div>' +
      '<div id="kadr-faq-panels">' + panels + '</div>' +
      '</div>'

    wireInteractions(root)
  }

  function selectCategory (id) {
    activeCategoryId = id
    document.querySelectorAll('.kadr-faq-cat').forEach(function (el) {
      var on = el.getAttribute('data-faq-cat') === id
      el.style.cssText = catButtonStyle(on)
    })
    document.querySelectorAll('.kadr-faq-panel').forEach(function (panel) {
      panel.style.display = panel.getAttribute('data-faq-panel') === id ? 'block' : 'none'
    })
  }

  function wireInteractions (root) {
    root.querySelectorAll('.kadr-faq-cat').forEach(function (btn) {
      btn.addEventListener('click', function () {
        selectCategory(btn.getAttribute('data-faq-cat'))
      })
    })
    root.querySelectorAll('.faq-item').forEach(function (item) {
      item.addEventListener('click', function () {
        item.classList.toggle('open')
      })
    })
  }

  async function loadFaq () {
    var root = document.getElementById('kadr-faq-root')
    if (!root) return
    try {
      var res = await fetch(API_URL)
      if (!res.ok) throw new Error('HTTP ' + res.status)
      var json = await res.json()
      var categories = (json.data && json.data.categories) || []
      renderFaq(categories)
    } catch (e) {
      console.error('[faq] Load failed:', e)
      root.innerHTML =
        '<p style="text-align:center;color:var(--text-muted);padding:40px 20px">Could not load FAQs. Please try again later.</p>'
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadFaq)
  } else {
    loadFaq()
  }
})()
