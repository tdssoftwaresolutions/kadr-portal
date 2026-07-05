const prisma = require('../../lib/prisma.js')
const { regenerateStaticPages } = require('./websiteStaticGenerator')

const DEFAULT_BANNER = {
  active: true,
  tag_en: 'New',
  tag_hi: 'New',
  text_en: 'KADR Partner Programme is now open for Trade Associations & RWAs across Delhi NCR — <strong>Apply before 30 April 2026</strong>',
  text_hi: 'KADR Partner Programme ab open hai Trade Associations & RWAs ke liye — <strong>Apply karo 30 April se pehle</strong>',
  link_text_en: 'Learn more →',
  link_text_hi: 'Jaano aur →',
  link_url: '/#kadr-organisations'
}

const DEFAULT_SETTINGS = {
  email: 'contact@kadr.live',
  phone: '+91 [Number]',
  whatsapp: '+91 [Number]',
  address_en: 'Delhi, India',
  address_hi: 'Delhi, India',
  pricing_note_en: 'Additional hearings: ₹999/hearing · Split billing available · GST included in all prices above',
  pricing_note_hi: 'Extra hearings: ₹999/hearing · Split billing available · GST sab prices mein include hai'
}

const DEFAULT_TESTIMONIALS = [
  {
    quote_en: '8 mahine se payment stuck thi. KADR se 2 sessions mein settle ho gayi. Mediator bahut professional the.',
    quote_hi: '8 mahine se payment stuck thi. KADR se 2 sessions mein settle ho gayi. Bahut accha experience tha.',
    author_name: 'Rajesh M.',
    role_en: 'Small Business Owner, Delhi',
    role_hi: 'Business Owner, Delhi',
    avatar_emoji: '🧑',
    stars: 5,
    sort_order: 0
  },
  {
    quote_en: 'The Aadhaar verification gave us full confidence. Settlement is documented and legally solid. I\'d recommend KADR to anyone.',
    quote_hi: 'Aadhaar verification se confidence aaya. Settlement properly documented hai. KADR recommend karunga sab ko.',
    author_name: 'Priya S.',
    role_en: 'Tenant, Gurugram',
    role_hi: 'Tenant, Gurugram',
    avatar_emoji: '👩',
    stars: 5,
    sort_order: 1
  },
  {
    quote_en: 'Hamara trade association KADR regularly use karta hai. Members ko ek professional channel mila — bilkul theek hai.',
    quote_hi: 'Humara association ab KADR use karta hai member disputes ke liye. Professional aur smooth process hai.',
    author_name: 'Mahesh T.',
    role_en: 'Secretary, Delhi Traders Association',
    role_hi: 'Secretary, Delhi Traders Association',
    avatar_emoji: '👨',
    stars: 4,
    sort_order: 2
  }
]

const DEFAULT_PRICING_PLANS = [
  {
    name_en: 'Standard',
    name_hi: 'Standard',
    price_display: '2,999',
    period_en: 'Per case · incl. GST',
    period_hi: 'Per case · GST include',
    is_popular: false,
    button_style: 'secondary',
    sort_order: 0,
    features: [
      { text_en: '3 mediation hearings', text_hi: '3 mediation hearings', included: true, sort_order: 0 },
      { text_en: 'Qualified mediator assigned', text_hi: 'Qualified mediator assign', included: true, sort_order: 1 },
      { text_en: 'Aadhaar KYC both parties', text_hi: 'Aadhaar KYC dono parties', included: true, sort_order: 2 },
      { text_en: 'Settlement agreement document', text_hi: 'Settlement agreement document', included: true, sort_order: 3 },
      { text_en: 'Case records — 1 year', text_hi: 'Case records — 1 saal', included: true, sort_order: 4 },
      { text_en: 'Priority scheduling', text_hi: 'Priority scheduling', included: false, sort_order: 5 }
    ]
  },
  {
    name_en: 'Plus',
    name_hi: 'Plus',
    price_display: '4,999',
    period_en: 'Per case · incl. GST',
    period_hi: 'Per case · GST include',
    is_popular: true,
    badge_en: 'Most Popular',
    badge_hi: 'Sabse Popular',
    button_style: 'primary',
    sort_order: 1,
    features: [
      { text_en: '5 mediation hearings', text_hi: '5 mediation hearings', included: true, sort_order: 0 },
      { text_en: 'Senior mediator assigned', text_hi: 'Senior mediator assign', included: true, sort_order: 1 },
      { text_en: 'Aadhaar KYC both parties', text_hi: 'Aadhaar KYC dono parties', included: true, sort_order: 2 },
      { text_en: 'Notarised settlement option', text_hi: 'Notarised settlement option', included: true, sort_order: 3 },
      { text_en: 'Case records — 3 years', text_hi: 'Case records — 3 saal', included: true, sort_order: 4 },
      { text_en: 'Priority scheduling', text_hi: 'Priority scheduling', included: true, sort_order: 5 }
    ]
  },
  {
    name_en: 'Organisation',
    name_hi: 'Organisation',
    price_display: 'Custom',
    period_en: 'Monthly / Annual licence',
    period_hi: 'Monthly / Annual licence',
    is_popular: false,
    button_style: 'outline-brown',
    sort_order: 2,
    features: [
      { text_en: 'Unlimited case submissions', text_hi: 'Unlimited case submissions', included: true, sort_order: 0 },
      { text_en: 'White-label sub-domain', text_hi: 'White-label sub-domain', included: true, sort_order: 1 },
      { text_en: 'Dedicated mediator panel', text_hi: 'Dedicated mediator panel', included: true, sort_order: 2 },
      { text_en: 'MIS reporting dashboard', text_hi: 'MIS reporting dashboard', included: true, sort_order: 3 },
      { text_en: 'SLA-backed support', text_hi: 'SLA-backed support', included: true, sort_order: 4 },
      { text_en: 'Custom branding', text_hi: 'Custom branding', included: true, sort_order: 5 }
    ]
  }
]

