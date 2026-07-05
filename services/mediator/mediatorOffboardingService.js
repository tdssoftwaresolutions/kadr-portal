const prisma = require('../../lib/prisma')
const CaseAssignmentService = require('../../utils/caseAssignment')
const { CaseTypes, CaseSubTypes } = require('../../utils/caseConstants')
const { getOrCreateSettings, settingsToMap } = require('../invoice/invoiceService')
const { recordCaseMilestone } = require('../case/caseMilestoneService')
const helper = require('../../utils/helper')
const { createError } = require('../../utils/errors')
const errorCodes = require('../../utils/errors/errorCodes')
const { adminHasPage } = require('../../utils/adminPermissionHelpers')

const ACTIVE_STATUSES = [CaseTypes.NEW, CaseTypes.IN_PROGRESS]

async function getActiveCasesForMediator (mediatorId) {
  return prisma.cases.findMany({
    where: {
      mediator: mediatorId,
      status: { in: ACTIVE_STATUSES }
    },
    select: {
      id: true,
      caseId: true,
      status: true,
      category: true,
      first_party: true,
      second_party: true,
      user_cases_first_partyTouser: {
        select: { id: true, name: true, email: true, preferred_languages: true, state: true }
      },
      user_cases_second_partyTouser: {
        select: { id: true, name: true, email: true }
      }
    },
    orderBy: { updated_at: 'desc' }
  })
}

async function suggestMediatorForCase (caseRow, excludeMediatorId) {
  const service = new CaseAssignmentService({ prisma })
  try {
    const lang = caseRow.user_cases_first_partyTouser?.preferred_languages
    const response = await service.assign({
      caseId: caseRow.caseId,
      clientLanguage: lang,
      clientState: caseRow.user_cases_first_partyTouser?.state,
      category: caseRow.category,
      excludeMediatorIds: [excludeMediatorId]
    })
    return response.assignedTo
  } catch {
    return null
  }
}

async function reassignCase ({
  caseId,
  departingMediatorId,
  newMediatorId = null,
  triggerType,
  tx = null
}) {
  const db = tx || prisma
  const caseRow = await db.cases.findUnique({
    where: { id: caseId },
    select: {
      id: true,
      caseId: true,
      mediator: true,
      status: true,
      category: true,
      mediator_commission: true,
      first_party: true,
      second_party: true,
      user_cases_first_partyTouser: {
        select: { name: true, email: true, preferred_languages: true, state: true }
      },
      user_cases_second_partyTouser: { select: { name: true, email: true } }
    }
  })
  if (!caseRow || caseRow.mediator !== departingMediatorId) {
    throw createError(errorCodes.INVALID_REQUEST)
  }

  let assigned = null
  if (newMediatorId) {
    const m = await db.user.findUnique({
      where: { id: newMediatorId },
      select: { id: true, user_type: true, active: true, is_deleted: true, name: true, email: true }
    })
    if (!m || m.user_type !== 'MEDIATOR' || !m.active || m.is_deleted) {
      throw createError(errorCodes.NOT_FOUND)
    }
    assigned = m
  } else {
    const service = new CaseAssignmentService({ prisma: db })
    const response = await service.assign({
      caseId: caseRow.caseId,
      clientLanguage: caseRow.user_cases_first_partyTouser?.preferred_languages,
      clientState: caseRow.user_cases_first_partyTouser?.state,
      category: caseRow.category,
      excludeMediatorIds: [departingMediatorId]
    })
    assigned = response.assignedTo
  }

  const settingsRows = await getOrCreateSettings()
  const settingsMap = settingsToMap(settingsRows)

  await db.cases.update({
    where: { id: caseId },
    data: {
      mediator: assigned.id,
      mediator_commission: caseRow.mediator_commission || Number(settingsMap.mediator_commission || 5),
      status: CaseTypes.IN_PROGRESS,
      sub_status: CaseSubTypes.MEDIATOR_ASSIGNED
    }
  })

  await recordCaseMilestone(db, { caseId, subStatusId: CaseSubTypes.MEDIATOR_ASSIGNED })

  await db.mediator_offboarding_events.create({
    data: {
      mediator_id: departingMediatorId,
      case_id: caseId,
      trigger_type: triggerType,
      old_mediator_id: departingMediatorId,
      new_mediator_id: assigned.id,
      notes: newMediatorId ? 'Manual reassignment during offboarding' : 'Auto reassignment during offboarding'
    }
  })

  const label = caseRow.caseId || 'your case'
  const title = 'Mediator change on your case'
  const description = `A new dispute resolution expert (${assigned.name}) has been assigned to case ${label}.`
  const notifications = []
  if (caseRow.first_party) {
    notifications.push(db.notifications.create({ data: { user_id: caseRow.first_party, title, description } }))
  }
  if (caseRow.second_party) {
    notifications.push(db.notifications.create({ data: { user_id: caseRow.second_party, title, description } }))
  }
  notifications.push(db.notifications.create({
    data: {
      user_id: assigned.id,
      title: 'New case assignment',
      description: `You have been assigned to case ${label} (reassigned from another mediator).`
    }
  }))
  await Promise.all(notifications)

  return { caseId, newMediator: assigned }
}

