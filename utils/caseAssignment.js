const Helper = require('./helper')
const config = require('../utils/caseAssignmentConfig')
const errorCodes = require('../utils/errors/errorCodes')
const { createError } = require('../utils/errors')

class CaseAssignmentService {
  constructor ({ prisma }) {
    this.prisma = prisma
  }

  async assign (caseData) {
    const { clientLanguage, clientState } = caseData

    return this.prisma.$transaction(async (tx) => {
      const mediators = await this.fetchMediators(tx)

      if (!mediators.length) {
        await this.notifyAdminNoMediator(tx, caseData)
        throw createError(errorCodes.NO_ACTIVE_MEDIATOR)
      }

      const loadMap = await this.getActiveCaseCounts(tx)
      let selected = null

      // Capacity loop: 5 → 9
      for (let max = config.MAX_CASES; max <= 9; max++) {
      // Step 1: filter by capacity
        const capacityPool = mediators.filter(u => {
          const count = loadMap[u.id] || 0
          return count < max
        })

        if (!capacityPool.length) continue

        // Step 2: language match OR fallback to English
        const lang = (clientLanguage || '').toLowerCase()

        let languagePool = capacityPool.filter(u =>
          u.languages.map(l => l.toLowerCase()).includes(lang)
        )

        if (!languagePool.length) {
          languagePool = capacityPool.filter(u =>
            u.languages.map(l => l.toLowerCase())
              .includes(config.FALLBACK_LANGUAGE))
        }

        if (!languagePool.length) continue

        // Step 3: state is preference (not mandatory)
        let finalPool = languagePool

        const stateMatched = languagePool.filter(
          u => u.state === clientState
        )

        if (stateMatched.length) {
          finalPool = stateMatched
        }

        // Step 4: round robin selection
        const state = await this.getAssignmentState(tx)

        selected = this.getNextRoundRobinUser(
          finalPool,
          state.last_assigned_user_id
        )

        if (selected) {
          await this.updateAssignmentState(tx, selected.id)
          break
        }
      }

      // Step 5: fallback if nothing found
      if (!selected) {
        await this.notifyAdminNoMediator(tx, caseData)
        throw createError(errorCodes.ADMIN_NOTIFIED_FOR_MEDIATOR)
      }

      return {
        case: caseData,
        assignedTo: selected
      }
    })
  }

  async fetchMediators (tx) {
    const users = await tx.user.findMany({
      where: {
        user_type: 'MEDIATOR',
        active: true
      },
      orderBy: { created_at: 'asc' }
    })

    return users.map(u => ({
      ...u,
      languages: this.safeJsonParse(u.preferred_languages)
    }))
  }

  async notifyAdminNoMediator (tx, caseData) {
    const admins = await tx.user.findMany({
      where: {
        user_type: 'ADMIN',
        active: true
      },
      select: { email: true, name: true }
    })

    // Assuming you already have email helper
    await Helper.sendEmail('Team', [...admins.map(a => a.email)], 'Mediator Not Available - Need manual intervention',
       `<p>No mediator could be auto-assigned for case <strong>${caseData.caseId}</strong>. Please assign manually from admin panel.</p>`
    )
  }

  safeJsonParse (value) {
    try {
      return JSON.parse(value || '[]')
    } catch {
      return []
    }
  }

  // --------------------------
  // Load calculation
  // --------------------------

  async getActiveCaseCounts (tx) {
    const rows = await tx.cases.groupBy({
      by: ['mediator'],
      _count: true,
      where: {
        status: { in: config.ACTIVE_STATUSES }
      }
    })

    return Object.fromEntries(
      rows.map(r => [r.mediator, r._count])
    )
  }

  filterByCapacity (users, loadMap) {
    return users.filter(u => {
      const count = loadMap[u.id] || 0
      return count < config.MAX_CASES
    })
  }

  // --------------------------
  // Language logic
  // --------------------------

  filterByLanguage (users, clientLanguage) {
    const lang = (clientLanguage || '').toLowerCase()

    let matched = users.filter(u =>
      u.languages.map(l => l.toLowerCase()).includes(lang)
    )

    if (!matched.length) {
      matched = users.filter(u =>
        u.languages.map(l => l.toLowerCase())
          .includes(config.FALLBACK_LANGUAGE)
      )
    }

    return matched
  }

  // --------------------------
  // State preference
  // --------------------------

  applyStatePreference (users, clientState) {
    if (!clientState || users.length <= config.STATE_PREFERENCE_THRESHOLD) {
      return users
    }

    const stateMatched = users.filter(
      u => u.state === clientState
    )

    return stateMatched.length ? stateMatched : users
  }

  // --------------------------
  // Round robin (cursor-based)
  // --------------------------

  getNextRoundRobinUser (pool, lastUserId) {
    if (!lastUserId) return pool[0]

    const index = pool.findIndex(u => u.id === lastUserId)

    if (index === -1) return pool[0]

    return pool[(index + 1) % pool.length]
  }

  async getAssignmentState (tx) {
    const CATEGORY_ID = config.CATEGORY.MEDIATION

    let state = await tx.case_assignment_state.findUnique({
      where: { id: CATEGORY_ID }
    })

    if (!state) {
      state = await tx.case_assignment_state.create({
        data: {
          id: CATEGORY_ID,
          last_assigned_user_id: null
        }
      })
    }

    return state
  }

  async updateAssignmentState (tx, userId) {
    const CATEGORY_ID = config.CATEGORY.MEDIATION

    return tx.case_assignment_state.update({
      where: { id: CATEGORY_ID },
      data: { last_assigned_user_id: userId }
    })
  }
}

module.exports = CaseAssignmentService