const DEFAULT_FAQ = [
  {
    name_en: 'About Mediation',
    name_hi: 'Mediation Ke Baare Mein',
    sort_order: 0,
    items: [
      {
        question_en: 'What is mediation and how is it different from going to court?',
        question_hi: 'Mediation kya hoti hai? Court se kya fark hai?',
        answer_en: 'Mediation is a voluntary, structured process where a neutral mediator helps both parties reach a mutually agreed resolution. Unlike court, the mediator doesn\'t impose a decision — both parties work together to find a solution they can live with. It\'s private, confidential, faster, and significantly more affordable.',
        answer_hi: 'Mediation ek voluntary, structured process hai jisme ek neutral mediator dono parties ko milkar solution nikalne mein help karta hai. Court ki tarah mediator decision nahi thopata — dono parties milkar koi bhi solution nikal sakte hain. Private, confidential, fast, aur kaafi affordable hai.',
        sort_order: 0
      },
      {
        question_en: 'Is a KADR mediation settlement legally binding?',
        question_hi: 'Kya KADR settlement legally binding hai?',
        answer_en: 'Yes. A signed Mediation Settlement Agreement is legally valid under Indian contract law and can be filed in court for enforcement under CPC provisions.',
        answer_hi: 'Haan. Signed Mediation Settlement Agreement Indian contract law ke under legally valid hai aur CPC provisions ke under court mein file ho sakti hai.',
        sort_order: 1
      }
    ]
  },
  {
    name_en: 'The KADR Process',
    name_hi: 'KADR ka Process',
    sort_order: 1,
    items: [
      {
        question_en: 'What types of disputes can KADR handle?',
        question_hi: 'KADR kaunse disputes handle karta hai?',
        answer_en: 'Civil, commercial, family, and community disputes: trader payment disputes, tenant-landlord conflicts, family property matters, matrimonial issues, partnership disputes, and community/RWA disputes.',
        answer_hi: 'Civil, commercial, family, aur community disputes: trader payment, tenant-landlord, family property, matrimonial, partnership, aur community/RWA disputes.',
        sort_order: 0
      }
    ]
  }
]

async function loadAllContent () {
  const [settings, banner, testimonials, pricingPlans, faqCategories] = await Promise.all([
    prisma.website_settings.findUnique({ where: { id: 'default' } }),
    prisma.website_banner.findUnique({ where: { id: 'default' } }),
    prisma.website_testimonials.findMany({ orderBy: [{ created_at: 'desc' }] }),
    prisma.website_pricing_plans.findMany({
      orderBy: [{ sort_order: 'asc' }, { created_at: 'asc' }],
      include: { features: { orderBy: { sort_order: 'asc' } } }
    }),
    prisma.website_faq_categories.findMany({
      orderBy: [{ sort_order: 'asc' }, { created_at: 'asc' }],
      include: { items: { orderBy: { sort_order: 'asc' } } }
    })
  ])
  return { settings, banner, testimonials, pricingPlans, faqCategories }
}

async function regenerateFromDb () {
  const data = await loadAllContent()
  await regenerateStaticPages(data)
  return data
}

async function safeRegenerateFromDb () {
  try {
    return await regenerateFromDb()
  } catch (err) {
    console.error('[website] Static regeneration failed:', err.message)
    return null
  }
}

/** Regenerate static HTML after response — avoids nodemon/proxy 502 during file writes. */
function scheduleRegenerate () {
  setImmediate(() => {
    safeRegenerateFromDb().catch((err) => {
      console.error('[website] Background regeneration failed:', err.message)
    })
  })
}

