#!/usr/bin/env node
/**
 * One-time data migration for the second-party mediation-fee payment step.
 *
 * Adds the `pending_mediation_payment_second_party` case_sub_statuses row and
 * inserts a matching case_events row directly before the `mediator_assigned`
 * event, shifting later sequence numbers up by one. Idempotent — safe to
 * re-run; it no-ops if the case_events row already exists.
 *
 * Usage:
 *   node scripts/seedCaseMediationSplit.js
 */
require('dotenv').config()

const prisma = require('../lib/prisma')
const { CaseTypes, CaseSubTypes } = require('../utils/caseConstants')

const SUB_STATUS_ID = CaseSubTypes.PENDING_MEDIATION_PAYMENT_SECOND_PARTY
const SUB_STATUS_NAME = 'Pending Mediation Payment (Second Party)'
const EVENT_TITLE = 'Second party mediation fee payment'
const EVENT_DESCRIPTION = 'Second party pays their share of the mediation fee before a mediator is assigned.'

async function main () {
  const existingEvent = await prisma.case_events.findFirst({
    where: { sub_status_id: SUB_STATUS_ID }
  })
  if (existingEvent) {
    console.log(`skip  case_events row for ${SUB_STATUS_ID} already exists (sequence ${existingEvent.sequence})`)
    return
  }

  const mediatorAssignedEvent = await prisma.case_events.findFirst({
    where: { sub_status_id: CaseSubTypes.MEDIATOR_ASSIGNED }
  })
  if (!mediatorAssignedEvent) {
    throw new Error(`Cannot find case_events row for sub_status_id=${CaseSubTypes.MEDIATOR_ASSIGNED} — unable to determine insertion point.`)
  }
  const insertSequence = mediatorAssignedEvent.sequence

  await prisma.$transaction(async (tx) => {
    await tx.case_sub_statuses.upsert({
      where: { id: SUB_STATUS_ID },
      update: { name: SUB_STATUS_NAME, status_id: CaseTypes.IN_PROGRESS },
      create: { id: SUB_STATUS_ID, status_id: CaseTypes.IN_PROGRESS, name: SUB_STATUS_NAME }
    })

    const toShift = await tx.case_events.findMany({
      where: { sequence: { gte: insertSequence } },
      orderBy: { sequence: 'desc' }
    })
    for (const row of toShift) {
      await tx.case_events.update({ where: { id: row.id }, data: { sequence: row.sequence + 1 } })
    }

    await tx.case_events.create({
      data: {
        status_id: CaseTypes.IN_PROGRESS,
        sub_status_id: SUB_STATUS_ID,
        title: EVENT_TITLE,
        description: EVENT_DESCRIPTION,
        sequence: insertSequence
      }
    })
  })

  console.log(`create case_sub_statuses + case_events row for ${SUB_STATUS_ID} at sequence ${insertSequence}`)
  console.log('Done.')
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
