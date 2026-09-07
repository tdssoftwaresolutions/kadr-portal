const prisma = require('../lib/prisma.js')
const helper = require('../utils/helper')
const puppeteer = require('puppeteer')
const path = require('path')
const fs = require('fs')
const errorCodes = require('../utils/errors/errorCodes')
const { v4: uuidv4 } = require('uuid')
const os = require('os')
const { createError } = require('../utils/errors')
const { CaseSubTypes, CaseTypes } = require('../utils/caseConstants')
const { success } = require('../utils/responses')
const { ensureInvoiceForCase } = require('../services/invoice/invoiceService')
const analytics = require('../utils/analytics')

// A verified OTP is valid for this long before a submit must re-verify.
const OTP_VERIFICATION_TTL_MS = 15 * 60 * 1000

/**
 * Server-side guard: a signature submission is only accepted when a fresh OTP
 * was verified for this exact signature request. Closes the gap where the
 * previous flow trusted the frontend to have gated submission behind OTP.
 * @param {{ otp_verified_at: Date|null }} signatureTracking
 */
function assertOtpVerified (signatureTracking) {
  const verifiedAt = signatureTracking && signatureTracking.otp_verified_at
  if (!verifiedAt) throw createError(errorCodes.OTP_NOT_VERIFIED)
  const age = Date.now() - new Date(verifiedAt).getTime()
  if (age > OTP_VERIFICATION_TTL_MS) throw createError(errorCodes.OTP_NOT_VERIFIED)
}

