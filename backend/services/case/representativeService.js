const prisma = require('../../lib/prisma.js')
const helper = require('../../utils/helper')
const { createError } = require('../../utils/errors')
const errorCodes = require('../../utils/errors/errorCodes')

/**
 * Representative (a party's lawyer) support.
 *
 * A representative is a `user` record with user_type = 'REPRESENTATIVE', created
 * inactive (active:false) and linked to a case via the party-specific FK columns
 * cases.first_party_representative / cases.second_party_representative.
 *
 * Design decisions (confirmed with product):
 *  - One representative per party per case.
 *  - The same representative account is reused across cases (looked up by
 *    email + user_type REPRESENTATIVE); we only create when none exists.
 *  - The representative activates in lockstep with the client they represent
 *    (see generalController.updateInactiveUser + registerCodeTriggers).
 *  - The other party sees only the representative's name, never contact details.
 */

const REPRESENTATIVE_EMAIL_KEY = (email) => ({
  email_user_type: { email, user_type: 'REPRESENTATIVE' }
})

const PARTY_SIDES = {
  FIRST: 'first_party',
  SECOND: 'second_party'
}

function repColumnForSide (side) {
  if (side === PARTY_SIDES.FIRST) return 'first_party_representative'
  if (side === PARTY_SIDES.SECOND) return 'second_party_representative'
  throw createError(errorCodes.INVALID_REQUEST, {
    message: 'Invalid party side for representative. Expected first_party or second_party.'
  })
}

function normalizeEmail (email) {
  return String(email || '').trim().toLowerCase()
}

/**
 * Create the representative user if absent, otherwise reuse the existing one.
 * Returns { user, isNewToPlatform }.
 *  - isNewToPlatform === true  => account did not exist (invite-to-join email)
 *  - isNewToPlatform === false => account already existed (tagged-to-case email)
 *
 * The representative is created inactive; it is activated later in lockstep with
 * the client (activateRepresentativesForClient).
 */
async function ensureRepresentativeUser ({ name, email, phone }) {
  const normalizedEmail = normalizeEmail(email)
  if (!normalizedEmail) {
    throw createError(errorCodes.MISSING_REQUIRED_DETAIL, {
      message: 'Representative email is required.'
    })
  }

  const existing = await prisma.user.findUnique({
    where: REPRESENTATIVE_EMAIL_KEY(normalizedEmail),
    select: { id: true, name: true, email: true, active: true, is_deleted: true }
  })

  if (existing && !existing.is_deleted) {
    // Reuse the existing representative account. Fill a missing name/phone if provided.
    if ((!existing.name && name) || phone) {
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          ...(!existing.name && name ? { name } : {}),
          ...(phone ? { phone_number: phone } : {})
        }
      })
    }
    return { user: existing, isNewToPlatform: false }
  }

  if (existing?.is_deleted) {
    const revived = await prisma.user.update({
      where: { id: existing.id },
      data: {
        name: name || existing.name || 'Representative',
        phone_number: phone || null,
        password_hash: '',
        user_type: 'REPRESENTATIVE',
        active: false,
        is_self_signed_up: false,
        is_deleted: false
      },
      select: { id: true, name: true, email: true, active: true }
    })
    return { user: revived, isNewToPlatform: true }
  }

  const created = await prisma.user.create({
    data: {
      name: name || 'Representative',
      email: normalizedEmail,
      phone_number: phone || null,
      password_hash: '',
      user_type: 'REPRESENTATIVE',
      active: false,
      is_self_signed_up: false,
      is_deleted: false
    },
    select: { id: true, name: true, email: true, active: true }
  })
  return { user: created, isNewToPlatform: true }
}

/**
 * Link a representative user to a case for a given party side.
 * Throws if that party already has a representative on the case (one per party).
 */
async function linkRepresentativeToCase ({ caseId, side, representativeUserId, allowReplace = false }) {
  const column = repColumnForSide(side)
  const caseRecord = await prisma.cases.findUnique({
    where: { id: caseId },
    select: { id: true, [column]: true }
  })
  if (!caseRecord) throw createError(errorCodes.CASE_NOT_FOUND)

  const current = caseRecord[column]
  if (current && current !== representativeUserId && !allowReplace) {
    throw createError(errorCodes.INVALID_REQUEST, {
      message: 'This party already has a representative on this case.'
    })
  }

  await prisma.cases.update({
    where: { id: caseId },
    data: { [column]: representativeUserId }
  })
}

/**
 * Notify a representative that they have been tagged to a case.
 *  - New to platform  => invite-to-join email (representativeInvite)
 *  - Already a user   => tagged-to-case email (representativeTaggedToCase)
 * Non-blocking: email failures are logged, not thrown.
 */
async function notifyRepresentativeTagged ({ representative, isNewToPlatform, caseNumber, category, representedPartyName, side }) {
  const templateKey = isNewToPlatform ? 'representativeInvite' : 'representativeTaggedToCase'
  const partyLabel = side === PARTY_SIDES.SECOND ? 'second party' : 'first party'
  try {
    await helper.sendTemplatedEmail(templateKey, representative.email, {
      recipientName: representative.name || 'Representative',
      caseId: caseNumber || '',
      category: category || 'your case',
      representedPartyName: representedPartyName || 'your client',
      partyLabel,
      loginUrl: `${process.env.BASE_URL}/admin/auth/sign-in`
    })
  } catch (err) {
    console.error('[representative] tag notification failed', err.message)
  }
}

