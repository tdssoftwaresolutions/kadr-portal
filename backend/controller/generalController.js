const prisma = require('../lib/prisma.js')
const helper = require('../utils/helper')
const errorCodes = require('../utils/errors/errorCodes')
const { v4: uuidv4 } = require('uuid')
const { createError } = require('../utils/errors')
const { success } = require('../utils/responses')
const { CaseSubTypes, CaseTypes } = require('../utils/caseConstants')
const { getOrCreateSettings, settingsToMap } = require('../services/invoice/invoiceService')
const { awardRewardPoints, onMediatorApproved } = require('../services/reward/rewardService')
const { ensureMediatorReferralCode } = require('../utils/referralCode')
const {
  assertAdminPage,
  assertAdminPageAny,
  assertAdminComponent,
  assertAdminUsersOrApprovals,
  adminHasComponent,
  adminHasPage,
  normalizeIncomingPermissions,
  defaultFullPermissions
} = require('../utils/adminPermissionHelpers')
const { runWithNotificationContext } = require('../services/notification/notificationContext')
const { assertCaseAccessFromRequest, assertNoteOwnership, caseMembershipOr } = require('../services/security/caseAccessService')
const { parsePagination, parseDateRange, paginatedResponse } = require('../utils/pagination')
const { sanitizeRichHtml } = require('../utils/htmlSanitizer')
const analytics = require('../utils/analytics')

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

      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { id: true }
      })
      if (!user) throw createError(errorCodes.NOT_FOUND)

      const where = {
        ...dateFilter,
        OR: [
          { created_by: user.id },
          {
            cases: {
              OR: caseMembershipOr(user.id)
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
  },
  getInactiveUsers: async function (req, res, next) {
    try {
      if (req.user.type !== 'ADMIN') throw createError(errorCodes.FORBIDDEN)
      await assertAdminComponent(req, 'approvals')
      const type = req.query.type
      const relationField = type === 'CLIENT' ? 'cases_cases_first_partyTouser' : 'cases_cases_mediatorTouser'
      const inactiveUsers = await helper.getUsers(false, prisma, req.query.page, type, relationField)
      success(res, { inactiveUsers })
    } catch (error) {
      next(error)
    }
  },
  updateUserProfile: async function (req, res, next) {
    try {
      const userDetails = req.user
      const {
        name,
        phone_number,
        profile_picture,
        password,
        current_password: currentPassword,
        timezone,
        locale
      } = req.body
      let uploadedProfilePictureResponse = null
      if (profile_picture) { uploadedProfilePictureResponse = await helper.deployToS3Bucket(profile_picture, `profile-picture-${uuidv4()}`) }

      if (password) {
        if (!currentPassword) {
          throw createError(errorCodes.MISSING_FIELD, { message: 'Current password is required to change password.' })
        }
        const existing = await prisma.user.findUnique({
          where: { id: userDetails.id },
          select: { password_hash: true }
        })
        if (!existing?.password_hash) {
          throw createError(errorCodes.INVALID_CREDENTIALS, { message: 'Current password is incorrect.' })
        }
        const valid = await helper.comparePassword(currentPassword, existing.password_hash)
        if (!valid) {
          throw createError(errorCodes.INVALID_CREDENTIALS, { message: 'Current password is incorrect.' })
        }
      }

      const updated = await prisma.user.update({
        where: {
          id: userDetails.id
        },
        data: {
          ...(name !== undefined && { name }),
          ...(phone_number !== undefined && { phone_number }),
          ...(uploadedProfilePictureResponse && { profile_picture_url: uploadedProfilePictureResponse }),
          ...(password && { password_hash: await helper.hashPassword(password) }),
          ...(timezone !== undefined && { timezone: timezone || null }),
          ...(locale !== undefined && { locale: locale || null })
        },
        select: {
          name: true,
          phone_number: true,
          profile_picture_url: true,
          timezone: true,
          locale: true
        }
      })
      success(res, {
        user: {
          name: updated.name,
          phone: updated.phone_number,
          photo: updated.profile_picture_url || '',
          timezone: updated.timezone || null,
          locale: updated.locale || null
        }
      }, 'User profile updated successfully!')
    } catch (error) {
      next(error)
    }
  },
  getDashboardContent: async function (req, res, next) {
    try {
      const { id, type } = req.user
      const dashboardContent = {}

      const user = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          email: true,
          user_type: true,
          phone_number: true,
          profile_picture_url: true,
          master: true,
          admin_permissions: true
        }
      })

      if (!user) throw createError(errorCodes.USER_NOT_FOUND)
      switch (type) {
        case 'ADMIN': {
          const startOfToday = new Date()
          startOfToday.setHours(0, 0, 0, 0)
          const endOfToday = new Date()
          endOfToday.setHours(23, 59, 59, 999)
          const adminRow = { ...user, user_type: 'ADMIN' }
          if (!adminHasPage(adminRow, 'dashboard')) {
            success(res, { dashboardContent: {} })
            return
          }
          const [inactiveUsers, inactiveMediators, totalCases, clientUsers, mediatorUsers, todaysCaseMeetings] = await Promise.all([
            helper.getUsers(false, prisma, 1, 'CLIENT', 'cases_cases_first_partyTouser'),
            helper.getUsers(false, prisma, 1, 'MEDIATOR', 'cases_cases_mediatorTouser'),
            prisma.cases.count(),
            prisma.user.count({
              where: {
                user_type: 'CLIENT',
                active: true,
                is_deleted: false
              }
            }),
            prisma.user.count({
              where: {
                user_type: 'MEDIATOR',
                active: true,
                is_deleted: false
              }
            }),
            prisma.events.findMany({
              where: {
                case_id: {
                  not: null
                },
                start_datetime: {
                  gte: startOfToday,
                  lte: endOfToday
                }
              },
              orderBy: {
                start_datetime: 'asc'
              },
              select: {
                id: true,
                title: true,
                description: true,
                start_datetime: true,
                end_datetime: true,
                type: true,
                meeting_link: true,
                cases: {
                  select: {
                    id: true,
                    caseId: true,
                    case_type: true,
                    user_cases_first_partyTouser: {
                      select: {
                        name: true
                      }
                    },
                    user_cases_second_partyTouser: {
                      select: {
                        name: true
                      }
                    }
                  }
                }
              }
            })
          ])
          dashboardContent.inactive_users = adminHasComponent(adminRow, 'approvals') ? inactiveUsers : { total: 0, users: [] }
          dashboardContent.inactive_mediators = adminHasComponent(adminRow, 'approvals') ? inactiveMediators : { total: 0, users: [] }
          dashboardContent.count = adminHasComponent(adminRow, 'stats')
            ? {
                cases: totalCases,
                clients: clientUsers,
                mediators: mediatorUsers
              }
            : {
                cases: 0,
                clients: 0,
                mediators: 0
              }
          dashboardContent.todaysEvent = adminHasComponent(adminRow, 'schedule')
            ? todaysCaseMeetings.map((event) => ({
              id: event.id,
              title: event.title,
              description: event.description,
              start_datetime: event.start_datetime,
              end_datetime: event.end_datetime,
              type: event.type,
              meeting_link: event.meeting_link,
              caseId: event.cases?.caseId,
              caseType: event.cases?.case_type,
              caseFirstPartyName: event.cases?.user_cases_first_partyTouser?.name,
              caseSecondPartyName: event.cases?.user_cases_second_partyTouser?.name,
              case_id: event.cases?.id
            }))
            : []
          break
        }

        case 'MEDIATOR': {
          const [notes, casesWithEvents, casesCount, todaysPersonalMeetings, caseEvents] = await Promise.all([
            prisma.notes.findMany({
              where: {
                user_id: id,
                case_id: null
              },
              select: {
                id: true,
                note_text: true
              },
              orderBy: {
                created: 'desc'
              }
            }),
            helper.getMediatorCases(prisma, id, 1),
            helper.getMediatorCasesCount(prisma, id),
            helper.getTodaysPersonalMeetings(prisma, id),
            helper.getCaseEvents(prisma)
          ])
          dashboardContent.myCases = {
            casesWithEvents: helper.mergeCaseHistory(casesWithEvents, caseEvents, {
              userId: id,
              type: 'MEDIATOR'
            }),
            total: casesCount,
            page: 1,
            perPage: 10
          }
          dashboardContent.notes = notes
          dashboardContent.todaysEvent = helper.getTodaysEvents(casesWithEvents, todaysPersonalMeetings)
          dashboardContent.user = user
          const mediatorReferralCode = await ensureMediatorReferralCode(prisma, id)
          const rewardRow = await prisma.user.findUnique({
            where: { id },
            select: { reward_points_balance: true, referral_code: true }
          })
          dashboardContent.rewardPoints = {
            balance: rewardRow?.reward_points_balance ?? 0,
            referralCode: mediatorReferralCode || rewardRow?.referral_code || null
          }
          break
        }

        case 'CLIENT': {
          const [casesWithEvents, caseEvents] = await Promise.all([
            helper.getClientCases(prisma, id, 1),
            helper.getCaseEvents(prisma)
          ])
          dashboardContent.myCases = helper.mergeCaseHistory(casesWithEvents, caseEvents, {
            userId: id,
            type: 'CLIENT'
          })
          dashboardContent.todaysEvent = helper.getEventsForToday(casesWithEvents)
          dashboardContent.user = user
          break
        }
      }

      success(res, { dashboardContent })
    } catch (error) {
      console.log(error)
      next(error)
    }
  },
  getAvailableLanguages: async function (req, res) {
    const availableLanguages = await prisma.available_languages.findMany()
    success(res, { availableLanguages })
  },
  updateInactiveUser: async function (req, res) {
    if (req.user.type !== 'ADMIN') throw createError(errorCodes.FORBIDDEN)
    await assertAdminUsersOrApprovals(req)
    const { isActive, caseId, userId, caseType, sendWelcomeEmail = true } = req.body
    const shouldSendWelcomeEmail = Boolean(sendWelcomeEmail) && Boolean(isActive)
    let generatedPassword = null
    let hashPassword = null
    if (shouldSendWelcomeEmail) {
      generatedPassword = helper.generateRandomPassword()
      hashPassword = await helper.hashPassword(generatedPassword)
    }

    const priorUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { user_type: true, active: true, is_deleted: true, name: true, email: true }
    })
    if (!priorUser || priorUser.is_deleted) throw createError(errorCodes.NOT_FOUND)

    const updatedUser = await runWithNotificationContext(
      {
        userId,
        data: shouldSendWelcomeEmail
          ? {
              password: generatedPassword,
              loginUrl: `${process.env.BASE_URL}/admin/auth/sign-in`
            }
          : {}
      },
      () => prisma.user.update({
        where: { id: userId },
        data: {
          active: isActive,
          ...(hashPassword ? { password_hash: hashPassword } : {})
        },
        select: {
          name: true,
          email: true,
          phone_number: true,
          user_type: true,
          active: true
        }
      })
    )

    if (isActive && priorUser.active === false && updatedUser.user_type === 'MEDIATOR') {
      try {
        await onMediatorApproved(userId)
      } catch (rewardErr) {
        console.error('Reward on mediator approval:', rewardErr)
      }
    }

    // Lockstep: when a CLIENT is approved (active false -> true), provision +
    // activate any representatives linked to that client's cases so their
    // welcomeCredentials email fires alongside the client's.
    if (isActive && priorUser.active === false && updatedUser.user_type === 'CLIENT') {
      try {
        const { activateRepresentativesForClient } = require('../services/case/representativeService')
        await activateRepresentativesForClient({ clientUserId: userId })
      } catch (repErr) {
        console.error('Representative activation on client approval:', repErr)
      }
    }
    if (caseId && caseType) {
      const { approveCaseType } = require('../services/case/clientCaseService')
      await approveCaseType({ caseId, caseType })
    }
    // Welcome email: services/notification/registerCodeTriggers.js (user active + password in context).
    success(res, {}, 'User updated successfully')
  },
  /**
   * Approve case type for a case already in status "new" (e.g. logged-in client initiated).
   * Does not change user.active — only moves the case into the payment pipeline.
   */
  approveCaseType: async function (req, res, next) {
    try {
      if (req.user.type !== 'ADMIN') throw createError(errorCodes.FORBIDDEN)
      await assertAdminPageAny(req, ['cases', 'users'])
      const { caseId, caseType } = req.body
      const { approveCaseType } = require('../services/case/clientCaseService')
      const updated = await approveCaseType({ caseId, caseType })
      analytics.trackCaseStatusChanged({
        req,
        actorUserId: req.user?.id,
        caseRecord: updated,
        fromStatus: CaseTypes.NEW,
        toStatus: updated.status,
        toSubStatus: updated.sub_status,
        extra: { transition: 'case_type_approved', case_type: caseType }
      })
      success(res, { case: updated }, 'Case type approved. Client can proceed with notice payment.')
    } catch (error) {
      next(error)
    }
  },

  /**
   * Admin adds (or replaces) a representative for a party on an existing case.
   * Runs the same invite -> accept -> map flow as signup: creates/reuses the
   * REPRESENTATIVE user, links it to the case's party-representative column, and
   * emails them. If the represented party is already active, the representative
   * is provisioned + activated immediately; otherwise they activate in lockstep
   * when the party's account is approved.
   *
   * Body: { caseId, side: 'first_party'|'second_party', representativeEmail,
   *         representativeName?, representativePhone?, allowReplace? }
   */
  addCaseRepresentative: async function (req, res, next) {
    try {
      if (req.user.type !== 'ADMIN') throw createError(errorCodes.FORBIDDEN)
      await assertAdminPageAny(req, ['cases', 'users'])
      const { caseId, side, representativeEmail, representativeName, representativePhone, allowReplace } = req.body
      if (!caseId || !side || !representativeEmail) {
        throw createError(errorCodes.MISSING_REQUIRED_DETAIL)
      }
      const { PARTY_SIDES, attachRepresentativeToCase } = require('../services/case/representativeService')
      if (side !== PARTY_SIDES.FIRST && side !== PARTY_SIDES.SECOND) {
        throw createError(errorCodes.INVALID_REQUEST, {
          message: 'Invalid party side. Expected first_party or second_party.'
        })
      }

      const caseRecord = await prisma.cases.findUnique({
        where: { id: caseId },
        select: {
          caseId: true,
          category: true,
          first_party: true,
          second_party: true,
          user_cases_first_partyTouser: { select: { name: true, active: true } },
          user_cases_second_partyTouser: { select: { name: true, active: true } }
        }
      })
      if (!caseRecord) throw createError(errorCodes.CASE_NOT_FOUND)

      const party = side === PARTY_SIDES.FIRST
        ? caseRecord.user_cases_first_partyTouser
        : caseRecord.user_cases_second_partyTouser

      const result = await attachRepresentativeToCase({
        caseId,
        side,
        representativeEmail,
        representativeName,
        representativePhone,
        caseNumber: caseRecord.caseId,
        category: caseRecord.category,
        representedPartyName: party?.name,
        allowReplace: Boolean(allowReplace),
        // Activate the rep now only if the party they represent is already active.
        activateImmediately: party?.active === true
      })

      success(res, {
        representative: result ? { id: result.user.id, isNewToPlatform: result.isNewToPlatform } : null
      }, 'Representative added to the case. They have been notified by email.')
    } catch (error) {
      next(error)
    }
  },
  newCase: async function (req, res, next) {
    try {
      const caseData = req.body.caseData || {}
      const {
        party1,
        party1Email,
        party2,
        party2Email,
        natureOfSuit,
        category,
        description,
        plaintiffPhone,
        respondentPhone,
        document,
        caseType
      } = caseData

      if (!party1 || !party1Email || !party2 || !party2Email) {
        throw createError(errorCodes.MISSING_REQUIRED_DETAIL)
      }

      async function createUser (email, name, phone) {
        const normalizedEmail = String(email).trim().toLowerCase()
        const existing = await prisma.user.findUnique({
          where: { email_user_type: { email: normalizedEmail, user_type: 'CLIENT' } },
          select: { id: true, is_deleted: true }
        })
        if (existing && !existing.is_deleted) return existing.id
        if (existing?.is_deleted) {
          await prisma.user.update({
            where: { id: existing.id },
            data: {
              name,
              phone_number: phone || null,
              active: false,
              is_deleted: false,
              is_self_signed_up: false
            }
          })
          return existing.id
        }
        const user = await prisma.user.create({
          data: {
            name,
            email: normalizedEmail,
            user_type: 'CLIENT',
            active: false,
            phone_number: phone || null,
            password_hash: '',
            is_self_signed_up: false
          },
          select: { id: true }
        })
        return user.id
      }

      const firstPartyId = await createUser(party1Email, party1, plaintiffPhone)
      const secondPartyId = await createUser(party2Email, party2, respondentPhone)

      let uploadedDocumentResponse = null
      if (document) {
        uploadedDocumentResponse = await helper.deployToS3Bucket(document, `case-reference-document-${uuidv4()}`)
      }

      const tracker = await prisma.caseIdTracker.findFirst()
      const newCaseId = tracker ? tracker.lastCaseId + 1 : 1
      const settingsRows = await getOrCreateSettings()
      const settingsMap = settingsToMap(settingsRows)
      const defaultCommission = Number(settingsMap.mediator_commission || 5)
      const kadrCaseId = `KDR-${newCaseId}`

      const newCaseRecord = await prisma.cases.create({
        data: {
          first_party: firstPartyId,
          second_party: secondPartyId,
          evidence_document_url: uploadedDocumentResponse || '',
          description: description || natureOfSuit || 'Case referred for dispute resolution on Kadr.live',
          category: category || natureOfSuit || 'Other',
          case_type: caseType || 'Mediation',
          status: CaseTypes.NEW,
          caseId: kadrCaseId,
          mediator_commission: defaultCommission
        }
      })

      await prisma.caseIdTracker.upsert({
        where: { id: 1 },
        update: { lastCaseId: newCaseId },
        create: { lastCaseId: newCaseId }
      })

      const newSignatureRecord = await helper.createSignatureTrackingRecord(prisma, firstPartyId, newCaseRecord.id, null)

      await helper.sendTemplatedEmail('signatureVerificationRequest', party1Email, {
        recipientName: party1,
        caseId: kadrCaseId,
        caseTitle: `${party1} vs ${party2}`,
        signUrl: `${process.env.BASE_URL}/admin/signature?requestId=${newSignatureRecord.id}`,
        partyRole: 'first party'
      })

      analytics.trackCaseCreated({
        req,
        actorUserId: req.user?.id,
        caseRecord: newCaseRecord,
        extra: { origin: 'admin_created' }
      })

      success(res, { caseId: kadrCaseId }, 'New case created successfully!')
    } catch (error) {
      next(error)
    }
  },
  getExistingUser: async function (req, res, next) {
    try {
      const token = req.headers.authorization
      if (!token) throw createError(errorCodes.NO_TOKEN_PROVIDED)
      const tokenWithoutBearer = token.startsWith('Bearer ') ? token.slice(7) : token
      const decryptedContent = await helper.verifyToken(tokenWithoutBearer)
      const user = await prisma.user.findUnique({
        where: { id: decryptedContent.id },
        select: {
          id: true,
          email: true,
          phone_number: true,
          name: true,
          user_type: true,
          active: true,
          is_deleted: true
        }
      })
      if (!user || user.is_deleted || !user.active) throw createError(errorCodes.UNAUTHORIZED)
      success(res, { ...user })
    } catch (error) {
      next(error)
    }
  },
  getPastMediations: async function (req, res, next) {
    try {
      const { id, type } = req.user
      const { page } = req.query
      const currentPage = Number(page) || 1
      const pastStatuses = helper.getPastCaseStatuses()

      if (!id || !type) throw createError(errorCodes.UNAUTHORIZED)

      switch (type) {
        case 'MEDIATOR': {
          const [casesWithEvents, casesCount, caseEvents] = await Promise.all([
            helper.getMediatorCases(prisma, id, currentPage, pastStatuses),
            helper.getMediatorCasesCount(prisma, id, pastStatuses),
            helper.getCaseEvents(prisma)
          ])
          success(res, {
            casesWithEvents: helper.mergeCaseHistory(casesWithEvents, caseEvents, {
              userId: id,
              type: 'MEDIATOR'
            }),
            total: casesCount,
            page: currentPage,
            perPage: 10
          })
          break
        }
        case 'CLIENT': {
          const [casesWithEvents, casesCount, caseEvents] = await Promise.all([
            helper.getClientCases(prisma, id, currentPage, pastStatuses),
            helper.getClientCasesCount(prisma, id, pastStatuses),
            helper.getCaseEvents(prisma)
          ])
          success(res, {
            casesWithEvents: helper.mergeCaseHistory(casesWithEvents, caseEvents, {
              userId: id,
              type: 'CLIENT'
            }),
            total: casesCount,
            page: currentPage,
            perPage: 10
          })
          break
        }
        default:
          throw createError(errorCodes.UNAUTHORIZED)
      }
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
  },
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
  newCalendarEvent: async function (req, res, next) {
    try {
      const { title, description, start, end, type, caseId } = req.body
      const { parseLocalDateTime } = require('../utils/datetime')
      const startDate = parseLocalDateTime(start)
      const endDate = parseLocalDateTime(end)
      if (!startDate || !endDate) {
        throw createError(errorCodes.MISSING_REQUIRED_DETAIL, {
          message: 'Please provide a valid start and end date/time.'
        })
      }

      let meetingLink = ''

      if (type === 'personal' && req.user.type === 'MEDIATOR') {
        const { assertFeature } = require('../services/subscription/entitlementService')
        await assertFeature(req.user.id, 'personal_calendar')
        const zoomMeeting = await helper.scheduleMeeting(title, description, startDate, [{ email: req.user.email }])
        meetingLink = zoomMeeting?.meetingLink || ''
        await prisma.events.create({
          data: {
            title,
            description,
            start_datetime: startDate,
            end_datetime: endDate,
            type: 'PERSONAL',
            meeting_link: meetingLink,
            created_by: req.user.id,
            case_id: null
          }
        })
      } else if (type !== 'personal') {
        if (!caseId) throw createError(errorCodes.REQUIRED_CASE_ID)
        await assertCaseAccessFromRequest(req, caseId)
        const {
          createAndInviteCaseMeeting
        } = require('../services/meeting/meetingInvitationService')
        const { syncMeetingScheduled } = require('../services/case/caseMilestoneService')

        const result = await createAndInviteCaseMeeting({
          caseId,
          title,
          description,
          start: startDate,
          end: endDate,
          createdBy: req.user.id,
          persistEvent: true,
          notifyParties: true,
          notifyMediator: true,
          notifyAdmins: true,
          partyTemplateKey: 'meetingInvite',
          mediatorTemplateKey: 'meetingInvite'
        })
        meetingLink = result.meetingLink
        await syncMeetingScheduled(prisma, caseId)
      }

      success(res, {
        meetLink: meetingLink
      }, 'Event created successfully')
    } catch (err) {
      next(err)
    }
  },
  getActiveUsers: async function (req, res, next) {
    try {
      if (req.user.type !== 'ADMIN') throw createError(errorCodes.FORBIDDEN)
      await assertAdminPage(req, 'users')
      const { page = 1, type, includeInactive = 'false', includeDeleted = 'false' } = req.query
      const withInactive = String(includeInactive).toLowerCase() === 'true'
      const withDeleted = String(includeDeleted).toLowerCase() === 'true'

      if (type) {
        // Fetch data for a specific user type
        const relationField = type === 'CLIENT' ? 'cases_cases_first_partyTouser' : 'cases_cases_mediatorTouser'
        const activeUsers = await helper.getUsers(true, prisma, page, type, relationField, withInactive, withDeleted)
        res.json({ success: true, users: activeUsers.users, total: activeUsers.total })
      } else {
        // Fetch both clients and mediators
        const [activeClients, activeMediators] = await Promise.all([
          helper.getUsers(true, prisma, page, 'CLIENT', 'cases_cases_first_partyTouser', withInactive, withDeleted),
          helper.getUsers(true, prisma, page, 'MEDIATOR', 'cases_cases_mediatorTouser', withInactive, withDeleted)
        ])

        const combinedUsers = [...activeClients.users, ...activeMediators.users]
        res.json({ success: true, users: combinedUsers, total: combinedUsers.length })
      }
    } catch (error) {
      next(error)
    }
  },
  acceptMediationRequest: async function (req, res, next) {
    try {
      const { caseId } = req.body
      const { id } = req.user
      const caseRecord = await prisma.cases.findUnique({
        where: { id: caseId }, select: { second_party: true, first_party: true }
      })
      if (caseRecord.second_party !== id) {
        throw createError(errorCodes.UNAUTHORIZED)
      }

      const {
        ensureNoticePhaseComplete,
        updateCaseSubStatus
      } = require('../services/case/caseMilestoneService')

      await ensureNoticePhaseComplete(prisma, caseId)

      await updateCaseSubStatus(prisma, caseId, {
        status: CaseTypes.IN_PROGRESS,
        sub_status: CaseSubTypes.PENDING_MEDIATION_PAYMENT
      })

      success(res, {}, 'Mediation request accepted successfully!')
    } catch (error) {
      next(error)
    }
  },
  getUserData: async function (req, res, next) {
    try {
      const userData = {
        'id': req.user.id,
        'type': req.user.type,
        'email': req.user.email
      }
      const user = await prisma.user.findFirst({
        where: {
          id: req.user.id
        },
        select: {
          id: true,
          profile_picture_url: true,
          phone_number: true,
          name: true,
          master: true,
          admin_permissions: true,
          timezone: true,
          locale: true
        }
      })
      userData.photo = user.profile_picture_url || ''
      userData.phone = user.phone_number || ''
      userData.name = user.name || ''
      userData.timezone = user.timezone || null
      userData.locale = user.locale || null
      userData.master = Boolean(user.master)
      if (req.user.type === 'ADMIN') {
        userData.admin_permissions = user.master ? null : user.admin_permissions
      }

      const signature = helper.signResponseData(userData)

      success(res, {
        userData,
        signature
      })
    } catch (error) {
      next(error)
    }
  },
  verifySignature: function (req, res, next) {
    try {
      const { userData, signature } = req.body
      if (!helper.verifySignature(userData, signature)) throw createError(errorCodes.UNAUTHORIZED)

      success(res, { valid: true })
    } catch (error) {
      next(error)
    }
  },
  getAdminUsers: async function (req, res, next) {
    try {
      if (req.user.type !== 'ADMIN') throw createError(errorCodes.FORBIDDEN)
      await assertAdminPage(req, 'admins')
      const admins = await prisma.user.findMany({
        where: {
          user_type: 'ADMIN'
        },
        orderBy: {
          created_at: 'desc'
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone_number: true,
          active: true,
          created_at: true,
          master: true,
          admin_permissions: true
        }
      })
      success(res, { admins })
    } catch (error) {
      next(error)
    }
  },
  createAdminUser: async function (req, res, next) {
    try {
      if (req.user.type !== 'ADMIN') throw createError(errorCodes.FORBIDDEN)
      await assertAdminPage(req, 'admins')
      const requester = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { id: true, master: true, name: true }
      })
      if (!requester?.master) throw createError(errorCodes.FORBIDDEN)
      const { name, email, phone_number, master = false, admin_permissions: permBody } = req.body
      if (!name || !email) throw createError(errorCodes.MISSING_REQUIRED_DETAIL)
      const normalizedEmail = String(email).trim().toLowerCase()
      const existingAdmin = await prisma.user.findUnique({
        where: { email_user_type: { email: normalizedEmail, user_type: 'ADMIN' } },
        select: { id: true, is_deleted: true }
      })
      if (existingAdmin && existingAdmin.is_deleted !== true) {
        throw createError(errorCodes.ADMIN_ACCOUNT_EXISTS)
      }
      const generatedPassword = helper.generateRandomPassword()
      const hashPassword = await helper.hashPassword(generatedPassword)
      const isMaster = Boolean(master)
      let adminPermissions = isMaster ? null : normalizeIncomingPermissions(permBody || defaultFullPermissions())
      if (!isMaster && adminPermissions && adminPermissions.pages.length === 0) {
        adminPermissions = defaultFullPermissions()
      }
      const admin = await prisma.user.create({
        data: {
          name,
          email: normalizedEmail,
          phone_number: phone_number || null,
          user_type: 'ADMIN',
          active: true,
          is_self_signed_up: false,
          password_hash: hashPassword,
          master: isMaster,
          admin_permissions: adminPermissions
        },
        select: { id: true, name: true, email: true, phone_number: true, active: true, master: true, created_at: true, admin_permissions: true }
      })
      await helper.sendTemplatedEmail('welcomeCredentials', admin.email, {
        recipientName: admin.name,
        email: admin.email,
        password: generatedPassword,
        loginUrl: `${process.env.BASE_URL}/admin/auth/sign-in`,
        createdBy: requester.name || 'KADR Team'
      })
      success(res, { admin }, 'Admin user created successfully')
    } catch (error) {
      if (error?.code === 'P2002') {
        next(createError(errorCodes.ADMIN_ACCOUNT_EXISTS))
        return
      }
      next(error)
    }
  },
  updateAdminUser: async function (req, res, next) {
    try {
      if (req.user.type !== 'ADMIN') throw createError(errorCodes.FORBIDDEN)
      await assertAdminPage(req, 'admins')
      const requester = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { id: true, master: true }
      })
      if (!requester?.master) throw createError(errorCodes.FORBIDDEN)
      const { userId, name, email, phone_number, master, admin_permissions: permBody } = req.body
      if (!userId || !name || !email) throw createError(errorCodes.MISSING_REQUIRED_DETAIL)
      const target = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, user_type: true, master: true }
      })
      if (!target || target.user_type !== 'ADMIN') throw createError(errorCodes.NOT_FOUND)
      const nextMaster = master !== undefined ? Boolean(master) : undefined
      const data = {
        name,
        email,
        phone_number: phone_number || null
      }
      if (nextMaster !== undefined) {
        data.master = nextMaster
        if (nextMaster) {
          data.admin_permissions = null
        } else if (permBody !== undefined) {
          data.admin_permissions = normalizeIncomingPermissions(permBody)
        } else {
          data.admin_permissions = defaultFullPermissions()
        }
      } else if (permBody !== undefined && !target.master) {
        data.admin_permissions = normalizeIncomingPermissions(permBody)
      }
      const admin = await prisma.user.update({
        where: { id: userId },
        data,
        select: { id: true, name: true, email: true, phone_number: true, active: true, master: true, created_at: true, admin_permissions: true }
      })
      success(res, { admin }, 'Admin user updated successfully')
    } catch (error) {
      next(error)
    }
  },
  setAdminActiveStatus: async function (req, res, next) {
    try {
      if (req.user.type !== 'ADMIN') throw createError(errorCodes.FORBIDDEN)
      await assertAdminPage(req, 'admins')
      const requester = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { id: true, master: true }
      })
      if (!requester?.master) throw createError(errorCodes.FORBIDDEN)
      const { userId, active } = req.body
      if (!userId || typeof active !== 'boolean') throw createError(errorCodes.MISSING_REQUIRED_DETAIL)
      const target = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, user_type: true, master: true }
      })
      if (!target || target.user_type !== 'ADMIN') throw createError(errorCodes.NOT_FOUND)
      if (target.id === requester.id && active === false) throw createError(errorCodes.INVALID_REQUEST)
      await prisma.user.update({
        where: { id: userId },
        data: { active }
      })
      success(res, {}, `Admin user ${active ? 'activated' : 'inactivated'} successfully`)
    } catch (error) {
      next(error)
    }
  },
  getMediationData: async function (req, res, next) {
    try {
      const { caseId } = req.query
      if (!caseId) throw createError(errorCodes.REQUIRED_CASE_ID)
      await assertCaseAccessFromRequest(req, caseId)

      const caseRecord = await prisma.cases.findUnique({
        where: { id: caseId },
        select: {
          caseId: true,
          mediator: true,
          status: true,
          sub_status: true,
          case_agreement: true,
          user_cases_mediatorTouser: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      })
      if (!caseRecord) throw createError(errorCodes.CASE_NOT_FOUND)

      const events = await prisma.events.findMany({
        where: { case_id: caseId },
        select: {
          id: true,
          title: true,
          description: true,
          start_datetime: true,
          end_datetime: true,
          type: true,
          meeting_link: true,
          google_calendar_link: true,
          meeting_summary: true,
          mediator_next_steps: true,
          first_party_next_steps: true,
          second_party_next_steps: true,
          first_party_rating: true,
          second_party_rating: true,
          mediator_feedback_at: true,
          first_party_feedback_at: true,
          second_party_feedback_at: true
        }
      })

      success(res, {
        caseId,
        status: caseRecord.status,
        sub_status: caseRecord.sub_status,
        mediator: caseRecord.user_cases_mediatorTouser,
        events,
        agreement: null
      })
    } catch (error) {
      next(error)
    }
  },
  markCaseResolved: async function (req, res, next) {
    try {
      const { caseId, resolveStatus, agreementText, signature } = req.body
      if (!caseId || !resolveStatus || !agreementText || !signature) throw createError(errorCodes.MISSING_REQUIRED_DETAIL)
      await assertCaseAccessFromRequest(req, caseId, { requireMediator: true })

      const caseRecord = await prisma.cases.findUnique({
        where: { id: caseId },
        select: {
          id: true,
          caseId: true,
          mediator: true,
          status: true,
          category: true,
          case_type: true,
          created_at: true,
          user_cases_first_partyTouser: {
            select: {
              id: true,
              email: true,
              name: true
            }
          }
        }
      })
      if (!caseRecord) throw createError(errorCodes.CASE_NOT_FOUND)

      const agreementRecord = await prisma.case_agreement_tracking.create({
        data: {
          agreed_terms: sanitizeRichHtml(agreementText),
          signature_mediator: signature
        }
      })

      const { recordCaseMilestone } = require('../services/case/caseMilestoneService')
      await recordCaseMilestone(prisma, {
        caseId,
        subStatusId: CaseSubTypes.PENDING_MEDIATION_AGREEMENT_SIGN
      })

      await prisma.cases.update({
        where: { id: caseId },
        data: {
          case_agreement: agreementRecord.id,
          status: resolveStatus,
          sub_status: null
        }
      })

      analytics.trackCaseStatusChanged({
        req,
        actorUserId: req.user?.id,
        caseRecord,
        fromStatus: caseRecord.status,
        toStatus: resolveStatus
      })
      analytics.trackCaseClosed({
        req,
        actorUserId: req.user?.id,
        caseRecord,
        status: resolveStatus
      })

      const newSignatureRecord = await helper.createSignatureTrackingRecord(prisma, caseRecord.user_cases_first_partyTouser.id, null, agreementRecord.id)

      await helper.sendTemplatedEmail('finalAgreementSignatureRequest', caseRecord.user_cases_first_partyTouser.email, {
        recipientName: caseRecord.user_cases_first_partyTouser.name,
        caseId: caseRecord.caseId,
        signUrl: `${process.env.BASE_URL}/admin/agreement-signature?requestId=${newSignatureRecord.id}`,
        partyRole: 'first party'
      })

      if (caseRecord.mediator) {
        try {
          await awardRewardPoints({
            mediatorId: caseRecord.mediator,
            reasonCode: 'case_closed',
            referenceId: caseId
          })
        } catch (rewardErr) {
          console.error('Reward on case closed:', rewardErr)
        }
      }

      success(res, {}, 'Case marked as resolved!')
    } catch (error) {
      next(error)
    }
  },
  submitEventFeedback: async function (req, res, next) {
    try {
      const {
        event_id,
        meeting_summary,
        mediator_next_steps,
        first_party_next_steps,
        second_party_next_steps,
        first_party_rating,
        second_party_rating
      } = req.body
      if (!event_id) throw createError(errorCodes.MISSING_REQUIRED_DETAIL)

      const event = await prisma.events.findUnique({
        where: { id: event_id },
        select: {
          id: true,
          type: true,
          case_id: true,
          end_datetime: true,
          meeting_summary: true,
          mediator_next_steps: true,
          first_party_rating: true,
          second_party_rating: true,
          cases: {
            select: {
              id: true,
              mediator: true,
              first_party: true,
              second_party: true,
              first_party_representative: true,
              second_party_representative: true
            }
          }
        }
      })
      if (!event || !event.cases) throw createError(errorCodes.NOT_FOUND)
      if (event.type !== 'KADR' || !event.case_id) {
        throw createError(errorCodes.INVALID_REQUEST)
      }
      if (new Date(event.end_datetime) >= new Date()) {
        throw createError(errorCodes.INVALID_REQUEST)
      }

      const uid = req.user.id
      const userType = req.user.type
      const c = event.cases
      const data = {}

      // A representative acts on behalf of the party they represent, so treat them
      // exactly like that party (first/second) for feedback purposes.
      const actsAsFirstParty = c.first_party === uid ||
        (userType === 'REPRESENTATIVE' && c.first_party_representative === uid)
      const actsAsSecondParty = c.second_party === uid ||
        (userType === 'REPRESENTATIVE' && c.second_party_representative === uid)

      if (userType === 'MEDIATOR' && c.mediator === uid) {
        if (meeting_summary === undefined && mediator_next_steps === undefined) {
          throw createError(errorCodes.MISSING_REQUIRED_DETAIL)
        }
        if (meeting_summary !== undefined) data.meeting_summary = meeting_summary
        if (mediator_next_steps !== undefined) data.mediator_next_steps = mediator_next_steps
        const mergedSummary = data.meeting_summary !== undefined ? data.meeting_summary : event.meeting_summary
        const mergedSteps = data.mediator_next_steps !== undefined ? data.mediator_next_steps : event.mediator_next_steps
        if (mergedSummary && String(mergedSummary).trim() && mergedSteps && String(mergedSteps).trim()) {
          data.mediator_feedback_at = new Date()
        }
      } else if (actsAsFirstParty) {
        if (first_party_rating === undefined || first_party_rating === null) {
          throw createError(errorCodes.MISSING_REQUIRED_DETAIL)
        }
        const r = Number(first_party_rating)
        if (!Number.isInteger(r) || r < 1 || r > 5) throw createError(errorCodes.INVALID_REQUEST)
        data.first_party_rating = r
        if (first_party_next_steps !== undefined) data.first_party_next_steps = first_party_next_steps
        data.first_party_feedback_at = new Date()
      } else if (actsAsSecondParty) {
        if (second_party_rating === undefined || second_party_rating === null) {
          throw createError(errorCodes.MISSING_REQUIRED_DETAIL)
        }
        const r = Number(second_party_rating)
        if (!Number.isInteger(r) || r < 1 || r > 5) throw createError(errorCodes.INVALID_REQUEST)
        data.second_party_rating = r
        if (second_party_next_steps !== undefined) data.second_party_next_steps = second_party_next_steps
        data.second_party_feedback_at = new Date()
      } else {
        throw createError(errorCodes.FORBIDDEN)
      }

      const updated = await prisma.events.update({
        where: { id: event_id },
        data
      })

      if (userType === 'MEDIATOR' && updated.mediator_feedback_at && c.mediator === uid) {
        try {
          await awardRewardPoints({
            mediatorId: uid,
            reasonCode: 'meeting_feedback',
            referenceId: event_id
          })
        } catch (rewardErr) {
          console.error('Reward on meeting feedback:', rewardErr)
        }
      }

      analytics.trackMeetingFeedback({
        req,
        actorUserId: uid,
        meetingId: event_id,
        caseId: c.id || event.case_id,
        rating: data.first_party_rating ?? data.second_party_rating,
        party: userType === 'MEDIATOR' && c.mediator === uid
          ? 'mediator'
          : (actsAsFirstParty ? 'first_party' : (actsAsSecondParty ? 'second_party' : 'unknown'))
      })

      success(res, {}, 'Meeting feedback saved successfully')
    } catch (error) {
      next(error)
    }
  },
  getAdminActiveCases: async function (req, res, next) {
    try {
      if (req.user.type !== 'ADMIN') throw createError(errorCodes.FORBIDDEN)
      await assertAdminPage(req, 'cases')
      const page = parseInt(req.query.page, 10) || 1
      const filters = {
        mediatorId: req.query.mediatorId || null,
        firstPartyId: req.query.firstPartyId || null,
        secondPartyId: req.query.secondPartyId || null,
        status: req.query.status || null
      }
      const [casesWithEvents, total, caseEvents] = await Promise.all([
        helper.getAdminActiveCases(prisma, page, filters),
        helper.getAdminActiveCasesCount(prisma, filters),
        helper.getCaseEvents(prisma)
      ])
      success(res, {
        casesWithEvents: helper.mergeCaseHistory(casesWithEvents, caseEvents, {
          type: 'ADMIN'
        }),
        total,
        page,
        perPage: 10
      })
    } catch (error) {
      next(error)
    }
  },
  getAdminCaseManagementMeta: async function (req, res, next) {
    try {
      if (req.user.type !== 'ADMIN') throw createError(errorCodes.FORBIDDEN)
      await assertAdminPage(req, 'cases')
      const meta = await helper.getAdminCaseFilterMeta(prisma)
      success(res, { meta })
    } catch (error) {
      next(error)
    }
  },
  adminAssignCaseMediator: async function (req, res, next) {
    try {
      if (req.user.type !== 'ADMIN') throw createError(errorCodes.FORBIDDEN)
      await assertAdminPage(req, 'cases')
      const { caseId, mediatorId } = req.body
      if (!caseId || !mediatorId) throw createError(errorCodes.MISSING_REQUIRED_DETAIL)

      const [caseRecord, mediatorUser] = await Promise.all([
        prisma.cases.findUnique({
          where: { id: caseId },
          select: {
            id: true,
            caseId: true,
            first_party: true,
            second_party: true,
            status: true,
            mediator_commission: true,
            user_cases_first_partyTouser: { select: { name: true, email: true } },
            user_cases_second_partyTouser: { select: { name: true, email: true } }
          }
        }),
        prisma.user.findUnique({
          where: { id: mediatorId },
          select: { id: true, user_type: true, name: true, email: true, active: true, is_deleted: true }
        })
      ])

      if (!caseRecord) throw createError(errorCodes.CASE_NOT_FOUND)
      if (!mediatorUser || mediatorUser.user_type !== 'MEDIATOR') throw createError(errorCodes.NOT_FOUND)
      if (!mediatorUser.active || mediatorUser.is_deleted) throw createError(errorCodes.USER_NOT_ACTIVE)

      const activeStatuses = [CaseTypes.NEW, CaseTypes.IN_PROGRESS]
      if (!activeStatuses.includes(caseRecord.status)) {
        throw createError(errorCodes.INVALID_REQUEST)
      }
      const settingsRows = await getOrCreateSettings()
      const settingsMap = settingsToMap(settingsRows)

      await prisma.cases.update({
        where: { id: caseId },
        data: {
          mediator: mediatorId,
          mediator_commission: caseRecord.mediator_commission || Number(settingsMap.mediator_commission || 5),
          status: CaseTypes.IN_PROGRESS,
          sub_status: CaseSubTypes.MEDIATOR_ASSIGNED
        }
      })

      const { recordCaseMilestone } = require('../services/case/caseMilestoneService')
      await recordCaseMilestone(prisma, {
        caseId,
        subStatusId: CaseSubTypes.MEDIATOR_ASSIGNED
      })

      analytics.trackCaseStatusChanged({
        req,
        actorUserId: req.user?.id,
        caseRecord,
        fromStatus: caseRecord.status,
        toStatus: CaseTypes.IN_PROGRESS,
        toSubStatus: CaseSubTypes.MEDIATOR_ASSIGNED,
        extra: { transition: 'mediator_assigned' }
      })

      const {
        emailMediatorCaseAssigned,
        emailPartiesMediatorAssigned
      } = require('../services/meeting/meetingInvitationService')

      const label = caseRecord.caseId || 'your case'
      await Promise.all([
        emailMediatorCaseAssigned({
          mediatorEmail: mediatorUser.email,
          mediatorName: mediatorUser.name,
          caseNumber: label,
          firstPartyName: caseRecord.user_cases_first_partyTouser?.name,
          secondPartyName: caseRecord.user_cases_second_partyTouser?.name
        }).catch((err) => console.error('[assignMediator] mediator email failed', err.message)),
        emailPartiesMediatorAssigned({
          parties: [
            caseRecord.user_cases_first_partyTouser,
            caseRecord.user_cases_second_partyTouser
          ],
          mediatorName: mediatorUser.name,
          caseNumber: label
        })
      ])

      success(res, {}, 'Mediator assigned successfully.')
    } catch (error) {
      next(error)
    }
  },

  deleteMyAccount: async function (req, res, next) {
    try {
      if (req.user.type === 'ADMIN') throw createError(errorCodes.FORBIDDEN)
      const { confirm } = req.body
      if (!confirm) throw createError(errorCodes.MISSING_REQUIRED_DETAIL)

      if (req.user.type === 'MEDIATOR') {
        const { processOffboarding } = require('../services/mediator/mediatorOffboardingService')
        await processOffboarding({
          mediatorId: req.user.id,
          triggerType: 'SELF',
          caseAssignments: []
        })
      } else {
        await prisma.user.update({
          where: { id: req.user.id },
          data: { is_deleted: true, active: false }
        })
      }
      success(res, {}, 'Your account has been removed from the platform. Your data is retained securely for audit purposes.')
    } catch (error) {
      next(error)
    }
  },

  adminSetUserDeleted: async function (req, res, next) {
    try {
      if (req.user.type !== 'ADMIN') throw createError(errorCodes.FORBIDDEN)
      await assertAdminPage(req, 'users')
      const { userId, isDeleted } = req.body
      if (!userId || typeof isDeleted !== 'boolean') throw createError(errorCodes.INVALID_REQUEST)

      const target = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, user_type: true, master: true }
      })
      if (!target) throw createError(errorCodes.NOT_FOUND)
      if (target.user_type === 'ADMIN') throw createError(errorCodes.FORBIDDEN)

      if (isDeleted && target.user_type === 'MEDIATOR') {
        throw createError({
          errorCode: 'E322',
          message: 'Use the mediator removal wizard to reassign cases and review pending payouts before removing this mediator.',
          statusCode: 400
        })
      }

      await prisma.user.update({
        where: { id: userId },
        data: {
          is_deleted: isDeleted,
          ...(isDeleted ? { active: false } : {})
        }
      })
      success(res, {}, isDeleted ? 'User removed from the platform.' : 'User restored. Approve activation if they should log in again.')
    } catch (error) {
      next(error)
    }
  }
}
