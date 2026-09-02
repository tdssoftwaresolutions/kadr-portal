const prisma = require('../lib/prisma.js')
const { success } = require('../utils/responses')
const { assertAdminPage } = require('../utils/adminPermissionHelpers')
const { parsePagination, parseDateRange, paginatedResponse } = require('../utils/pagination')

const calendarEventSelect = {
  id: true,
  title: true,
  description: true,
  start_datetime: true,
  end_datetime: true,
  type: true,
  meeting_link: true,
  meeting_summary: true,
  mediator_next_steps: true,
  first_party_next_steps: true,
  second_party_next_steps: true,
  first_party_rating: true,
  second_party_rating: true,
  mediator_feedback_at: true,
  first_party_feedback_at: true,
  second_party_feedback_at: true,
  cases: {
    select: {
      id: true,
      first_party: true,
      second_party: true,
      mediator: true,
      caseId: true
    }
  }
}

module.exports = {
  calendarEventSelect,

  getCalendarInit: async function (req, res, next) {
    try {
      const { page, perPage, skip, take } = parsePagination(req.query, { defaultPerPage: 100, maxPerPage: 500 })
      const { start, end } = parseDateRange(req.query)
      const dateFilter = (start || end)
        ? {
            start_datetime: {
              ...(start ? { gte: start } : {}),
              ...(end ? { lte: end } : {})
            }
          }
        : {}

      if (req.user.type === 'ADMIN') {
        await assertAdminPage(req, 'calendar')
        const where = { ...dateFilter }
        const [events, total] = await prisma.$transaction([
          prisma.events.findMany({
            where,
            orderBy: { start_datetime: 'asc' },
            skip,
            take,
            select: calendarEventSelect
          }),
          prisma.events.count({ where })
        ])
        success(res, { events, ...paginatedResponse(events, total, { page, perPage }) })
        return
      }

      const where = {
        ...dateFilter,
        OR: [
          { created_by: req.user.id },
          {
            cases: {
              OR: [
                { first_party: req.user.id },
                { second_party: req.user.id },
                { mediator: req.user.id }
              ]
            }
          }
        ]
      }
      const [events, total] = await prisma.$transaction([
        prisma.events.findMany({
          where,
          orderBy: { start_datetime: 'asc' },
          skip,
          take,
          select: calendarEventSelect
        }),
        prisma.events.count({ where })
      ])
      success(res, { events, ...paginatedResponse(events, total, { page, perPage }) })
    } catch (error) {
      next(error)
    }
  }
}