/**
 * High-level entry used by signup / initiateNewCase / admin add-later.
 * Creates-or-reuses the representative, links to the case, and sends the email.
 * Returns the representative user (or null when no email was supplied).
 */
async function attachRepresentativeToCase ({
  caseId,
  side,
  representativeEmail,
  representativeName,
  representativePhone,
  caseNumber,
  category,
  representedPartyName,
  allowReplace = false,
  sendEmail = true,
  activateImmediately = false
}) {
  if (!representativeEmail) return null

  const { user, isNewToPlatform } = await ensureRepresentativeUser({
    name: representativeName,
    email: representativeEmail,
    phone: representativePhone
  })

  await linkRepresentativeToCase({
    caseId,
    side,
    representativeUserId: user.id,
    allowReplace
  })

  if (sendEmail) {
    await notifyRepresentativeTagged({
      representative: user,
      isNewToPlatform,
      caseNumber,
      category,
      representedPartyName,
      side
    })
  }

  // When the represented client is already active (e.g. an existing client
  // starting an additional case), there is no approval event to piggy-back on,
  // so provision + activate the representative now. The welcomeCredentials email
  // fires via the `user` active false->true code trigger.
  if (activateImmediately && user.active === false) {
    await activateRepresentativeById(user.id)
  }

  return { user, isNewToPlatform }
}

/**
 * Provision credentials and activate a single representative user immediately.
 * Fires welcomeCredentials via the `user` active false->true code trigger.
 */
async function activateRepresentativeById (representativeUserId) {
  const rep = await prisma.user.findUnique({
    where: { id: representativeUserId },
    select: { id: true, active: true, is_deleted: true, user_type: true }
  })
  if (!rep || rep.is_deleted || rep.user_type !== 'REPRESENTATIVE' || rep.active === true) {
    return null
  }
  const generatedPassword = helper.generateRandomPassword()
  const hashPassword = await helper.hashPassword(generatedPassword)
  await helper.runWithNotificationContext(
    {
      userId: rep.id,
      data: {
        password: generatedPassword,
        loginUrl: `${process.env.BASE_URL}/admin/auth/sign-in`
      }
    },
    () => prisma.user.update({
      where: { id: rep.id },
      data: { active: true, password_hash: hashPassword }
    })
  )
  return { id: rep.id, generatedPassword }
}

/**
 * When a client is approved (active false -> true), activate any representatives
 * linked to that client's cases so their credentials email fires in lockstep.
 * Returns [{ id, email, name, generatedPassword }] for representatives newly activated.
 */
async function activateRepresentativesForClient ({ clientUserId }) {
  if (!clientUserId) return []

  // Find cases where this client is a party, and collect the representative for
  // that specific party side (a rep only inherits the side they represent).
  const cases = await prisma.cases.findMany({
    where: {
      OR: [
        { first_party: clientUserId },
        { second_party: clientUserId }
      ]
    },
    select: {
      first_party: true,
      second_party: true,
      first_party_representative: true,
      second_party_representative: true
    }
  })

  const repIds = new Set()
  for (const c of cases) {
    if (c.first_party === clientUserId && c.first_party_representative) {
      repIds.add(c.first_party_representative)
    }
    if (c.second_party === clientUserId && c.second_party_representative) {
      repIds.add(c.second_party_representative)
    }
  }
  if (repIds.size === 0) return []

  const reps = await prisma.user.findMany({
    where: {
      id: { in: [...repIds] },
      user_type: 'REPRESENTATIVE',
      active: false,
      is_deleted: false
    },
    select: { id: true, email: true, name: true }
  })

  const activated = []
  for (const rep of reps) {
    const result = await activateRepresentativeById(rep.id)
    if (result) activated.push({ ...rep, generatedPassword: result.generatedPassword })
  }
  return activated
}

/**
 * Fetch the active representative (email + name) for a given party side of a case,
 * so party-facing transactional emails can be copied to the representative.
 * Returns null when there is no active representative for that side.
 */
async function getPartyRepresentative ({ caseId, side }) {
  const column = repColumnForSide(side)
  const caseRow = await prisma.cases.findUnique({
    where: { id: caseId },
    select: { [column]: true }
  })
  const repId = caseRow?.[column]
  if (!repId) return null
  const rep = await prisma.user.findUnique({
    where: { id: repId },
    select: { id: true, name: true, email: true, active: true, is_deleted: true }
  })
  if (!rep || rep.is_deleted || rep.active === false || !rep.email) return null
  return rep
}

/**
 * Copy a party-facing templated email to that party's active representative,
 * reusing the same template + variables (rep gets everything the client gets).
 * Non-blocking.
 */
async function copyEmailToRepresentative ({ caseId, side, templateKey, variables = {}, attachments = [] }) {
  try {
    const rep = await getPartyRepresentative({ caseId, side })
    if (!rep) return
    await helper.sendTemplatedEmail(templateKey, rep.email, {
      ...variables,
      recipientName: rep.name || 'Representative'
    }, attachments)
  } catch (err) {
    console.error('[representative] copy email failed', err.message)
  }
}

module.exports = {
  PARTY_SIDES,
  ensureRepresentativeUser,
  linkRepresentativeToCase,
  attachRepresentativeToCase,
  activateRepresentativeById,
  notifyRepresentativeTagged,
  activateRepresentativesForClient,
  getPartyRepresentative,
  copyEmailToRepresentative,
  REPRESENTATIVE_EMAIL_KEY
}
