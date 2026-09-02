const prisma = require('../../lib/prisma.js')
const helper = require('../../utils/helper')
const { CaseTypes, CaseSubTypes } = require('../../utils/caseConstants')
const { createError } = require('../../utils/errors')
const errorCodes = require('../../utils/errors/errorCodes')
const { v4: uuidv4 } = require('uuid')

const CLIENT_EMAIL_KEY = (email) => ({
  email_user_type: { email, user_type: 'CLIENT' }
})

const CASE_TYPES = ['Mediation', 'Arbitrator', 'Counsellor']

/**
 * Create a KDR case for an existing (or newly created signup) first-party client.
 * Does not create/activate the first-party user account.
 */
async function createClientInitiatedCase ({
  firstPartyUserId,
  description,
  category,
  evidenceContent,
  oppositeName,
  oppositeEmail,
  oppositePhone
}) {
  if (!firstPartyUserId || !description || !category || !oppositeName || !oppositeEmail || !oppositePhone) {
    throw createError(errorCodes.MISSING_REQUIRED_DETAIL)
  }

  const firstParty = await prisma.user.findUnique({
    where: { id: firstPartyUserId },
    select: { id: true, user_type: true, active: true, is_deleted: true, name: true, email: true }
  })
  if (!firstParty || firstParty.user_type !== 'CLIENT' || firstParty.is_deleted) {
    throw createError(errorCodes.FORBIDDEN)
  }
  if (firstParty.active === false) {
    throw createError(errorCodes.USER_NOT_ACTIVE)
  }

  const normalizedOppositeEmail = String(oppositeEmail).trim().toLowerCase()
  if (normalizedOppositeEmail === String(firstParty.email || '').trim().toLowerCase()) {
    throw createError(errorCodes.INVALID_REQUEST, {
      message: 'Opposite party email cannot be the same as your account email.'
    })
  }

  let evidenceUrl = ''
  if (evidenceContent) {
    evidenceUrl = await helper.deployToS3Bucket(evidenceContent, `evidence-${uuidv4()}`)
  }

  const oppositePartyUser = await prisma.user.upsert({
    where: CLIENT_EMAIL_KEY(normalizedOppositeEmail),
    update: {},
    create: {
      name: oppositeName,
      email: normalizedOppositeEmail,
      phone_number: oppositePhone,
      password_hash: '',
      is_self_signed_up: false,
      user_type: 'CLIENT',
      active: false
    }
  })

  const tracker = await prisma.caseIdTracker.findFirst()
  const newCaseId = tracker ? tracker.lastCaseId + 1 : 1

  const created = await prisma.cases.create({
    data: {
      first_party: firstParty.id,
      second_party: oppositePartyUser.id,
      evidence_document_url: evidenceUrl || '',
      description,
      category,
      status: CaseTypes.NEW,
      caseId: `KDR-${newCaseId}`
    }
  })

  await prisma.caseIdTracker.upsert({
    where: { id: 1 },
    update: { lastCaseId: newCaseId },
    create: { lastCaseId: newCaseId }
  })

  return created
}

/**
 * Admin sets case_type and moves case into the payment / mediation pipeline.
 */
async function approveCaseType ({ caseId, caseType }) {
  if (!caseId || !caseType) throw createError(errorCodes.MISSING_REQUIRED_DETAIL)
  if (!CASE_TYPES.includes(caseType)) {
    throw createError(errorCodes.INVALID_REQUEST, {
      message: 'Invalid case type. Choose Mediation, Arbitrator, or Counsellor.'
    })
  }

  const existing = await prisma.cases.findUnique({
    where: { id: caseId },
    select: { id: true, case_type: true, status: true, caseId: true }
  })
  if (!existing) throw createError(errorCodes.NOT_FOUND)
  if (existing.status !== CaseTypes.NEW) {
    throw createError(errorCodes.INVALID_REQUEST, {
      message: 'Only new cases awaiting type assignment can be approved.'
    })
  }
  if (existing.case_type) {
    throw createError(errorCodes.INVALID_REQUEST, {
      message: 'This case already has a case type assigned.'
    })
  }

  const caseSubStatus = CaseSubTypes.PENDING_NOTICE_PAYMENT
  const updated = await prisma.cases.update({
    where: { id: caseId },
    data: {
      case_type: caseType,
      status: CaseTypes.IN_PROGRESS,
      sub_status: caseSubStatus
    }
  })

  const { recordCaseMilestone } = require('./caseMilestoneService')
  await recordCaseMilestone(prisma, {
    caseId: updated.id,
    statusId: updated.status,
    subStatusId: updated.sub_status
  })

  return updated
}

module.exports = {
  createClientInitiatedCase,
  approveCaseType,
  CASE_TYPES
}