let defaultsEnsuredPromise = null
let defaultsEnsuredDone = false

function isConnectionLimitError (err) {
  const msg = String(err?.message || err || '')
  return msg.includes('max_connections_per_hour') || msg.includes('1226')
}

async function runEnsureWebsiteDefaults () {
  const [settings, banner, testimonialCount, planCount, faqCount] = await Promise.all([
    prisma.website_settings.findUnique({ where: { id: 'default' } }),
    prisma.website_banner.findUnique({ where: { id: 'default' } }),
    prisma.website_testimonials.count(),
    prisma.website_pricing_plans.count(),
    prisma.website_faq_categories.count()
  ])

  let seeded = false

  if (!settings) {
    await prisma.website_settings.create({ data: { id: 'default', ...DEFAULT_SETTINGS } })
    seeded = true
  }

  if (!banner) {
    await prisma.website_banner.create({ data: { id: 'default', ...DEFAULT_BANNER } })
    seeded = true
  }

  if (testimonialCount === 0) {
    await prisma.website_testimonials.createMany({ data: DEFAULT_TESTIMONIALS })
    seeded = true
  }

  if (planCount === 0) {
    for (const plan of DEFAULT_PRICING_PLANS) {
      const { features, ...planData } = plan
      await prisma.website_pricing_plans.create({
        data: {
          ...planData,
          features: { create: features }
        }
      })
    }
    seeded = true
  }

  if (faqCount === 0) {
    for (const cat of DEFAULT_FAQ) {
      const { items, ...catData } = cat
      await prisma.website_faq_categories.create({
        data: {
          ...catData,
          items: { create: items }
        }
      })
    }
    seeded = true
  }

  if (seeded) {
    try {
      await safeRegenerateFromDb()
    } catch (err) {
      console.error('[website] Static page regeneration skipped:', err.message)
    }
  }
}

/**
 * Seed default website rows once per process. Skips static regeneration when data already exists.
 * Safe to call from startup — deduped and tolerant of shared-hosting connection limits.
 */
async function ensureWebsiteDefaults () {
  if (defaultsEnsuredDone) return
  if (defaultsEnsuredPromise) return defaultsEnsuredPromise

  defaultsEnsuredPromise = runEnsureWebsiteDefaults()
    .then(() => {
      defaultsEnsuredDone = true
    })
    .catch((err) => {
      defaultsEnsuredPromise = null
      if (isConnectionLimitError(err)) {
        console.warn(
          '[website] Seed skipped — DB max_connections_per_hour reached. ' +
          'Use Admin → Website content after the limit resets, or set WEBSITE_CONTENT_SEED_ON_STARTUP=0 to skip auto-seed.'
        )
        return
      }
      throw err
    })

  return defaultsEnsuredPromise
}

async function getAdminContent () {
  return loadAllContent()
}

async function getPublicFaq () {
  const categories = await prisma.website_faq_categories.findMany({
    where: { active: true },
    orderBy: [{ sort_order: 'asc' }, { created_at: 'asc' }],
    include: {
      items: {
        where: { active: true },
        orderBy: [{ sort_order: 'asc' }, { created_at: 'asc' }]
      }
    }
  })
  return categories
    .filter((cat) => cat.items && cat.items.length > 0)
    .map((cat) => ({
      id: cat.id,
      name_en: cat.name_en,
      name_hi: cat.name_hi,
      items: cat.items.map((item) => ({
        id: item.id,
        question_en: item.question_en,
        question_hi: item.question_hi,
        answer_en: item.answer_en,
        answer_hi: item.answer_hi
      }))
    }))
}

async function saveSettings (data) {
  const settings = await prisma.website_settings.upsert({
    where: { id: 'default' },
    update: {
      email: data.email,
      phone: data.phone || '',
      whatsapp: data.whatsapp || '',
      address_en: data.address_en,
      address_hi: data.address_hi || data.address_en,
      pricing_note_en: data.pricing_note_en,
      pricing_note_hi: data.pricing_note_hi
    },
    create: { id: 'default', ...DEFAULT_SETTINGS, ...data }
  })
  scheduleRegenerate()
  return settings
}

async function saveBanner (data) {
  const banner = await prisma.website_banner.upsert({
    where: { id: 'default' },
    update: {
      active: data.active !== false,
      tag_en: data.tag_en,
      tag_hi: data.tag_hi || data.tag_en,
      text_en: data.text_en,
      text_hi: data.text_hi,
      link_text_en: data.link_text_en,
      link_text_hi: data.link_text_hi,
      link_url: data.link_url
    },
    create: { id: 'default', ...DEFAULT_BANNER, ...data }
  })
  scheduleRegenerate()
  return banner
}

