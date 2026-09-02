const prisma = require('../lib/prisma.js')
const helper = require('../utils/helper')
const errorCodes = require('../utils/errors/errorCodes')
const { createError } = require('../utils/errors')
const { CaseSubTypes, CaseTypes } = require('../utils/caseConstants')
const { success } = require('../utils/responses')
const { v4: uuidv4 } = require('uuid')
const { resolveReferrerMediatorId, ensureMediatorReferralCode } = require('../utils/referralCode')

module.exports = {
  assignMediator: async function (req, res, next) {
    try {
      const { caseId, mediatorId } = req.body

      if (!caseId || !mediatorId) throw createError(errorCodes.MISSING_REQUIRED_DETAIL)

      const mediator = await prisma.user.findUnique({
        where: { id: mediatorId },
        select: { id: true, user_type: true, email: true, google_token: true }
      })

      if (!mediator || mediator.user_type !== 'MEDIATOR') throw createError(errorCodes.NOT_FOUND)

      await prisma.cases.update({
        where: { id: caseId },
        data: { mediator: mediatorId, status: CaseTypes.IN_PROGRESS, sub_status: CaseSubTypes.MEDIATOR_ASSIGNED }
      })

      const { recordCaseMilestone } = require('../services/case/caseMilestoneService')
      await recordCaseMilestone(prisma, {
        caseId,
        subStatusId: CaseSubTypes.MEDIATOR_ASSIGNED
      })

      const caseDetails = await prisma.cases.findUnique({
        where: { id: caseId },
        select: {
          caseId: true,
          category: true,
          mediation_date_time: true,
          user_cases_first_partyTouser: { select: { email: true, name: true } },
          user_cases_second_partyTouser: { select: { email: true, name: true } }
        }
      })

      const {
        emailMediatorCaseAssigned,
        emailPartiesMediatorAssigned
      } = require('../services/meeting/meetingInvitationService')
      const mediatorProfile = await prisma.user.findUnique({
        where: { id: mediatorId },
        select: { name: true, email: true }
      })
      const pushEvents = require('../services/push/pushEvents')
      await Promise.all([
        emailMediatorCaseAssigned({
          mediatorEmail: mediatorProfile?.email,
          mediatorName: mediatorProfile?.name,
          caseNumber: caseDetails.caseId,
          firstPartyName: caseDetails.user_cases_first_partyTouser?.name,
          secondPartyName: caseDetails.user_cases_second_partyTouser?.name,
          category: caseDetails.category
        }).catch((err) => console.error('[assignMediator] mediator email failed', err.message)),
        emailPartiesMediatorAssigned({
          parties: [
            caseDetails.user_cases_first_partyTouser,
            caseDetails.user_cases_second_partyTouser
          ],
          mediatorName: mediatorProfile?.name,
          caseNumber: caseDetails.caseId
        }),
        // Web push: notify the mediator of the new assignment.
        pushEvents.notifyUser({
          userId: mediatorId,
          category: 'case_assignment',
          title: 'New case assigned',
          body: `You have been assigned to case ${caseDetails.caseId}.`,
          data: { url: '/admin/cases', caseId: caseDetails.caseId }
        }).catch((err) => console.error('[assignMediator] mediator push failed', err.message))
      ])

      if (!mediator.google_token) throw createError(errorCodes.GOOGLE_CALENDAR_NOT_CONNECTED)

      const oauth2Client = await helper.getValidAccessToken(prisma, JSON.parse(mediator.google_token).credentials)

      const title = `Mediation Meeting for Case ${caseDetails.caseId}`
      const description = `Parties Involved: ${caseDetails.user_cases_first_partyTouser.name}, ${caseDetails.user_cases_second_partyTouser.name}

This meeting has been scheduled to discuss the details of case ${caseDetails.caseId} between the involved parties.

Purpose:
To review the case, facilitate open communication, and work towards a mutual resolution.

Please Note:
1. Be prepared with all relevant documents and information.
2. Join the meeting on time to ensure a smooth and productive session.

Issued by: Kadr.live`
      const start = new Date(caseDetails.mediation_date_time)
      const end = new Date(start.getTime() + 30 * 60000)
      const attendees = [
        { email: mediator.email },
        { email: caseDetails.user_cases_first_partyTouser.email },
        { email: caseDetails.user_cases_second_partyTouser.email }
      ]

      const googleEventResponse = await helper.createGoogleEvent(title, description, start, end, attendees, caseId + '-' + mediatorId, oauth2Client)

      await prisma.events.create({
        data: {
          title,
          description,
          start_datetime: start,
          end_datetime: end,
          type: 'KADR',
          meeting_link: googleEventResponse.data.conferenceData.entryPoints[0].uri,
          google_calendar_link: googleEventResponse.data.htmlLink,
          created_by: mediatorId,
          case_id: caseId
        }
      })

      success(res, {}, 'Mediator assigned and first meeting initiated successfully')
    } catch (error) {
      next(error)
    }
  },
  getAvailableMediators: async function (req, res, next) {
    try {
      const { caseId } = req.query

      if (!caseId) throw createError(errorCodes.MISSING_REQUIRED_DETAIL)

      const caseRecord = await prisma.cases.findUnique({
        where: { id: caseId },
        select: {
          mediation_date_time: true,
          user_cases_mediatorTouser: {
            select: {
              id: true,
              name: true,
              email: true,
              phone_number: true
            }
          }
        }
      })

      if (!caseRecord || !caseRecord.mediation_date_time) throw createError(errorCodes.NO_RECORD_FOUND)

      const mediationDate = new Date(caseRecord.mediation_date_time)
      const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      const mediationDay = daysOfWeek[mediationDate.getDay()]

      const mediators = await prisma.user.findMany({
        where: {
          user_type: 'MEDIATOR',
          working_day_of_week: {
            equals: mediationDay
          }
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone_number: true,
          cases_cases_mediatorTouser: {
            select: {
              id: true,
              caseId: true,
              case_type: true,
              category: true,
              status: true
            }
          }
        }
      })

      if (mediators.length === 0) throw createError(errorCodes.NO_RECORD_FOUND)

      success(res, {
        mediators,
        assignedMediator: caseRecord.user_cases_mediatorTouser || null
      })
    } catch (error) {
      next(error)
    }
  },
  newMediatorSignup: async function (req, res, next) {
    try {
      const {
        name, email, phone, city, state, pincode, preferredLanguages, llbCollege, llbUniversity, llbYear,
        profilePictureContent, mediatorCourseYear, mcpcCertificateContent, llbCertificateContent,
        preferredAreaOfPractice, selectedHearingTypes, barEnrollmentNo, referralCode
      } = req.body.userDetails || req.body

      let uploadedMCPCFileResponse = null; let uploadedLLbFileResponse = null; let uploadedProfilePictureResponse = null
      if (mcpcCertificateContent) { uploadedMCPCFileResponse = await helper.deployToS3Bucket(mcpcCertificateContent, `mcpc-certificate-${uuidv4()}`) }
      if (llbCertificateContent) { uploadedLLbFileResponse = await helper.deployToS3Bucket(llbCertificateContent, `llb-certificate-${uuidv4()}`) }
      if (profilePictureContent) { uploadedProfilePictureResponse = await helper.deployToS3Bucket(profilePictureContent, `profile-picture-${uuidv4()}`) }

      const referredById = await resolveReferrerMediatorId(prisma, referralCode)

      const signupData = {
        name,
        email,
        phone_number: phone,
        password_hash: '',
        user_type: 'MEDIATOR',
        active: false,
        is_deleted: false,
        city,
        state,
        preferred_languages: JSON.stringify(preferredLanguages),
        pincode,
        is_self_signed_up: true,
        llb_college: llbCollege,
        llb_university: llbUniversity,
        llb_year: llbYear,
        mediator_course_year: mediatorCourseYear,
        mcpc_certificate_url: uploadedMCPCFileResponse || '',
        llb_certificate_url: uploadedLLbFileResponse || '',
        profile_picture_url: uploadedProfilePictureResponse || '',
        preferred_area_of_practice: JSON.stringify(preferredAreaOfPractice),
        selected_hearing_types: JSON.stringify(selectedHearingTypes),
        bar_enrollment_no: barEnrollmentNo,
        referred_by_id: referredById
      }

      const existing = await prisma.user.findUnique({
        where: {
          email_user_type: {
            email,
            user_type: 'MEDIATOR'
          }
        },
        select: { id: true, active: true, is_deleted: true, is_self_signed_up: true, user_type: true }
      })

      let mediatorUserId = null
      if (existing) {
        if (existing.is_deleted) {
          await prisma.user.update({
            where: { id: existing.id },
            data: signupData
          })
          mediatorUserId = existing.id
        } else if (existing.active === false && existing.is_self_signed_up) {
          throw createError(errorCodes.REGISTRATION_PENDING_APPROVAL)
        } else {
          throw createError(errorCodes.MEDIATOR_ACCOUNT_EXISTS)
        }
      } else {
        const created = await prisma.user.create({ data: signupData })
        mediatorUserId = created.id
      }

      if (mediatorUserId) {
        await ensureMediatorReferralCode(prisma, mediatorUserId)
      }

      await helper.addLanguagesToDatabase(preferredLanguages, prisma)
      await helper.sendTemplatedEmail('registrationUnderReview', email, {
        recipientName: name,
        roleLabel: 'Dispute Resolution Expert'
      })

      success(res, {}, 'User created successfully! Your account is under review, and you\'ll be notified once approved by the Kadr team.')
    } catch (error) {
      if (error.errorCode) {
        next(error)
        return
      }
      try {
        if (error.code === 'P2002' && (error.meta?.target?.includes('email') || error.meta?.target?.includes('uq_user_email_type'))) {
          throw createError(errorCodes.MEDIATOR_ACCOUNT_EXISTS)
        }
        throw createError(errorCodes.INVALID_REQUEST)
      } catch (err) {
        next(err)
      }
    }
  },
  listAllMediatorsWithCases: async function (req, res, next) {
    try {
      const mediators = await prisma.user.findMany({
        where: { user_type: 'MEDIATOR' },
        select: {
          id: true,
          name: true,
          phone_number: true,
          email: true,
          cases_cases_mediatorTouser: {
            select: {
              id: true,
              caseId: true,
              status: true,
              sub_status: true
            }
          }
        }
      })
      success(res, { mediators })
    } catch (error) {
      next(error)
    }
  }
}
