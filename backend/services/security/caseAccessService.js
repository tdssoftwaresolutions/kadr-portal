const prisma = require('../../lib/prisma.js')
const { createError } = require('../../utils/errors')
const errorCodes = require('../../utils/errors/errorCodes')

async function loadCaseAccess (caseId) {
  if (!caseId) return null
  return prisma.cases.findUnique({
    where: { id: caseId },
    select: {
      id: true,
      caseId: true,
      first_party: true,
      second_party: true,
      mediator: true
    }
  })
}

function isCaseParty (caseRow, userId) {
  if (!caseRow || !userId) return false
  return caseRow.first_party === userId || caseRow.second_party === userId
}

function isCaseMediator (caseRow, userId) {
  return Boolean(caseRow && userId && caseRow.mediator === userId)
}

function isCaseParticipant (caseRow, userId) {
  return isCaseParty(caseRow, userId) || isCaseMediator(caseRow, userId)
}

async function assertCaseAccess (user, caseId, { allowAdmin = true, requireMediator = false } = {}) {
  if (!user?.id) throw createError(errorCodes.UNAUTHORIZED)
  const caseRow = await loadCaseAccess(caseId)
  if (!caseRow) throw createError(errorCodes.CASE_NOT_FOUND)

  if (allowAdmin && user.type === 'ADMIN') return caseRow
  if (requireMediator) {
    if (isCaseMediator(caseRow, user.id)) return caseRow
    throw createError(errorCodes.FORBIDDEN)
  }
  if (isCaseParticipant(caseRow, user.id)) return caseRow
  throw createError(errorCodes.FORBIDDEN)
}

async function assertCaseAccessFromRequest (req, caseId, options = {}) {
  return assertCaseAccess(req.user, caseId, options)
}

async function assertNoteOwnership (userId, noteId) {
  const note = await prisma.notes.findUnique({
    where: { id: noteId },
    select: { id: true, user_id: true }
  })
  if (!note) throw createError(errorCodes.NOT_FOUND)
  if (note.user_id !== userId) throw createError(errorCodes.FORBIDDEN)
  return note
}

function requireCaseAccessMiddleware (options = {}) {
  return async (req, res, next) => {
    try {
      const caseId = req.body?.caseId || req.query?.caseId || req.params?.caseId
      if (!caseId) throw createError(errorCodes.REQUIRED_CASE_ID)
      req.caseAccess = await assertCaseAccessFromRequest(req, caseId, options)
      next()
    } catch (err) {
      next(err)
    }
  }
}

module.exports = {
  loadCaseAccess,
  isCaseParty,
  isCaseMediator,
  isCaseParticipant,
  assertCaseAccess,
  assertCaseAccessFromRequest,
  assertNoteOwnership,
  requireCaseAccessMiddleware
}
