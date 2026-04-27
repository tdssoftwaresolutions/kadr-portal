const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
const helper = require('../utils/helper')
const errorCodes = require('../utils/errors/errorCodes')
const { createError } = require('../utils/errors')
const { CaseSubTypes, CaseTypes } = require('../utils/caseConstants')
const { success } = require('../utils/responses')
const { v4: uuidv4 } = require('uuid')

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

      const caseDetails = await prisma.cases.findUnique({
        where: { id: caseId },
        select: {
          caseId: true,
          mediation_date_time: true,
          user_cases_first_partyTouser: { select: { email: true, name: true } },
          user_cases_second_partyTouser: { select: { email: true, name: true } }
        }
      })

      if (!mediator.google_token) throw createError(errorCodes.GOOGLE_CALENDAR_NOT_CONNECTED)

      const oauth2Client = await helper.getValidAccessToken(prisma, JSON.parse(mediator.google_token).credentials)

      const title = `Mediation Meeting for Case ${caseDetails.caseId}`
      const description = `Parties Involved: ${caseDetails.user_cases_first_partyTouser.name}, ${caseDetails.user_cases_second_partyTouser.name}

This meeting has been scheduled to discuss the details of case ${caseDetails.caseId} between the involved parties.

📌 Purpose:
To review the case, facilitate open communication, and work towards a mutual resolution.

📅 Please Note:
1. Be prepared with all relevant documents and information.
2. Join the meeting on time to ensure a smooth and productive session.

Issued by: Rouse Avenue Mediation Court`
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
          type: 'ROUSE',
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
              nature_of_suit: true,
              stage: true,
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
      const { name, email, phone, city, state, pincode, preferredLanguages, llbCollege, llbUniversity, llbYear, profilePictureContent, mediatorCourseYear, mcpcCertificateContent, llbCertificateContent, preferredAreaOfPractice, selectedHearingTypes, barEnrollmentNo } = req.body.userDetails

      let uploadedMCPCFileResponse = null; let uploadedLLbFileResponse = null; let uploadedProfilePictureResponse = null
      if (mcpcCertificateContent) { uploadedMCPCFileResponse = await helper.deployToS3Bucket(mcpcCertificateContent, `mcpc-certificate-${uuidv4()}`) }
      if (llbCertificateContent) { uploadedLLbFileResponse = await helper.deployToS3Bucket(llbCertificateContent, `llb-certificate-${uuidv4()}`) }
      if (profilePictureContent) { uploadedProfilePictureResponse = await helper.deployToS3Bucket(profilePictureContent, `profile-picture-${uuidv4()}`) }

      await prisma.user.create({
        data: {
          name,
          email,
          phone_number: phone,
          password_hash: '',
          user_type: 'MEDIATOR',
          active: false,
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
          bar_enrollment_no: barEnrollmentNo
        }
      })

      await helper.addLanguagesToDatabase(preferredLanguages, prisma)
      await helper.sendEmail(name, email, 'Welcome aboard', 'Thanks for registering on KADR.live as a Dispute Resolution Expert. Your account is under review, and you\'ll be notified once approved by the KADR team.')

      success(res, {}, 'User created successfully! Your account is under review, and you\'ll be notified once approved by the KADR team.')
    } catch (error) {
      try {
        if (error.code === 'P2002' && error.meta.target.includes('email')) {
          throw createError(errorCodes.YOU_USER_ALREADY_EXISTS)
        } else {
          throw createError(errorCodes.INVALID_REQUEST)
        }
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
