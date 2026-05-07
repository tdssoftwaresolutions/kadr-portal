const Helper = require('./helper')
const config = require('../utils/caseAssignmentConfig')
const errorCodes = require('../utils/errors/errorCodes')
const { createError } = require('../utils/errors')

/**
  1. We only consider active mediators (inactive accounts are ignored).
  2. When a new case arrives, we first look for mediators who currently have fewer than 5 active cases.
  3. If nobody is available under 5, we gradually relax the limit to 6, then 7, then 8, then 9.
  4. Within the available group, we give priority in this order:
    4.1. mediator matching both language and state
    4.2. then language match
    4.3. then state match
    4.4. then English fallback
    4.5. then anyone available
  5. Among the final eligible mediators, we assign to the one with the lowest current workload.
  6. If multiple mediators have the same low workload, we rotate fairly using round-robin so chances are balanced.
  7. If no one is available even after relaxing up to 9, the system alerts admins for manual assignment.

  In one line: we try to match case needs (language/state), keep workloads balanced, and distribute cases fairly.
**/
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

        // Step 2: find preference pools (language/state), but keep fallback options
        const preferredPool = this.buildPreferredPool(
          capacityPool,
          clientLanguage,
          clientState
        )

        if (!preferredPool.length) continue

        // Step 3: pick least loaded mediator; RR only for ties
        const state = await this.getAssignmentState(tx)
        const lastAssignedUserMeta = await this.getUserMetaById(
          tx,
          state.last_assigned_user_id
        )

        selected = this.pickLeastLoadedWithRoundRobinTieBreak(
          preferredPool,
          loadMap,
          state.last_assigned_user_id,
          lastAssignedUserMeta
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

  buildPreferredPool (users, clientLanguage, clientState) {
    const lang = (clientLanguage || '').toLowerCase()
    const hasLanguage = (user, language) => {
      if (!language) return false
      return user.languages.map(l => l.toLowerCase()).includes(language)
    }

    const stateMatched = users.filter(u => u.state === clientState)
    const langMatched = users.filter(u => hasLanguage(u, lang))
    const bothMatched = users.filter(
      u => hasLanguage(u, lang) && u.state === clientState
    )
    const fallbackLangMatched = users.filter(
      u => hasLanguage(u, config.FALLBACK_LANGUAGE)
    )

    // Preference order:
    // 1) language + state
    // 2) language
    // 3) state
    // 4) fallback language
    // 5) any capacity-eligible mediator
    if (bothMatched.length) return bothMatched
    if (langMatched.length) return langMatched
    if (stateMatched.length) return stateMatched
    if (fallbackLangMatched.length) return fallbackLangMatched
    return users
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

  getNextRoundRobinUser (pool, lastUserId, lastUserMeta = null) {
    if (!lastUserId) return pool[0]

    const index = pool.findIndex(u => u.id === lastUserId)

    if (index === -1) {
      if (!lastUserMeta?.created_at) return pool[0]

      const lastCreatedAt = new Date(lastUserMeta.created_at).getTime()
      const nextByOrder = pool.find(
        u => new Date(u.created_at).getTime() > lastCreatedAt
      )

      return nextByOrder || pool[0]
    }

    return pool[(index + 1) % pool.length]
  }

  pickLeastLoadedWithRoundRobinTieBreak (pool, loadMap, lastUserId, lastUserMeta) {
    if (!pool.length) return null

    const minLoad = Math.min(...pool.map(u => loadMap[u.id] || 0))
    const minLoadPool = pool.filter(u => (loadMap[u.id] || 0) === minLoad)

    return this.getNextRoundRobinUser(minLoadPool, lastUserId, lastUserMeta)
  }

  async getUserMetaById (tx, userId) {
    if (!userId) return null

    return tx.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        created_at: true
      }
    })
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
