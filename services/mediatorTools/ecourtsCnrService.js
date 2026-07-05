const axios = require('axios')
const cheerio = require('cheerio')
const { randomUUID } = require('crypto')

const ECOURTS_BASE = 'https://services.ecourts.gov.in/ecourtindia_v6'
const HOME_URL = `${ECOURTS_BASE}/?p=home/index`
const SEARCH_URL = `${ECOURTS_BASE}/?p=cnr_status/searchByCNR/`
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
const SESSION_TTL_MS = 12 * 60 * 1000

const sessions = new Map()

function parseSetCookie (setCookieHeader) {
  if (!setCookieHeader) return ''
  const list = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader]
  return list.map((c) => c.split(';')[0]).join('; ')
}

function mergeCookies (existing, additional) {
  const jar = {}
  const add = (str) => {
    str.split(';').forEach((part) => {
      const trimmed = part.trim()
      if (!trimmed) return
      const eq = trimmed.indexOf('=')
      if (eq > 0) jar[trimmed.slice(0, eq)] = trimmed.slice(eq + 1)
    })
  }
  if (existing) add(existing)
  if (additional) add(additional)
  return Object.entries(jar).map(([k, v]) => `${k}=${v}`).join('; ')
}

async function createSession () {
  const res = await axios.get(HOME_URL, {
    timeout: 20000,
    headers: { 'User-Agent': USER_AGENT, Accept: 'text/html' },
    maxRedirects: 3
  })

  let cookieHeader = parseSetCookie(res.headers['set-cookie'])
  const $ = cheerio.load(res.data)
  const appToken = $('#app_token').val() || ''

  const captchaRes = await axios.get(`${ECOURTS_BASE}/vendor/securimage/securimage_show.php`, {
    timeout: 15000,
    responseType: 'arraybuffer',
    headers: {
      'User-Agent': USER_AGENT,
      Cookie: cookieHeader,
      Referer: HOME_URL
    }
  })

  cookieHeader = mergeCookies(cookieHeader, parseSetCookie(captchaRes.headers['set-cookie']))

  const sessionId = randomUUID()
  const captchaImageBase64 = Buffer.from(captchaRes.data).toString('base64')

  sessions.set(sessionId, {
    cookieHeader,
    appToken,
    createdAt: Date.now()
  })

  return {
    sessionId,
    captchaImageBase64,
    captchaImageUrl: `data:image/jpeg;base64,${captchaImageBase64}`
  }
}

function getSession (sessionId) {
  const session = sessions.get(sessionId)
  if (!session) return null
  if (Date.now() - session.createdAt > SESSION_TTL_MS) {
    sessions.delete(sessionId)
    return null
  }
  return session
}

function parseCaseDetailsFromHtml (html) {
  const $ = cheerio.load(html || '')
  const fields = []

  $('.case_details_table, .table-r, table').each((_, table) => {
    $(table).find('span, tr').each((__, row) => {
      const text = $(row).text().replace(/\s+/g, ' ').trim()
      if (!text || text.length < 3) return
      const parts = text.split(':')
      if (parts.length >= 2) {
        const label = parts[0].trim()
        const value = parts.slice(1).join(':').trim()
        if (label && value && label.length < 80) {
          fields.push({ label, value })
        }
      }
    })
  })

  const title = $('h2.h2class, h2, .heading h2').first().text().trim() || null

  return {
    title,
    fields: fields.slice(0, 40)
  }
}

async function searchByCnr ({ sessionId, cnr, captcha }) {
  const session = getSession(sessionId)
  if (!session) {
    return { ok: false, errorCode: 'SESSION_EXPIRED', message: 'Captcha session expired. Please refresh captcha and try again.' }
  }

  const body = new URLSearchParams({
    cino: String(cnr).toUpperCase(),
    fcaptcha_code: String(captcha || '').trim(),
    ajax_req: 'true',
    app_token: session.appToken || ''
  })

  const res = await axios.post(SEARCH_URL, body.toString(), {
    timeout: 25000,
    headers: {
      'User-Agent': USER_AGENT,
      'Content-Type': 'application/x-www-form-urlencoded',
      Cookie: session.cookieHeader,
      Referer: HOME_URL,
      Accept: 'application/json, text/javascript, */*; q=0.01',
      'X-Requested-With': 'XMLHttpRequest'
    },
    validateStatus: () => true
  })

  let data = res.data
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data)
    } catch {
      return { ok: false, errorCode: 'PARSE_ERROR', message: 'Unexpected response from eCourts. Try again.' }
    }
  }

  if (data.errormsg) {
    const needsNewCaptcha = /captcha/i.test(data.errormsg)
    if (needsNewCaptcha) {
      try {
        const fresh = await createSession()
        return {
          ok: false,
          errorCode: 'INVALID_CAPTCHA',
          message: data.errormsg.trim(),
          ...fresh
        }
      } catch {
        return { ok: false, errorCode: 'INVALID_CAPTCHA', message: data.errormsg.trim() }
      }
    }
    return { ok: false, errorCode: 'ECOURTS_ERROR', message: data.errormsg.trim() }
  }

  if (data.status === 0 || !data.casetype_list) {
    return {
      ok: false,
      errorCode: 'NOT_FOUND',
      message: 'No case found for this CNR on eCourts, or the CNR is invalid.'
    }
  }

  const parsed = parseCaseDetailsFromHtml(data.casetype_list)

  return {
    ok: true,
    snapshot: {
      source: 'ecourts',
      cnr: String(cnr).toUpperCase(),
      officialUrl: HOME_URL,
      caseTitle: parsed.title,
      caseDetails: parsed.fields,
      rawHtml: data.casetype_list,
      disclaimer: 'Case status from official eCourts Services (Government of India). Verify on the eCourts portal before relying on this information.'
    }
  }
}

function cleanupSessions () {
  const now = Date.now()
  for (const [id, s] of sessions.entries()) {
    if (now - s.createdAt > SESSION_TTL_MS) sessions.delete(id)
  }
}

setInterval(cleanupSessions, 5 * 60 * 1000).unref()

module.exports = {
  createSession,
  searchByCnr,
  officialEcourtsUrl: () => HOME_URL
}
