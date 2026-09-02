const path = require('path')
const fs = require('fs')
const Helper = require('../../utils/helper')

const WEBSITE_ROOT = path.join(__dirname, '..', '..', 'public', 'website')

function esc (value) {
  return Helper.escapeHtml(value || '')
}

function replaceMarkerSection (content, markerName, newSection) {
  const start = `<!-- KADR:${markerName} START -->`
  const end = `<!-- KADR:${markerName} END -->`
  const re = new RegExp(`${start.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?${end.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`)
  if (!re.test(content)) {
    throw new Error(`Marker KADR:${markerName} not found in HTML`)
  }
  return content.replace(re, `${start}\n${newSection}\n${end}`)
}

function starsHtml (count) {
  const n = Math.max(1, Math.min(5, parseInt(count, 10) || 5))
  return '★'.repeat(n) + (n < 5 ? '☆'.repeat(5 - n) : '')
}

function buildBannerHtml (banner) {
  if (!banner || !banner.active) return ''
  const linkEn = banner.link_text_en
    ? `<div class="bs-link copy-en">${esc(banner.link_text_en)}</div>`
    : ''
  const linkHi = banner.link_text_hi
    ? `<div class="bs-link copy-hi">${esc(banner.link_text_hi)}</div>`
    : ''
  const linkWrapStart = banner.link_url ? `<a href="${esc(banner.link_url)}" style="color:inherit;text-decoration:none;display:contents">` : ''
  const linkWrapEnd = banner.link_url ? '</a>' : ''
  return (
    `${linkWrapStart}<div class="banner-strip">` +
    `<div class="bs-tag copy-en">${esc(banner.tag_en)}</div>` +
    `<div class="bs-tag copy-hi">${esc(banner.tag_hi || banner.tag_en)}</div>` +
    `<div class="bs-text copy-en">${banner.text_en || ''}</div>` +
    `<div class="bs-text copy-hi">${banner.text_hi || ''}</div>` +
    linkEn + linkHi +
    '</div>' +
    linkWrapEnd
  )
}

function buildTestimonialsHtml (items) {
  const active = (items || []).filter((t) => t.active !== false)
  if (!active.length) return '<div class="cards-3"></div>'
  const cards = active.map((t) => {
    const designation = t.role_en || t.designation || ''
    return (
      '<div class="testi">' +
      `<div class="testi-stars">${starsHtml(t.stars)}</div>` +
      `<div class="testi-text copy-en">"${esc(t.quote_en)}"</div>` +
      `<div class="testi-text copy-hi">"${esc(t.quote_hi || t.quote_en)}"</div>` +
      '<div class="testi-author"><div>' +
      `<div class="testi-name">${esc(t.author_name || t.customer_name)}</div>` +
      (designation ? `<div class="testi-role">${esc(designation)}</div>` : '') +
      '</div></div></div>'
    )
  }).join('\n')
  return `<div class="cards-3">\n${cards}\n</div>`
}

function buildContactDetailsHtml (settings) {
  const email = esc(settings.email)
  const phone = esc(settings.phone)
  const whatsapp = esc(settings.whatsapp)
  const addressEn = esc(settings.address_en)
  const addressHi = esc(settings.address_hi || settings.address_en)
  const phoneLine = phone ? `📞 ${phone}<br/>` : ''
  const waLine = whatsapp ? `💬 WhatsApp: ${whatsapp}<br/>` : ''
  return (
    '<div style="font-size:13px;color:var(--text-muted);line-height:2.4">' +
    `📧 ${email}<br/>${phoneLine}${waLine}` +
    `<span class="copy-en">📍 ${addressEn}</span>` +
    `<span class="copy-hi">📍 ${addressHi}</span>` +
    '</div>'
  )
}

function buildPricingHtml (plans, settings) {
  const active = (plans || []).filter((p) => p.active !== false)
  const cards = active.map((plan) => {
    const popClass = plan.is_popular ? ' pop' : ''
    const badge = plan.is_popular && plan.badge_en
      ? `<div class="price-badge copy-en">${esc(plan.badge_en)}</div>` +
        `<div class="price-badge copy-hi">${esc(plan.badge_hi || plan.badge_en)}</div>`
      : ''
    const btnClass = plan.button_style === 'primary'
      ? 'btn-primary'
      : plan.button_style === 'outline-brown' ? 'btn-outline-brown' : 'btn-secondary'
    const priceHtml = plan.price_display.toLowerCase() === 'custom'
      ? `<div class="price-amount" style="font-size:32px;padding-top:10px">${esc(plan.price_display)}</div>`
      : `<div class="price-amount"><span class="price-curr">₹</span>${esc(plan.price_display)}</div>`
    const features = (plan.features || [])
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((f) => {
        const icon = f.included ? '<span class="pf-y">✓</span>' : '<span class="pf-n">—</span>'
        return `<div class="price-feat">${icon}<span class="copy-en">${esc(f.text_en)}</span><span class="copy-hi">${esc(f.text_hi)}</span></div>`
      }).join('\n')
    return (
      `<div class="price-card${popClass}">` +
      badge +
      `<div class="price-name copy-en">${esc(plan.name_en)}</div>` +
      `<div class="price-name copy-hi">${esc(plan.name_hi)}</div>` +
      priceHtml +
      `<div class="price-period copy-en">${esc(plan.period_en)}</div>` +
      `<div class="price-period copy-hi">${esc(plan.period_hi)}</div>` +
      `<div style="margin:20px 0">${features}</div>` +
      `<a href="/admin/auth/sign-up" class="btn ${btnClass}" style="width:100%;padding:12px;justify-content:center;text-decoration:none"><span class="copy-en">Start This Case</span><span class="copy-hi">Shuru Karo</span></a>` +
      '</div>'
    )
  }).join('\n')
  const noteEn = settings.pricing_note_en || 'Additional hearings: ₹999/hearing · Split billing available · GST included in all prices above'
  const noteHi = settings.pricing_note_hi || 'Extra hearings: ₹999/hearing · Split billing available · GST sab prices mein include hai'
  return (
    `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:28px;max-width:980px;margin:0 auto">\n${cards}\n</div>` +
    `<div class="copy-en" style="margin-top:20px;font-size:12px;color:var(--text-muted)">${esc(noteEn)}</div>` +
    `<div class="copy-hi" style="margin-top:20px;font-size:12px;color:var(--text-muted)">${esc(noteHi)}</div>`
  )
}