async function getOffboardingPreview (mediatorId) {
  const mediator = await prisma.user.findUnique({
    where: { id: mediatorId },
    select: {
      id: true,
      name: true,
      email: true,
      user_type: true,
      active: true,
      is_deleted: true,
      phone_number: true,
      created_at: true
    }
  })
  if (!mediator || mediator.user_type !== 'MEDIATOR') throw createError(errorCodes.NOT_FOUND)

  const activeCases = await getActiveCasesForMediator(mediatorId)
  const withSuggestions = await Promise.all(
    activeCases.map(async (c) => {
      const suggested = await suggestMediatorForCase(c, mediatorId)
      return {
        id: c.id,
        caseId: c.caseId,
        status: c.status,
        firstPartyName: c.user_cases_first_partyTouser?.name,
        secondPartyName: c.user_cases_second_partyTouser?.name,
        suggestedMediator: suggested
          ? { id: suggested.id, name: suggested.name, email: suggested.email }
          : null
      }
    })
  )

  const pendingInvoices = await prisma.mediator_invoices.findMany({
    where: { mediator_id: mediatorId, status: 'PENDING' },
    select: {
      id: true,
      invoice_number: true,
      net_payable: true,
      case_id: true,
      invoice_month: true,
      created_at: true
    },
    orderBy: { created_at: 'desc' }
  })

  const [pastCasesCount, totalInvoices, rewardOrdersCount] = await Promise.all([
    prisma.cases.count({ where: { mediator: mediatorId } }),
    prisma.mediator_invoices.count({ where: { mediator_id: mediatorId } }),
    prisma.reward_redemption_orders.count({ where: { mediator_id: mediatorId } })
  ])

  const totalPendingAmount = pendingInvoices.reduce(
    (sum, inv) => sum + Number(inv.net_payable || 0),
    0
  )

  return {
    mediator,
    activeCases: withSuggestions,
    pendingPayouts: {
      invoices: pendingInvoices,
      totalPendingAmount
    },
    summary: {
      pastCasesCount,
      totalInvoices,
      rewardOrdersCount
    }
  }
}

async function notifyAdminsMediatorLeft ({ departedMediator, reassignments, triggerType }) {
  const admins = await prisma.user.findMany({
    where: { user_type: 'ADMIN', active: true, is_deleted: false },
    select: { id: true, email: true, name: true, master: true, admin_permissions: true }
  })

  const eligible = admins.filter((a) => {
    if (a.master) return true
    return adminHasPage(a, 'users') || adminHasPage(a, 'cases')
  })
  if (!eligible.length) return

  const caseRows = reassignments.map((r) =>
    `<li>Case <strong>${r.caseLabel}</strong> → ${r.newMediatorName}</li>`
  ).join('')

  const bodyHtml = `
    <p>Mediator <strong>${departedMediator.name}</strong> (${departedMediator.email}) has left the platform (${triggerType === 'SELF' ? 'self-service' : 'admin removal'}).</p>
    <p>The following active cases were auto-reassigned:</p>
    <ul>${caseRows || '<li>No active cases required reassignment.</li>'}</ul>
    <p>Please review cases in Admin Case Management and reassign if needed.</p>
  `

  const emails = eligible.map((a) => a.email).filter(Boolean)
  if (emails.length) {
    await helper.sendTemplatedEmail('mediatorLeftAutoReassign', emails, {
      departedName: departedMediator.name,
      bodyHtml
    })
  }

  await Promise.all(
    eligible.map((admin) =>
      prisma.notifications.create({
        data: {
          user_id: admin.id,
          title: 'Mediator left platform — cases reassigned',
          description: `${departedMediator.name} left; ${reassignments.length} case(s) reassigned. Please review.`
        }
      })
    )
  )
}

