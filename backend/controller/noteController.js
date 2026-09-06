const prisma = require('../lib/prisma.js')
const errorCodes = require('../utils/errors/errorCodes')
const { createError } = require('../utils/errors')
const { success } = require('../utils/responses')
const { assertNoteOwnership, assertCaseAccess } = require('../services/security/caseAccessService')

module.exports = {
  saveNote: async function (req, res, next) {
    try {
      const { content, id } = req.body
      const caseId = req.body.case_id || req.body.caseId || null
      const user = req.user
      if (id) {
        await assertNoteOwnership(user.id, id)
      }
      // Case-scoped notes are private to the assigned mediator (or admin).
      if (caseId) {
        await assertCaseAccess(user, caseId, { requireMediator: true })
      }
      const response = await prisma.notes.upsert({
        where: { id: id || '-1' },
        update: { note_text: content },
        create: { note_text: content, user_id: user.id, case_id: caseId }
      })
      success(res, { noteId: response.id }, 'Your note has been successfully saved!')
    } catch (error) {
      next(error)
    }
  },

  getCaseNote: async function (req, res, next) {
    try {
      const user = req.user
      const caseId = req.query.caseId || req.query.case_id || req.body?.caseId
      if (!caseId) throw createError(errorCodes.REQUIRED_CASE_ID)
      await assertCaseAccess(user, caseId, { requireMediator: true })
      const note = await prisma.notes.findFirst({
        where: { user_id: user.id, case_id: caseId },
        select: { id: true, note_text: true },
        orderBy: { updated: 'desc' }
      })
      success(res, { note: note || null }, 'Case note fetched')
    } catch (error) {
      next(error)
    }
  },

  deleteNote: async function (req, res, next) {
    try {
      const { id } = req.body
      if (!id) throw createError(errorCodes.MISSING_FIELD)
      await assertNoteOwnership(req.user.id, id)
      await prisma.notes.delete({ where: { id } })
      success(res, {}, 'Your note has been deleted successfully!')
    } catch (error) {
      next(error)
    }
  }
}
