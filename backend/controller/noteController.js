const prisma = require('../lib/prisma.js')
const errorCodes = require('../utils/errors/errorCodes')
const { createError } = require('../utils/errors')
const { success } = require('../utils/responses')
const { assertNoteOwnership } = require('../services/security/caseAccessService')

module.exports = {
  saveNote: async function (req, res, next) {
    try {
      const { content, id } = req.body
      const user = req.user
      if (id) {
        await assertNoteOwnership(user.id, id)
      }
      const response = await prisma.notes.upsert({
        where: { id: id || '-1' },
        update: { note_text: content },
        create: { note_text: content, user_id: user.id }
      })
      success(res, { noteId: response.id }, 'Your note has been successfully saved!')
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
