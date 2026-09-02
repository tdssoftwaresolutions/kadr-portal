const axios = require('axios')
const { createError } = require('../../utils/errors')
const errorCodes = require('../../utils/errors/errorCodes')

const API_BASE = (process.env.ECOURTS_INDIA_API_URL || 'https://webapi.ecourtsindia.com').replace(/\/$/, '')
const OFFICIAL_ECOURTS_URL = 'https://services.ecourts.gov.in/ecourtindia_v6/?p=home/index'

function getApiKey () {
  const key = process.env.ECOURTS_INDIA_API_KEY
  if (!key || !String(key).trim()) {
    throw createError(errorCodes.ECOURTS_API_NOT_CONFIGURED)
  }
  return String(key).trim()
}

function pushField (rows, label, value) {
  if (value === undefined || value === null || value === '') return
  if (Array.isArray(value)) {
    if (!value.length) return
    rows.push({ label, value: value.join(', ') })
    return
  }
  rows.push({ label, value: String(value) })
}

function formatPartnerCase (apiBody, cnr) {
  const root = apiBody && apiBody.data ? apiBody.data : apiBody
  const c = root && root.courtCaseData
  if (!c) {
    throw createError(errorCodes.COURT_CASE_FETCH_FAILED)
  }

  const petitioners = c.petitioners || []
  const respondents = c.respondents || []
  const petitionerAdvocates = c.petitionerAdvocates || []
  const respondentAdvocates = c.respondentAdvocates || []
  const judges = c.judges || []

  const petitionersLabel = petitioners.join(', ') || '—'
  const respondentsLabel = respondents.join(', ') || '—'
  const caseTitle = `${petitionersLabel} vs ${respondentsLabel}`
  const caseNumber = c.registrationNumber || c.caseNumber || c.filingNumber || c.cnr || cnr

  const caseDetails = []
  pushField(caseDetails, 'CNR', c.cnr || cnr)
  pushField(caseDetails, 'Case status', c.caseStatus)
  pushField(caseDetails, 'Case type', c.caseTypeRaw || c.caseType)
  pushField(caseDetails, 'Court', c.courtName)
  pushField(caseDetails, 'District', c.district)
  pushField(caseDetails, 'State', c.state)
  pushField(caseDetails, 'Filing number', c.filingNumber)
  pushField(caseDetails, 'Filing date', c.filingDate)
  pushField(caseDetails, 'Registration number', c.registrationNumber)
  pushField(caseDetails, 'Registration date', c.registrationDate)
  pushField(caseDetails, 'First hearing', c.firstHearingDate)
  pushField(caseDetails, 'Next hearing', c.nextHearingDate)
  pushField(caseDetails, 'Last hearing', c.lastHearingDate)
  pushField(caseDetails, 'Decision date', c.decisionDate)
  pushField(caseDetails, 'Disposal type', c.disposalType || c.disposalTypeRaw)
  pushField(caseDetails, 'Purpose', c.purpose)
  pushField(caseDetails, 'Petitioner(s)', petitioners)
  pushField(caseDetails, 'Petitioner advocate(s)', petitionerAdvocates)
  pushField(caseDetails, 'Respondent(s)', respondents)
  pushField(caseDetails, 'Respondent advocate(s)', respondentAdvocates)
  pushField(caseDetails, 'Judges', judges)

  const hearingHistory = (c.historyOfCaseHearings || []).map((h) => ({
    judge: h.judge || '—',
    businessOnDate: h.businessOnDate || null,
    hearingDate: h.hearingDate || null,
    purposeOfListing: h.purposeOfListing || '—'
  }))

  const orders = (c.judgmentOrders || []).map((o, idx) => ({
    id: `order-${idx}`,
    orderDate: o.orderDate || null,
    orderType: o.orderType || 'Copy of Order',
    orderUrl: o.orderUrl || null,
    label: o.orderType ? `Order — ${o.orderType}` : 'Copy of Order'
  }))

  const profile = {
    courtName: c.courtName || null,
    judge: judges.length ? judges.join(', ') : null,
    caseType: c.caseTypeRaw || c.caseType || null,
    registrationNumber: c.registrationNumber || null,
    filingNumber: c.filingNumber || null,
    cnr: (c.cnr || cnr).toUpperCase(),
    caseCategory: c.caseTypeSub || c.caseCategoryFacetPath || null,
    caseStatus: c.caseStatus || null,
    disposalType: c.disposalType || c.disposalTypeRaw || null,
    decisionDate: c.decisionDate || null,
    purpose: c.purpose || null
  }

  return {
    source: 'ecourtsindia_partner',
    cnr: profile.cnr,
    caseNumber: caseNumber ? String(caseNumber) : null,
    officialUrl: OFFICIAL_ECOURTS_URL,
    caseTitle,
    caseStatus: profile.caseStatus,
    courtName: profile.courtName,
    profile,
    parties: {
      petitioners,
      petitionerAdvocates,
      respondents,
      respondentAdvocates
    },
    orders,
    caseDetails,
    hearingHistory,
    disclaimer: 'Case data from eCourts India (official court records). Verify on the government eCourts portal when needed.'
  }
}

async function fetchCaseByCnr (cnr) {
  const apiKey = getApiKey()
  const normalized = String(cnr).trim().toUpperCase()

  try {
    const { data } = await axios.get(`${API_BASE}/api/partner/case/${encodeURIComponent(normalized)}`, {
      timeout: 30000,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json'
      }
    })
    return formatPartnerCase(data, normalized)
  } catch (err) {
    const status = err.response && err.response.status
    const msg = err.response && err.response.data && (err.response.data.message || err.response.data.error)
    if (status === 404) {
      throw createError(errorCodes.COURT_CASE_NOT_FOUND)
    }
    if (status === 401 || status === 403) {
      throw createError(errorCodes.ECOURTS_API_NOT_CONFIGURED)
    }
    const fail = createError(errorCodes.COURT_CASE_FETCH_FAILED)
    if (msg) fail.message = String(msg)
    throw fail
  }
}

module.exports = {
  fetchCaseByCnr,
  officialEcourtsUrl: () => OFFICIAL_ECOURTS_URL
}