/**
 * @param {object} opts
 * @param {string} opts.mediatorId
 * @param {'SELF'|'ADMIN'} opts.triggerType
 * @param {Array<{ caseId: string, newMediatorId?: string }>} [opts.caseAssignments] manual picks; omit newMediatorId for auto
 */
async function processOffboarding ({ mediatorId, triggerType, caseAssignments = [] }) {
  const mediator = await prisma.user.findUnique({
    where: { id: mediatorId },
    select: { id: true, name: true, email: true, user_type: true, is_deleted: true }
  })
  if (!mediator || mediator.user_type !== 'MEDIATOR') throw createError(errorCodes.NOT_FOUND)
  if (mediator.is_deleted) throw createError(errorCodes.INVALID_REQUEST)

  const activeCases = await getActiveCasesForMediator(mediatorId)
  const manualMap = Object.fromEntries(
    (caseAssignments || []).map((a) => [a.caseId, a.newMediatorId || null])
  )

  const reassignments = []

  await prisma.$transaction(async (tx) => {
    for (const c of activeCases) {
      const manualMediatorId = Object.prototype.hasOwnProperty.call(manualMap, c.id)
        ? manualMap[c.id]
        : undefined
      const result = await reassignCase({
        caseId: c.id,
        departingMediatorId: mediatorId,
        newMediatorId: manualMediatorId || null,
        triggerType,
        tx
      })
      reassignments.push({
        caseLabel: c.caseId || c.id,
        newMediatorName: result.newMediator.name
      })
    }

    await tx.user.update({
      where: { id: mediatorId },
      data: { is_deleted: true, active: false }
    })
  })

  await notifyAdminsMediatorLeft({
    departedMediator: mediator,
    reassignments,
    triggerType
  })

  return { reassignments, mediatorId }
}

async function getMediator360 (mediatorId, { page = 1, perPage = 20 } = {}) {
  const mediator = await prisma.user.findUnique({
    where: { id: mediatorId },
    select: {
      id: true,
      name: true,
      email: true,
      phone_number: true,
      user_type: true,
      active: true,
      is_deleted: true,
      created_at: true,
      subscription_tier: true,
      subscription_expires_at: true,
      reward_points_balance: true,
      state: true,
      city: true
    }
  })
  if (!mediator || mediator.user_type !== 'MEDIATOR') throw createError(errorCodes.NOT_FOUND)

  const skip = (Math.max(1, page) - 1) * perPage

  const [cases, casesTotal, kadrInvoices, privateInvoices, rewardOrders, subscriptions, trackers] =
    await Promise.all([
      prisma.cases.findMany({
        where: { mediator: mediatorId },
        skip,
        take: perPage,
        orderBy: { updated_at: 'desc' },
        select: {
          id: true,
          caseId: true,
          status: true,
          sub_status: true,
          created_at: true,
          updated_at: true
        }
      }),
      prisma.cases.count({ where: { mediator: mediatorId } }),
      prisma.mediator_invoices.findMany({
        where: { mediator_id: mediatorId },
        orderBy: { created_at: 'desc' },
        take: 50
      }),
      prisma.mediator_private_invoices.findMany({
        where: { mediator_id: mediatorId },
        orderBy: { created_at: 'desc' },
        take: 50,
        include: { line_items: true }
      }),
      prisma.reward_redemption_orders.findMany({
        where: { mediator_id: mediatorId },
        orderBy: { created_at: 'desc' },
        take: 30,
        include: { catalog_item: { select: { title: true, points_cost: true } } }
      }),
      prisma.mediator_subscriptions.findMany({
        where: { mediator_id: mediatorId },
        orderBy: { created_at: 'desc' },
        take: 20
      }),
      prisma.mediator_court_case_trackers.findMany({
        where: { mediator_id: mediatorId },
        orderBy: { updated_at: 'desc' },
        take: 30
      })
    ])

  const pendingPayouts = await prisma.mediator_invoices.findMany({
    where: { mediator_id: mediatorId, status: 'PENDING' }
  })

  return {
    mediator,
    cases,
    casesTotal,
    page: Math.max(1, page),
    perPage,
    kadrInvoices,
    privateInvoices,
    pendingPayouts,
    rewardOrders,
    subscriptions,
    courtTrackers: trackers,
    readOnly: true
  }
}

module.exports = {
  getActiveCasesForMediator,
  getOffboardingPreview,
  processOffboarding,
  reassignCase,
  getMediator360,
  suggestMediatorForCase
}