module.exports = {
  submitSignature: async function (req, res, next) {
    try {
      const { requestId, signature } = req.body

      if (!requestId || !signature) throw createError(errorCodes.MISSING_REQUIRED_DETAIL)

      const signatureTracking = await prisma.signature_tracking.findUnique({
        where: { id: requestId },
        select: {
          id: true,
          signed: true,
          case_id: true,
          user_id: true,
          otp_verified_at: true
        }
      })

      if (!signatureTracking || !signatureTracking.case_id) throw createError(errorCodes.NO_RECORD_FOUND)
      if (signatureTracking.signed) {
        success(res, {}, 'This acknowledgment was already submitted.')
        return
      }
      assertOtpVerified(signatureTracking)

      await prisma.signature_tracking.update({
        where: { id: requestId },
        data: { signed: true }
      })

      const caseRecord = await prisma.cases.findUnique({
        where: { id: signatureTracking.case_id },
        select: {
          id: true,
          first_party: true,
          caseId: true,
          second_party: true,
          case_type: true,
          user_cases_second_partyTouser: {
            select: {
              id: true,
              email: true,
              name: true
            }
          },
          user_cases_first_partyTouser: {
            select: {
              id: true,
              name: true
            }
          }
        }
      })

      if (!caseRecord) throw createError(errorCodes.NO_RECORD_FOUND)

      const isFirstParty = signatureTracking.user_id === caseRecord.first_party
      const isSecondParty = signatureTracking.user_id === caseRecord.second_party
      if (!isFirstParty && !isSecondParty) throw createError(errorCodes.NO_RECORD_FOUND)

      // Signature payload is verified via OTP; tracking row records acceptance.
      // Case columns no longer store plaintiff/respondent signature blobs (Kadr schema).
      if (isFirstParty && caseRecord.second_party) {
        const newSignatureRecord = await helper.createSignatureTrackingRecord(
          prisma,
          caseRecord.second_party,
          caseRecord.id,
          null
        )
        await helper.sendTemplatedEmail('signatureVerificationRequest', caseRecord.user_cases_second_partyTouser.email, {
          recipientName: caseRecord.user_cases_second_partyTouser.name,
          caseId: caseRecord.caseId,
          caseTitle: `${caseRecord.user_cases_first_partyTouser.name} vs ${caseRecord.user_cases_second_partyTouser.name}`,
          signUrl: `${process.env.BASE_URL}/admin/signature?requestId=${newSignatureRecord.id}`,
          partyRole: 'second party'
        })
      } else if (isSecondParty) {
        // Both parties have acknowledged — enter standard Kadr payment pipeline
        await prisma.cases.update({
          where: { id: caseRecord.id },
          data: {
            status: CaseTypes.IN_PROGRESS,
            sub_status: CaseSubTypes.PENDING_NOTICE_PAYMENT,
            case_type: caseRecord.case_type || 'Mediation'
          }
        })
        try {
          const { recordCaseMilestone } = require('../services/case/caseMilestoneService')
          await recordCaseMilestone(prisma, {
            caseId: caseRecord.id,
            statusId: CaseTypes.IN_PROGRESS,
            subStatusId: CaseSubTypes.PENDING_NOTICE_PAYMENT
          })
        } catch (_) { /* non-blocking */ }
        analytics.trackCaseStatusChanged({
          req,
          actorUserId: signatureTracking.user_id,
          caseRecord: { id: caseRecord.id, caseId: caseRecord.caseId, case_type: caseRecord.case_type },
          toStatus: CaseTypes.IN_PROGRESS,
          toSubStatus: CaseSubTypes.PENDING_NOTICE_PAYMENT,
          extra: { transition: 'both_parties_acknowledged' }
        })
      }

      success(res, {}, 'Acknowledgment submitted successfully')
    } catch (error) {
      next(error)
    }
  },
  getSignatureRequestDetails: async function (req, res, next) {
    try {
      const { requestId } = req.query

      if (!requestId) throw createError(errorCodes.MISSING_REQUIRED_DETAIL)

      const signatureTracking = await prisma.signature_tracking.findFirst({
        where: {
          id: requestId,
          signed: false
        },
        select: {
          id: true,
          user_id: true,
          case_id: true
        }
      })

      if (!signatureTracking || !signatureTracking.case_id) throw createError(errorCodes.NO_RECORD_FOUND)

      const caseData = await prisma.cases.findUnique({
        where: { id: signatureTracking.case_id },
        select: {
          id: true,
          caseId: true,
          case_type: true,
          category: true,
          description: true,
          created_at: true,
          status: true,
          user_cases_first_partyTouser: {
            select: {
              id: true,
              name: true,
              phone_number: true
            }
          },
          user_cases_second_partyTouser: {
            select: {
              id: true,
              name: true,
              phone_number: true
            }
          }
        }
      })

      if (!caseData) throw createError(errorCodes.NO_RECORD_FOUND)

      let userName = ''
      let partyPhoneNumber = null
      let isFirstParty = false
      if (caseData.user_cases_first_partyTouser?.id === signatureTracking.user_id) {
        userName = caseData.user_cases_first_partyTouser.name
        partyPhoneNumber = caseData.user_cases_first_partyTouser.phone_number
        isFirstParty = true
      } else if (caseData.user_cases_second_partyTouser?.id === signatureTracking.user_id) {
        userName = caseData.user_cases_second_partyTouser.name
        partyPhoneNumber = caseData.user_cases_second_partyTouser.phone_number
        isFirstParty = false
      } else {
        throw createError(errorCodes.NO_RECORD_FOUND)
      }

      success(res, {
        caseId: caseData.caseId,
        caseType: caseData.case_type || null,
        category: caseData.category || null,
        description: caseData.description || null,
        filedAt: caseData.created_at,
        firstPartyName: caseData.user_cases_first_partyTouser?.name || null,
        secondPartyName: caseData.user_cases_second_partyTouser?.name || null,
        userName,
        isFirstParty,
        partyPhoneNumber
      })
    } catch (error) {
      next(error)
    }
  },

  submitAgreementSignature: async function (req, res, next) {
    try {
      const { requestId, signature } = req.body

      if (!requestId || !signature) throw createError(errorCodes.MISSING_REQUIRED_DETAIL)

      const signatureTracking = await prisma.signature_tracking.findUnique({
        where: { id: requestId },
        select: {
          id: true,
          signed: true,
          user_id: true,
          case_agreement_id: true,
          otp_verified_at: true
        }
      })

      if (!signatureTracking) throw createError(errorCodes.NO_RECORD_FOUND)
      assertOtpVerified(signatureTracking)

      await prisma.signature_tracking.update({
        where: { id: requestId },
        data: { signed: true }
      })

      let caseRecord = null

      if (signatureTracking.case_agreement_id) {
        caseRecord = await prisma.cases.findFirst({
          where: { case_agreement: signatureTracking.case_agreement_id },
          select: {
            id: true,
            caseId: true,
            created_at: true,
            case_agreement: true,
            user_cases_mediatorTouser: {
              select: {
                name: true,
                email: true
              }
            },
            user_cases_first_partyTouser: {
              select: {
                id: true,
                name: true,
                email: true
              }
            },
            user_cases_second_partyTouser: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        })
      }

      let sendRequestToSecondParty = false
      let generateAgeement = false

      const updateData = {}
      if (signatureTracking.user_id === caseRecord.user_cases_first_partyTouser.id) {
        updateData.first_party_signature = signature
        updateData.first_party_signature_datetime = new Date()
        sendRequestToSecondParty = true
        generateAgeement = false
      } else if (signatureTracking.user_id === caseRecord.user_cases_second_partyTouser.id) {
        updateData.second_party_signature = signature
        updateData.second_party_signature_datetime = new Date()
        generateAgeement = true
        sendRequestToSecondParty = false
      } else { throw createError(errorCodes.NO_RECORD_FOUND) }

      if (sendRequestToSecondParty === true) {
        const newSignatureRecord = await helper.createSignatureTrackingRecord(prisma, caseRecord.user_cases_second_partyTouser.id, null, signatureTracking.case_agreement_id)

        await helper.sendTemplatedEmail('finalAgreementSignatureRequest', caseRecord.user_cases_second_partyTouser.email, {
          recipientName: caseRecord.user_cases_second_partyTouser.name,
          caseId: caseRecord.caseId,
          signUrl: `${process.env.BASE_URL}/admin/agreement-signature?requestId=${newSignatureRecord.id}`,
          partyRole: 'second party'
        })
      }

      if (generateAgeement === true) {
        const agreement = await prisma.case_agreement_tracking.findUnique({
          where: { id: signatureTracking.case_agreement_id },
          select: {
            id: true,
            created_at: true,
            agreed_terms: true,
            first_party_signature: true,
            second_party_signature: true,
            signature_mediator: true,
            first_party_signature_datetime: true,
            second_party_signature_datetime: true
          }
        })

        const mediationData = {
          caseId: caseRecord.caseId,
          mediationCompletionDate: agreement?.created_at || null,
          mediatorName: caseRecord.user_cases_mediatorTouser?.name || null,
          mutualAgreement: agreement?.agreed_terms || null,
          firstPartyName: caseRecord.user_cases_first_partyTouser?.name || '',
          secondPartyName: caseRecord.user_cases_second_partyTouser?.name || '',
          firstPartySignatureImage: agreement?.first_party_signature || '',
          secondPartySignatureImage: agreement?.second_party_signature || updateData.second_party_signature || '',
          firstPartySignatureDateTime: agreement?.first_party_signature_datetime || '',
          secondPartySignatureDateTime: agreement?.second_party_signature_datetime || updateData.second_party_signature_datetime || '',
          mediatorSignatureImage: agreement?.signature_mediator || '',
          judgeName: ''
        }

        const html = helper.generateMediationHTML(mediationData)

        const tempDir = os.tmpdir()
        const tempPdfPath = path.join(tempDir, `mediation_document_${uuidv4()}.pdf`)
        const browser = await puppeteer.launch({
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox']
        })
        const page = await browser.newPage()
        await page.setContent(html, { waitUntil: 'networkidle0' })
        await page.pdf({
          path: tempPdfPath,
          format: 'A4',
          printBackground: true,
          margin: { top: '5mm', bottom: '5mm' }
        })
        await browser.close()

        const pdfBuffer = fs.readFileSync(tempPdfPath)
        const pdfBase64 = pdfBuffer.toString('base64')
        updateData.mediation_agreement_link = await helper.deployToS3Bucket(pdfBase64, `case-agreement-${uuidv4()}`)
        fs.unlinkSync(tempPdfPath)

        await helper.sendTemplatedEmail('signedAgreementAvailable', caseRecord.user_cases_second_partyTouser.email, {
          recipientName: caseRecord.user_cases_second_partyTouser.name,
          caseId: caseRecord.caseId,
          agreementUrl: updateData.mediation_agreement_link
        })
        await helper.sendTemplatedEmail('signedAgreementAvailable', caseRecord.user_cases_first_partyTouser.email, {
          recipientName: caseRecord.user_cases_first_partyTouser.name,
          caseId: caseRecord.caseId,
          agreementUrl: updateData.mediation_agreement_link
        })
        await helper.sendTemplatedEmail('signedAgreementAvailable', caseRecord.user_cases_mediatorTouser.email, {
          recipientName: caseRecord.user_cases_mediatorTouser.name,
          caseId: caseRecord.caseId,
          agreementUrl: updateData.mediation_agreement_link
        })

        await ensureInvoiceForCase(caseRecord.id)
      }

      await prisma.case_agreement_tracking.update({
        where: { id: signatureTracking.case_agreement_id },
        data: updateData
      })

      success(res, {}, 'Signature submitted successfully!')
    } catch (error) {
      next(error)
    }
  },

  getAgreementDetailsForSignature: async function (req, res, next) {
    try {
      const { id } = req.query
      if (!id) throw createError(errorCodes.MISSING_REQUIRED_DETAIL)

      const signatureTracking = await prisma.signature_tracking.findUnique({
        where: { id },
        select: {
          signed: true,
          case_agreement_id: true,
          user_id: true,
          case_agreement_tracking: {
            select: {
              id: true,
              created_at: true,
              agreed_terms: true
            }
          }
        }
      })
      if (!signatureTracking || signatureTracking.signed) throw createError(errorCodes.NOT_FOUND)

      let caseRecord = null
      if (signatureTracking.case_agreement_id) {
        caseRecord = await prisma.cases.findFirst({
          where: { case_agreement: signatureTracking.case_agreement_id },
          select: {
            id: true,
            caseId: true,
            case_type: true,
            created_at: true,
            case_agreement: true,
            user_cases_mediatorTouser: {
              select: {
                name: true
              }
            },
            user_cases_first_partyTouser: {
              select: {
                id: true,
                name: true,
                phone_number: true
              }
            },
            user_cases_second_partyTouser: {
              select: {
                id: true,
                name: true,
                phone_number: true
              }
            }
          }
        })
      }
      if (!caseRecord || !caseRecord.case_agreement) throw createError(errorCodes.NOT_FOUND)

      let mediationCompletionDate = null
      let outcomeOfMediation = null
      const agreement = signatureTracking.case_agreement_tracking
      if (agreement) {
        mediationCompletionDate = agreement.created_at
        outcomeOfMediation = agreement.agreed_terms
      }

      const events = await prisma.events.findMany({
        where: { case_id: caseRecord.id },
        orderBy: {
          start_datetime: 'desc'
        },
        select: {
          id: true,
          start_datetime: true
        }
      })

      const sessionDates = events.map(e => e.start_datetime)
      const numberOfSessions = events.length

      let userName = ''
      let phoneNumber = null
      let isFirstParty = false
      if (caseRecord.user_cases_first_partyTouser.id === signatureTracking.user_id) {
        userName = caseRecord.user_cases_first_partyTouser.name
        phoneNumber = caseRecord.user_cases_first_partyTouser.phone_number
        isFirstParty = true
      } else if (caseRecord.user_cases_second_partyTouser.id === signatureTracking.user_id) {
        userName = caseRecord.user_cases_second_partyTouser.name
        phoneNumber = caseRecord.user_cases_second_partyTouser.phone_number
        isFirstParty = false
      } else {
        throw createError(errorCodes.NO_RECORD_FOUND)
      }

      const { sanitizeRichHtml } = require('../utils/htmlSanitizer')

      success(res, {
        caseId: caseRecord.caseId,
        caseType: caseRecord.case_type || null,
        filedAt: caseRecord.created_at,
        mediationCompletionDate,
        mediatorName: caseRecord.user_cases_mediatorTouser?.name || null,
        numberOfSessions,
        sessionDates,
        outcomeOfMediation: sanitizeRichHtml(outcomeOfMediation || ''),
        userName,
        firstPartyName: caseRecord.user_cases_first_partyTouser.name,
        secondPartyName: caseRecord.user_cases_second_partyTouser.name,
        isFirstParty,
        partyPhoneNumber: phoneNumber
      })
    } catch (error) {
      next(error)
    }
  }
}