function buildFaqHtml (categories) {
  const activeCats = (categories || []).filter((c) => c.active !== false)
  if (!activeCats.length) {
    return '<div style="display:grid;grid-template-columns:260px 1fr;gap:52px;max-width:1100px;margin:0 auto"></div>'
  }
  const sidebar = activeCats.map((cat, idx) => {
    const style = idx === 0
      ? 'padding:10px 14px;background:var(--b500);color:#fff;border-radius:var(--r-sm);font-size:12px;font-weight:600;cursor:pointer'
      : 'padding:10px 14px;color:var(--text-muted);font-size:12px;cursor:pointer'
    return (
      `<div class="kadr-faq-cat" data-faq-cat="${esc(cat.id)}" style="${style}" onclick="kadrSelectFaqCategory('${esc(cat.id)}')">` +
      `<span class="copy-en">${esc(cat.name_en)}</span>` +
      `<span class="copy-hi">${esc(cat.name_hi)}</span></div>`
    )
  }).join('\n')

  const panels = activeCats.map((cat, idx) => {
    const items = (cat.items || []).filter((i) => i.active !== false).sort((a, b) => a.sort_order - b.sort_order)
    const faqItems = items.map((item, iIdx) => (
      `<div class="faq-item${idx === 0 && iIdx === 0 ? ' open' : ''}" onclick="this.classList.toggle('open')">` +
      `<div class="faq-q"><span class="copy-en">${esc(item.question_en)}</span><span class="copy-hi">${esc(item.question_hi)}</span><div class="faq-toggle">+</div></div>` +
      `<div class="faq-a copy-en">${item.answer_en || ''}</div>` +
      `<div class="faq-a copy-hi">${item.answer_hi || ''}</div></div>`
    )).join('\n')
    const display = idx === 0 ? 'block' : 'none'
    return `<div class="kadr-faq-panel" data-faq-panel="${esc(cat.id)}" style="display:${display}">${faqItems}</div>`
  }).join('\n')

  return (
    '<div style="display:grid;grid-template-columns:260px 1fr;gap:52px;max-width:1100px;margin:0 auto">' +
    '<div><div class="copy-en" style="font-size:12px;font-weight:700;color:var(--b700);margin-bottom:12px">Categories</div>' +
    '<div class="copy-hi" style="font-size:12px;font-weight:700;color:var(--b700);margin-bottom:12px">Categories</div>' +
    `<div style="display:flex;flex-direction:column;gap:4px">${sidebar}</div></div>` +
    `<div id="kadr-faq-panels">${panels}</div></div>` +
    '<script>function kadrSelectFaqCategory(id){document.querySelectorAll(\'.kadr-faq-cat\').forEach(function(el){var on=el.getAttribute(\'data-faq-cat\')===id;el.style.background=on?\'var(--b500)\':\'transparent\';el.style.color=on?\'#fff\':\'var(--text-muted)\';el.style.fontWeight=on?\'600\':\'400\';});document.querySelectorAll(\'.kadr-faq-panel\').forEach(function(p){p.style.display=p.getAttribute(\'data-faq-panel\')===id?\'block\':\'none\';});}</script>'
  )
}

function buildSiteConfigJs (settings) {
  const config = {
    email: settings.email || 'contact@kadr.live',
    phone: settings.phone || '',
    whatsapp: settings.whatsapp || '',
    addressEn: settings.address_en || 'Delhi, India',
    addressHi: settings.address_hi || settings.address_en || 'Delhi, India'
  }
  return `window.KADR_SITE_CONFIG=${JSON.stringify(config)};\n`
}

async function patchHtmlFile (relativePath, markerName, sectionHtml) {
  const filePath = path.join(WEBSITE_ROOT, relativePath)
  const content = await fs.promises.readFile(filePath, 'utf8')
  const updated = replaceMarkerSection(content, markerName, sectionHtml)
  await fs.promises.writeFile(filePath, updated, 'utf8')
}

async function regenerateStaticPages ({ settings, banner, testimonials, pricingPlans, faqCategories }) {
  await patchHtmlFile('index.html', 'BANNER', buildBannerHtml(banner))
  await patchHtmlFile('index.html', 'TESTIMONIALS', buildTestimonialsHtml(testimonials))
  await patchHtmlFile('contact.html', 'CONTACT_DETAILS', buildContactDetailsHtml(settings))
  await patchHtmlFile('pricings.html', 'PRICING', buildPricingHtml(pricingPlans, settings))

  const configPath = path.join(WEBSITE_ROOT, 'js', 'site-config.js')
  await fs.promises.writeFile(configPath, buildSiteConfigJs(settings), 'utf8')
}

module.exports = {
  regenerateStaticPages,
  buildBannerHtml,
  buildTestimonialsHtml,
  buildContactDetailsHtml,
  buildPricingHtml,
  buildFaqHtml,
  buildSiteConfigJs
}