async function saveTestimonial (data) {
  const { createError } = require('../../utils/errors')
  const errorCodes = require('../../utils/errors/errorCodes')

  const quoteEn = data.quote_en != null ? String(data.quote_en).trim() : ''
  const customerName = String(data.customer_name || data.author_name || '').trim()
  if (!quoteEn) throw createError(errorCodes.MISSING_REQUIRED_DETAIL)
  if (!customerName) throw createError(errorCodes.MISSING_REQUIRED_DETAIL)

  const designation = data.designation != null ? String(data.designation).trim() : (data.role_en || '')
  const payload = {
    quote_en: quoteEn,
    quote_hi: (data.quote_hi != null ? String(data.quote_hi).trim() : '') || quoteEn,
    author_name: customerName,
    role_en: designation,
    role_hi: designation,
    avatar_emoji: '',
    stars: Math.max(1, Math.min(5, parseInt(data.stars, 10) || 5)),
    sort_order: 0,
    active: data.active !== false
  }
  let row
  if (data.id) {
    row = await prisma.website_testimonials.update({ where: { id: data.id }, data: payload })
  } else {
    row = await prisma.website_testimonials.create({ data: payload })
  }
  scheduleRegenerate()
  return row
}

async function deleteTestimonial (id) {
  await prisma.website_testimonials.delete({ where: { id } })
  scheduleRegenerate()
}

async function savePricingPlan (data) {
  const planData = {
    name_en: data.name_en,
    name_hi: data.name_hi,
    price_display: data.price_display,
    period_en: data.period_en,
    period_hi: data.period_hi,
    is_popular: Boolean(data.is_popular),
    badge_en: data.badge_en || null,
    badge_hi: data.badge_hi || null,
    button_style: data.button_style || 'secondary',
    sort_order: parseInt(data.sort_order, 10) || 0,
    active: data.active !== false
  }
  const features = Array.isArray(data.features) ? data.features : []

  let plan
  if (data.id) {
    plan = await prisma.$transaction(async (tx) => {
      const updated = await tx.website_pricing_plans.update({ where: { id: data.id }, data: planData })
      await tx.website_pricing_features.deleteMany({ where: { plan_id: data.id } })
      if (features.length) {
        await tx.website_pricing_features.createMany({
          data: features.map((f, idx) => ({
            plan_id: data.id,
            text_en: f.text_en,
            text_hi: f.text_hi,
            included: f.included !== false,
            sort_order: parseInt(f.sort_order, 10) ?? idx
          }))
        })
      }
      return updated
    })
  } else {
    plan = await prisma.website_pricing_plans.create({
      data: {
        ...planData,
        features: {
          create: features.map((f, idx) => ({
            text_en: f.text_en,
            text_hi: f.text_hi,
            included: f.included !== false,
            sort_order: parseInt(f.sort_order, 10) ?? idx
          }))
        }
      }
    })
  }
  scheduleRegenerate()
  return prisma.website_pricing_plans.findUnique({
    where: { id: plan.id },
    include: { features: { orderBy: { sort_order: 'asc' } } }
  })
}

async function deletePricingPlan (id) {
  await prisma.website_pricing_plans.delete({ where: { id } })
  scheduleRegenerate()
}

async function saveFaqCategory (data) {
  const payload = {
    name_en: data.name_en,
    name_hi: data.name_hi,
    sort_order: parseInt(data.sort_order, 10) || 0,
    active: data.active !== false
  }
  let row
  if (data.id) {
    row = await prisma.website_faq_categories.update({ where: { id: data.id }, data: payload })
  } else {
    row = await prisma.website_faq_categories.create({ data: payload })
  }
  return row
}

async function deleteFaqCategory (id) {
  await prisma.website_faq_categories.delete({ where: { id } })
}

async function saveFaqItem (data) {
  const payload = {
    category_id: data.category_id,
    question_en: data.question_en,
    question_hi: data.question_hi,
    answer_en: data.answer_en,
    answer_hi: data.answer_hi,
    sort_order: parseInt(data.sort_order, 10) || 0,
    active: data.active !== false
  }
  let row
  if (data.id) {
    row = await prisma.website_faq_items.update({ where: { id: data.id }, data: payload })
  } else {
    row = await prisma.website_faq_items.create({ data: payload })
  }
  return row
}

async function deleteFaqItem (id) {
  await prisma.website_faq_items.delete({ where: { id } })
}

module.exports = {
  ensureWebsiteDefaults,
  getAdminContent,
  getPublicFaq,
  regenerateFromDb,
  saveSettings,
  saveBanner,
  saveTestimonial,
  deleteTestimonial,
  savePricingPlan,
  deletePricingPlan,
  saveFaqCategory,
  deleteFaqCategory,
  saveFaqItem,
  deleteFaqItem
}
