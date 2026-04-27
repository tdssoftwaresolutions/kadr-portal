const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
const helper = require('../utils/helper')
const errorCodes = require('../utils/errors/errorCodes')
const { v4: uuidv4 } = require('uuid')
const { createError } = require('../utils/errors')
const { success } = require('../utils/responses')
const { CaseSubTypes, CaseTypes } = require('../utils/caseConstants')

module.exports = {
  getCalendarInit: async function (req, res, next) {
    try {
      const user = await prisma.user.findUnique({
        where: {
          id: req.user.id
        },
        select: {
          id: true
        }
      })
      if (user) {
        const events = await prisma.events.findMany({
          where: {
            created_by: user.id
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
                caseId: true
              }
            }
          }
        })
        success(res, {
          events
        })
      } else {
        throw createError(errorCodes.NOT_FOUND)
      }
    } catch (error) {
      next(error)
    }
  },
  getInactiveUsers: async function (req, res) {
    const type = req.query.type
    const relationField = type === 'CLIENT' ? 'cases_cases_first_partyTouser' : 'cases_cases_mediatorTouser'
    const inactiveUsers = await helper.getUsers(false, prisma, req.query.page, type, relationField)
    success(res, { inactiveUsers })
  },
  updateUserProfile: async function (req, res, next) {
    try {
      const userDetails = req.user
      const { name, phone_number, profile_picture, password } = req.body
      let uploadedProfilePictureResponse = null
      if (profile_picture) { uploadedProfilePictureResponse = await helper.deployToS3Bucket(profile_picture, `profile-picture-${uuidv4()}`) }
      await prisma.user.update({
        where: {
          id: userDetails.id
        },
        data: {
          name,
          phone_number,
          ...(uploadedProfilePictureResponse && { profile_picture_url: uploadedProfilePictureResponse }),
          ...(password && { password_hash: await helper.hashPassword(password) })
        }
      })
      success(res, {}, 'User profile updated successfully!')
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
          profile_picture_url: true
        }
      })

      if (!user) throw createError(errorCodes.USER_NOT_FOUND)
      console.log(type)
      switch (type) {
        case 'ADMIN': {
          const inactiveUsers = await helper.getUsers(false, prisma, 1, 'CLIENT', 'cases_cases_first_partyTouser')
          const inactiveMediators = await helper.getUsers(false, prisma, 1, 'MEDIATOR', 'cases_cases_mediatorTouser')
          const counts = await prisma.$transaction([
            prisma.cases.count(),
            prisma.user.count({
              where: {
                user_type: 'CLIENT',
                active: true
              }
            }),
            prisma.user.count({
              where: {
                user_type: 'MEDIATOR',
                active: true
              }
            })
          ])
          const totalCases = counts[0]
          const clientUsers = counts[1]
          const mediatorUsers = counts[2]
          dashboardContent.inactive_users = inactiveUsers
          dashboardContent.inactive_mediators = inactiveMediators
          dashboardContent.count = {
            cases: totalCases,
            clients: clientUsers,
            mediators: mediatorUsers
          }
          break
        }

        case 'MEDIATOR': {
          const [notes, casesWithEvents, casesCount, todaysPersonalMeetings] = await Promise.all([
            prisma.notes.findMany({
              where: {
                user_id: id
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
            helper.getTodaysPersonalMeetings(prisma, id)
          ])
          dashboardContent.myCases = {
            casesWithEvents,
            total: casesCount,
            page: 1,
            perPage: 10
          }
          dashboardContent.notes = notes
          dashboardContent.todaysEvent = helper.getTodaysEvents(casesWithEvents, todaysPersonalMeetings)
          dashboardContent.user = user
          break
        }

        case 'CLIENT': {
          const [casesWithEvents, clientNotifications, caseEvents] = await Promise.all([
            helper.getClientCases(prisma, id, 1),
            helper.getClientNotifications(prisma, id),
            helper.getCaseEvents(prisma)
          ])
          dashboardContent.myCases = helper.mergeCaseHistory(casesWithEvents, caseEvents)
          dashboardContent.notifications = clientNotifications
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
    const { isActive, caseId, userId, caseType } = req.body
    const generatedPassword = helper.generateRandomPassword()
    const hashPassword = await helper.hashPassword(generatedPassword)
    const updatedUser = await prisma.user.update({
      where: {
        id: userId
      },
      data: {
        active: isActive,
        password_hash: hashPassword
      },
      select: {
        name: true,
        email: true,
        phone_number: true
      }
    })
    if (caseId) {
      let caseSubStatus = ''
      switch (caseType) {
        case 'Mediation':
          caseSubStatus = CaseSubTypes.PENDING_NOTICE_PAYMENT
          break
        case 'Arbitrator':
          caseSubStatus = CaseSubTypes.PENDING_NOTICE_PAYMENT
          break
        case 'Counsellor':
          caseSubStatus = CaseSubTypes.PENDING_NOTICE_PAYMENT
          break
      }
      const newCase = await prisma.cases.update({
        where: {
          id: caseId
        },
        data: {
          case_type: caseType,
          status: CaseTypes.IN_PROGRESS,
          sub_status: caseSubStatus
        }
      })

      const caseEvent = await prisma.case_events.findFirst({
        where: {
          status_id: newCase.status,
          sub_status_id: newCase.sub_status
        }
      })

      await prisma.case_history.create({
        data: {
          case_id: newCase.id,
          case_event_id: caseEvent.id
        }
      })
    }
    const htmlBody = `
              <p>Thanks for registering on KADR.live. Your account is now active.</p>
              <p>To login, use below credentials:</p>
              <p>Username : ${updatedUser.email}</p>
              <p>Password : ${generatedPassword} <p>`
    await helper.sendEmail(updatedUser.name, updatedUser.email, 'Welcome to Kadr.live', htmlBody)
    success(res, {}, 'User updated successfully')
  },
  newCase: async function (req, res, next) {
    try {
      const {
        hearingDate,
        suitNo,
        party1,
        party1Email,
        party2,
        party2Email,
        institutionDate,
        natureOfSuit,
        stage,
        hearingCount,
        mediationDateTime,
        referralJudgeSignature,
        plaintiffPhone,
        plaintiffAdvocate,
        respondentPhone,
        respondentAdvocate,
        document,
        judgeId
      } = req.body.caseData

      async function createUser (email, name, phone) {
        const user = await prisma.user.create({
          data: {
            name,
            email,
            user_type: 'CLIENT',
            active: false,
            phone_number: phone
          },
          select: {
            id: true
          }
        })
        return user.id
      }

      const firstPartyId = await createUser(party1Email, party1, plaintiffPhone)
      const secondPartyId = await createUser(party2Email, party2, respondentPhone)

      let uploadedDocumentResponse = null
      if (document) { uploadedDocumentResponse = await helper.deployToS3Bucket(document, `case-reference-document-${uuidv4()}`) }

      const tracker = await prisma.caseIdTracker.findFirst()
      let newCaseId = 1
      if (tracker) {
        newCaseId = tracker.lastCaseId + 1
      }

      const newCaseRecord = await prisma.cases.create({
        data: {
          first_party: firstPartyId,
          second_party: secondPartyId,
          judge_document_url: uploadedDocumentResponse,
          nature_of_suit: natureOfSuit,
          stage,
          status: CaseTypes.NEW,
          sub_status: CaseSubTypes.PENDING_COMPLAINANT_SIGNATURE,
          caseId: `ROUSE-MED-${newCaseId}`,
          suit_no: suitNo,
          hearing_count: hearingCount,
          hearing_date: new Date(hearingDate),
          institution_date: new Date(institutionDate),
          mediation_date_time: new Date(mediationDateTime),
          referral_judge_signature: referralJudgeSignature,
          plaintiff_phone: plaintiffPhone,
          plaintiff_advocate: plaintiffAdvocate,
          respondent_phone: respondentPhone,
          judge: judgeId,
          respondent_advocate: respondentAdvocate
        }
      })

      await prisma.caseIdTracker.upsert({
        where: { id: 1 },
        update: { lastCaseId: newCaseId },
        create: { lastCaseId: newCaseId }
      })

      const newSignatureRecord = await helper.createSignatureTrackingRecord(prisma, firstPartyId, newCaseRecord.id, null)

      const htmlBody = `
      <div style="font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 30px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #dddddd; border-radius: 6px; padding: 30px;">
          <h2 style="color: #333333; font-size: 22px; margin-bottom: 20px;">Signature Verification Request</h2>
          <p style="font-size: 16px; color: #444444; line-height: 1.5;">
            Hi ${party1},
          </p>
          <p style="font-size: 16px; color: #444444; line-height: 1.5;">
            A mediation request in the matter of <strong>${party1} vs ${party2}</strong> (Case No. <strong>ROUSE-MED-${newCaseId}</strong>) has been initiated by <strong>Rouse Avenue Court</strong>. You are identified as the <strong>first party</strong> in this mediation case.
          </p>
          <p style="font-size: 16px; color: #444444; line-height: 1.5;">
            To proceed further, we kindly request you to review the case and provide your signature for verification.
          </p>
          <div style="margin: 25px 0;">
            <a href="${process.env.BASE_URL}/admin/signature?requestId=${newSignatureRecord.id}"
               style="display: inline-block; background-color: #3c78d8; color: #ffffff; text-decoration: none; padding: 12px 20px; border-radius: 4px; font-size: 16px;">
              Review & Sign Now
            </a>
          </div>
          <p style="font-size: 16px; color: #444444;">
            If you believe this message was sent to you in error, please contact our support team immediately.
          </p>
          <p style="font-size: 14px; color: #888888; margin-top: 30px; border-top: 1px solid #eeeeee; padding-top: 15px;">
            Regards,<br />
            Team Rouse Avenue Mediation Center
          </p>
        </div>
      </div>
    `
      await helper.sendEmail('Action Required – Signature Verification for Mediation Request', party1Email, htmlBody)

      success(res, {}, 'New case created successfully!')
    } catch (error) {
      next(error)
    }
  },
  getExistingUser: async function (req, res) {
    const token = req.headers.authorization
    const decryptedContent = await helper.verifyToken(token)
    const user = await prisma.user.findUnique({
      where: {
        id: decryptedContent.id
      },
      select: {
        id: true,
        email: true,
        phone_number: true,
        name: true
      }
    })
    success(res, { ...user })
  },
  getMyCases: async function (req, res, next) {
    try {
      const { id, type } = req.user
      const { page } = req.query

      if (!id || !type) throw createError(errorCodes.UNAUTHORIZED)

      switch (type) {
        case 'MEDIATOR':{
          const [casesWithEvents, casesCount] = await Promise.all([
            helper.getMediatorCases(prisma, id, page),
            helper.getMediatorCasesCount(prisma, id)
          ])
          success(res, {
            casesWithEvents, total: casesCount, page, perPage: 10
          })
          break
        }
        case 'CLIENT': {
          const [casesWithEvents, casesCount] = await Promise.all([
            helper.getJudgeCases(prisma, id, page),
            helper.getJudgeCasesCount(prisma, id)
          ])
          success(res, {
            casesWithEvents, total: casesCount, page, perPage: 10
          })
          break
        }
        case 'ADMIN': {
          break
        }
      }
    } catch (error) {
      next(error)
    }
  },
  deleteNote: async function (req, res, next) {
    try {
      await prisma.notes.delete({
        where: {
          id: req.body.id
        }
      })
      success(res, {}, 'Your note has been deleted successfully!')
    } catch (error) {
      next(error)
    }
  },
  saveNote: async function (req, res, next) {
    try {
      const { content, id } = req.body
      const user = req.user
      const response = await prisma.notes.upsert({
        where: {
          id
        },
        update: {
          note_text: content
        },
        create: {
          note_text: content,
          user_id: user.id
        }
      })
      success(res, {
        noteId: response.id
      }, 'Your note has been successfully saved!')
    } catch (error) {
      next(error)
    }
  },
  newCalendarEvent: async function (req, res, next) {
    try {
      const { title, description, start, end, type, caseId } = req.body
      const [lCase] = await Promise.all([
        caseId == null
          ? {}
          : prisma.cases.findUnique({
            where: {
              id: caseId
            },
            select: {
              user_cases_first_partyTouser: {
                select: {
                  email: true
                }
              },
              user_cases_second_partyTouser: {
                select: {
                  email: true
                }
              }
            }
          })
      ])
      let attendees = [{ email: req.user.email }]
      if (lCase.user_cases_first_partyTouser) { attendees.push({ email: lCase?.user_cases_first_partyTouser?.email }) }
      if (lCase.user_cases_second_partyTouser) { attendees.push({ email: lCase?.user_cases_second_partyTouser?.email }) }

      const zoomMeeting = await helper.scheduleMeeting(title, description, start, attendees)

      await prisma.events.create({
        data: {
          title,
          description,
          start_datetime: start,
          end_datetime: end,
          type: type.toUpperCase(),
          meeting_link: zoomMeeting.meetingLink,
          created_by: req.user.id,
          case_id: caseId
        }
      })

      success(res, {
        meetLink: zoomMeeting.meetingLink
      }, 'Event created successfully')
    } catch (err) {
      next(err)
    }
  },
  getActiveUsers: async function (req, res) {
    try {
      const { page = 1, type } = req.query

      if (type) {
        // Fetch data for a specific user type
        const relationField = type === 'CLIENT' ? 'cases_cases_first_partyTouser' : 'cases_cases_mediatorTouser'
        const activeUsers = await helper.getUsers(true, prisma, page, type, relationField)
        res.json({ success: true, users: activeUsers.users, total: activeUsers.total })
      } else {
        // Fetch both clients and mediators
        const [activeClients, activeMediators] = await Promise.all([
          helper.getUsers(true, prisma, page, 'CLIENT', 'cases_cases_first_partyTouser'),
          helper.getUsers(true, prisma, page, 'MEDIATOR', 'cases_cases_mediatorTouser')
        ])

        const combinedUsers = [...activeClients.users, ...activeMediators.users]
        res.json({ success: true, users: combinedUsers, total: combinedUsers.length })
      }
    } catch (error) {
      console.error('Error fetching active users:', error)
      res.status(500).json({ success: false, message: 'Failed to fetch active users' })
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

      await prisma.cases.update({
        where: {
          id: caseId
        },
        data: {
          status: CaseTypes.IN_PROGRESS,
          sub_status: CaseSubTypes.PENDING_MEDIATION_PAYMENT
        }
      })

      await prisma.notifications.create({
        data: {
          user_id: caseRecord.first_party,
          title: 'Opposite party has accepted the mediation request',
          description: 'Opposite party has accepted the mediation request, please go ahead and make the payment to start the mediation'
        }
      })

      await prisma.notifications.create({
        data: {
          user_id: caseRecord.second_party,
          title: 'Opposite party has accepted the mediation request',
          description: 'Opposite party has accepted the mediation request, please go ahead and make the payment to start the mediation'
        }
      })
      success(res, {}, 'Mediation request accepted successfully!')
    } catch (error) {
      next(error)
    }
  },
  newUserSignup: async function (req, res, next) {
    try {
      const { name, email, phone, city, state, pincode, description, category, preferredLanguage, evidenceContent, profilePictureContent, oppositeName, oppositeEmail, oppositePhone, existingUser } = req.body
      let uploadedProfilePictureResponse = null
      if (profilePictureContent) { uploadedProfilePictureResponse = await helper.deployToS3Bucket(profilePictureContent, `profile-picture-${uuidv4()}`) }
      const userRequestData = {
        name,
        email,
        phone_number: phone,
        password_hash: '',
        user_type: 'CLIENT',
        active: false,
        city,
        state,
        preferred_languages: JSON.stringify([preferredLanguage]),
        profile_picture_url: uploadedProfilePictureResponse || '',
        pincode,
        is_self_signed_up: true
      }
      if (existingUser === true) {
        const generatedPassword = helper.generateRandomPassword()
        const hashPassword = await helper.hashPassword(generatedPassword)
        userRequestData.is_self_signed_up = true
        userRequestData.active = true
        userRequestData.password_hash = hashPassword
        await prisma.user.update({
          where: {
            email
          },
          data: userRequestData
        })
        const htmlBody = `
              <p>Thanks for registering on KADR.live. Your account is now active.</p>
              <p>To login, use below credentials:</p> 
              <p>Username : ${email}</p> 
              <p>Password : ${generatedPassword} <p>`
        await helper.sendEmail(name, email, 'Welcome aboard!', htmlBody)
        success(res, {}, 'You are all set! Please check your email for the next steps.')
      } else {
        let uploadedFileResponse = null
        if (evidenceContent) uploadedFileResponse = await helper.deployToS3Bucket(evidenceContent, `evidence-${uuidv4()}`)
        const user = await prisma.user.create({
          data: userRequestData
        })
        const oppositePartyUser = await prisma.user.upsert({
          where: {
            email: oppositeEmail
          },
          update: {

          },
          create: {
            name: oppositeName,
            email: oppositeEmail,
            phone_number: oppositePhone,
            password_hash: '',
            is_self_signed_up: false,
            user_type: 'CLIENT',
            active: false
          }
        })

        const tracker = await prisma.caseIdTracker.findFirst()
        let newCaseId = 1
        if (tracker) {
          newCaseId = tracker.lastCaseId + 1
        }

        await prisma.cases.create({
          data: {
            first_party: user.id,
            second_party: oppositePartyUser.id,
            evidence_document_url: uploadedFileResponse || '',
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
        await helper.sendEmail(name, email, 'Welcome aboard!', '<p>Thanks for registering on KADR.live. Your account is under review, and you\'ll be notified once approved by the KADR team.</p>')

        success(res, {}, 'Your account has been created successfully! Our team will review your details and get back to you shortly.')
      }
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
          name: true
        }
      })
      userData.photo = user.profile_picture_url || ''
      userData.phone = user.phone_number || ''
      userData.name = user.name || ''

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
  getMediationData: async function (req, res, next) {
    try {
      const { caseId } = req.query
      if (!caseId) throw createError(errorCodes.REQUIRED_CASE_ID)

      // Fetch the case record with status, sub_status, and agreement tracking
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

      // Fetch all events for this case, including related event_feedback
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
          event_feedback_id: true,
          event_feedback_events_event_feedback_idToevent_feedback: {
            select: {
              id: true,
              first_party_present: true,
              second_party_present: true,
              summary_of_meeting: true,
              created_at: true,
              updated_at: true
            }
          }
        }
      })

      let agreement = null
      if (caseRecord.case_agreement) {
        agreement = await prisma.case_agreement_tracking.findUnique({
          where: {
            id: caseRecord.case_agreement
          },
          select: {
            id: true,
            agreed_terms: true,
            signature_mediator: true,
            first_party_signature: true,
            second_party_signature: true,
            created_at: true,
            updated_at: true
          }
        })
      }

      success(res, {
        caseId,
        status: caseRecord.status,
        sub_status: caseRecord.sub_status,
        mediator: caseRecord.user_cases_mediatorTouser,
        events,
        agreement
      })
    } catch (error) {
      next(error)
    }
  },
  markCaseResolved: async function (req, res, next) {
    try {
      const { caseId, resolveStatus, agreementText, signature } = req.body
      if (!caseId || !resolveStatus || !agreementText || !signature) throw createError(errorCodes.MISSING_REQUIRED_DETAIL)

      const caseRecord = await prisma.cases.findUnique({
        where: { id: caseId },
        select: {
          id: true,
          caseId: true,
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
          agreed_terms: agreementText,
          signature_mediator: signature
        }
      })

      await prisma.cases.update({
        where: { id: caseId },
        data: {
          case_agreement: agreementRecord.id,
          status: resolveStatus,
          sub_status: null
        }
      })

      const newSignatureRecord = await helper.createSignatureTrackingRecord(prisma, caseRecord.user_cases_first_partyTouser.id, null, agreementRecord.id)

      const htmlBody = `
      <div style="font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 30px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #dddddd; border-radius: 6px; padding: 30px;">
          <h2 style="color: #333333; font-size: 22px; margin-bottom: 20px;">Mediation Resolved – Final Agreement Signature</h2>
          <p style="font-size: 16px; color: #444444; line-height: 1.5;">
            Hi ${caseRecord.user_cases_first_partyTouser.name},
          </p>
          <p style="font-size: 16px; color: #444444; line-height: 1.5;">
            Congratulations! The mediation initiated at <strong>Rouse Avenue Court</strong> (Case No. <strong>${caseRecord.caseId}</strong>) has been successfully resolved. You are identified as the <strong>first party</strong> in this mediation case.
          </p>
          <p style="font-size: 16px; color: #444444; line-height: 1.5;">
            To complete the process, we require your signature on the final agreement.
          </p>
          <div style="margin: 25px 0;">
            <a href="${process.env.BASE_URL}/admin/agreement-signature?requestId=${newSignatureRecord.id}"
               style="display: inline-block; background-color: #3c78d8; color: #ffffff; text-decoration: none; padding: 12px 20px; border-radius: 4px; font-size: 16px;">
              Review & Sign Final Agreement
            </a>
          </div>
          <p style="font-size: 16px; color: #444444;">
            If you believe this message was sent to you in error, or you have any questions, please contact our support team.
          </p>
          <p style="font-size: 14px; color: #888888; margin-top: 30px; border-top: 1px solid #eeeeee; padding-top: 15px;">
            Regards,<br />
            Team Rouse Avenue Mediation Center
          </p>
        </div>
      </div>
    `

      await helper.sendEmail('Final Step – Signature Required for Mediation Agreement', caseRecord.user_cases_first_partyTouser.email, htmlBody)

      success(res, {}, 'Case marked as resolved!')
    } catch (error) {
      next(error)
    }
  },
  submitEventFeedback: async function (req, res, next) {
    try {
      const { event_feedback, event_id } = req.body
      if (!event_feedback || !event_id) throw createError(errorCodes.MISSING_REQUIRED_DETAIL)

      const feedbackRecord = await prisma.event_feedback.create({
        data: {
          first_party_present: event_feedback.first_party_present,
          second_party_present: event_feedback.second_party_present,
          summary_of_meeting: event_feedback.summary
        }
      })

      await prisma.events.update({
        where: { id: event_id },
        data: { event_feedback_id: feedbackRecord.id }
      })

      success(res, {}, 'Event feedback submitted successfully')
    } catch (error) {
      next(error)
    }
  }
}
