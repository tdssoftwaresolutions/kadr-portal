const prisma = require('../lib/prisma.js')
const errorCodes = require('../utils/errors/errorCodes')
const { createError } = require('../utils/errors')
const { success } = require('../utils/responses')
const { CaseSubTypes } = require('../utils/caseConstants')
const { assertAdminPage } = require('../utils/adminPermissionHelpers')
const { sendNoticeEmailsToSecondParty } = require('../services/case/noticeEmailService')
const { parsePagination, paginatedResponse } = require('../utils/pagination')

const REASONS = ['typo', 'wrong_person', 'other']

// A correction request is only valid while the second party hasn't taken
// ownership of the placeholder account yet — once they self-sign-up, that
// email is their own login credential, and only they (or a direct admin
// support flow, not first-party-initiated) should be able to change it.
async function loadEligibleCase (caseId, requesterId) {
  const caseRecord = await prisma.cases.findUnique({
    where: { id: caseId },
    select: {
      id: true,
      caseId: true,
      first_party: true,
      second_party: true,
      sub_status: true,
      user_cases_second_partyTouser: {
        select: { id: true, name: true, email: true, active: true, is_self_signed_up: true }
      }
    }
  })
  if (!caseRecord) throw createError(errorCodes.CASE_NOT_FOUND)
  if (caseRecord.first_party !== requesterId) throw createError(errorCodes.FORBIDDEN)
  if (caseRecord.sub_status !== CaseSubTypes.NOTICE_SENT_TO_OPPOSITE_PARTY) {
    throw createError(errorCodes.INVALID_REQUEST, { message: 'A correction request can only be made while the notice is pending the other party\'s response.' })
  }
  if (caseRecord.user_cases_second_partyTouser?.is_self_signed_up) {
    throw createError(errorCodes.INVALID_REQUEST, { message: 'The other party has already joined the platform — this can no longer be changed this way.' })
  }
  return caseRecord
}

module.exports = {
  createRequest: async function (req, res, next) {
    try {
      const { caseId, requestedEmail, reason, reasonDetail } = req.body
      if (!caseId || !requestedEmail || !reason) throw createError(errorCodes.MISSING_REQUIRED_DETAIL)
      if (!REASONS.includes(reason)) throw createError(errorCodes.INVALID_REQUEST)
      const normalizedEmail = String(requestedEmail).trim().toLowerCase()
      const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
      if (!emailPattern.test(normalizedEmail)) throw createError(errorCodes.INVALID_EMAIL_FORMAT)

      const caseRecord = await loadEligibleCase(caseId, req.user.id)

      const requestRow = await prisma.email_correction_requests.create({
        data: {
          case_id: caseRecord.id,
          requested_by: req.user.id,
          party_side: 'second_party',
          current_email: caseRecord.user_cases_second_partyTouser?.email || '',
          requested_email: normalizedEmail,
          reason,
          reason_detail: reasonDetail || null,
          status: 'pending'
        }
      })

      success(res, { requestId: requestRow.id }, 'Thanks — we\'ll review this and get back to you.')
    } catch (error) {
      next(error)
    }
  },

  listRequests: async function (req, res, next) {
    try {
      if (req.user.type !== 'ADMIN') throw createError(errorCodes.FORBIDDEN)
      await assertAdminPage(req, 'email-corrections')
      const { page, perPage, skip } = parsePagination(req.query)
      const status = req.query.status || undefined

      const where = status ? { status } : {}
      const [rows, total] = await prisma.$transaction([
        prisma.email_correction_requests.findMany({
          where,
          orderBy: { created_at: 'desc' },
          skip,
          take: perPage
        }),
        prisma.email_correction_requests.count({ where })
      ])

      const caseIds = [...new Set(rows.map((r) => r.case_id))]
      const requesterIds = [...new Set(rows.map((r) => r.requested_by))]
      const [cases, requesters] = await Promise.all([
        prisma.cases.findMany({ where: { id: { in: caseIds } }, select: { id: true, caseId: true, category: true } }),
        prisma.user.findMany({ where: { id: { in: requesterIds } }, select: { id: true, name: true, email: true } })
      ])
      const caseMap = new Map(cases.map((c) => [c.id, c]))
      const requesterMap = new Map(requesters.map((u) => [u.id, u]))

      const items = rows.map((r) => ({
        ...r,
        case: caseMap.get(r.case_id) || null,
        requester: requesterMap.get(r.requested_by) || null
      }))

      success(res, paginatedResponse(items, total, { page, perPage }))
    } catch (error) {
      next(error)
    }
  },

  approveRequest: async function (req, res, next) {
    try {
      if (req.user.type !== 'ADMIN') throw createError(errorCodes.FORBIDDEN)
      await assertAdminPage(req, 'email-corrections')
      const { id } = req.params

      const request = await prisma.email_correction_requests.findUnique({ where: { id } })
      if (!request) throw createError(errorCodes.NOT_FOUND)
      if (request.status !== 'pending') throw createError(errorCodes.INVALID_REQUEST, { message: 'This request has already been reviewed.' })

      // Re-validate the same eligibility gate at approval time — a stale request
      // could otherwise be approved after the second party already signed up.
      const caseRecord = await loadEligibleCase(request.case_id, request.requested_by)

      const updatedUser = await prisma.user.update({
        where: { id: caseRecord.user_cases_second_partyTouser.id },
        data: { email: request.requested_email },
        select: { id: true, name: true, email: true }
      })

      await prisma.email_correction_requests.update({
        where: { id },
        data: { status: 'approved', reviewed_by: req.user.id, reviewed_at: new Date() }
      })

      // Re-send the two-part notice (details + join-link) to the corrected
      // address, same content/shape/CC pattern as the original dispatch.
      const fullCase = await prisma.cases.findUnique({
        where: { id: caseRecord.id },
        select: {
          caseId: true,
          case_type: true,
          category: true,
          description: true,
          evidence_document_url: true,
          user_cases_first_partyTouser: { select: { name: true, email: true } }
        }
      })
      await sendNoticeEmailsToSecondParty({
        caseId: caseRecord.id,
        caseDetails: {
          ...fullCase,
          user_cases_second_partyTouser: updatedUser
        }
      })

      success(res, {}, 'Email address corrected and notice re-sent.')
    } catch (error) {
      if (error?.code === 'P2002') {
        next(createError(errorCodes.USER_ALREADY_EXISTS))
        return
      }
      next(error)
    }
  },

  rejectRequest: async function (req, res, next) {
    try {
      if (req.user.type !== 'ADMIN') throw createError(errorCodes.FORBIDDEN)
      await assertAdminPage(req, 'email-corrections')
      const { id } = req.params
      const { adminNote } = req.body

      const request = await prisma.email_correction_requests.findUnique({ where: { id } })
      if (!request) throw createError(errorCodes.NOT_FOUND)
      if (request.status !== 'pending') throw createError(errorCodes.INVALID_REQUEST, { message: 'This request has already been reviewed.' })

      await prisma.email_correction_requests.update({
        where: { id },
        data: { status: 'rejected', reviewed_by: req.user.id, reviewed_at: new Date(), admin_note: adminNote || null }
      })

      success(res, {}, 'Request rejected.')
    } catch (error) {
      next(error)
    }
  }
}
