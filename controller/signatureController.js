const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
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
          user_id: true
        }
      })

      if (!signatureTracking) throw createError(errorCodes.NO_RECORD_FOUND)

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
          user_cases_second_partyTouser: {
            select: {
              id: true,
              email: true,
              name: true
            }
          },
          user_cases_first_partyTouser: {
            select: {
              name: true
            }
          }
        }
      })

      if (!caseRecord) throw createError(errorCodes.NO_RECORD_FOUND)

      let sendRequestToSecondParty = false

      const updateData = {}
      if (signatureTracking.user_id === caseRecord.first_party) {
        updateData.plaintiff_signature = signature // Update plaintiff_signature
        updateData.status = CaseTypes.NEW
        updateData.sub_status = CaseSubTypes.PENDING_SECOND_PARTY_SIGNATURE // Set sub_status to pending second party signatur
        sendRequestToSecondParty = true
      } else if (signatureTracking.user_id === caseRecord.second_party) {
        updateData.respondent_signature = signature // Update respondent_signature
        updateData.status = CaseTypes.NEW
        updateData.sub_status = CaseSubTypes.PENDING_MEDIATION_CENTER
      } else { throw createError(errorCodes.NO_RECORD_FOUND) }

      if (sendRequestToSecondParty === true) {
        const newSignatureRecord = await helper.createSignatureTrackingRecord(prisma, caseRecord.second_party, caseRecord.id, null)
        const htmlBody = `
        <div style="font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 30px;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #dddddd; border-radius: 6px; padding: 30px;">
            <h2 style="color: #333333; font-size: 22px; margin-bottom: 20px;">Signature Verification Request</h2>
            <p style="font-size: 16px; color: #444444; line-height: 1.5;">
              Hi ${caseRecord.user_cases_second_partyTouser.name},
            </p>
            <p style="font-size: 16px; color: #444444; line-height: 1.5;">
              A mediation request  in the matter of <strong>${caseRecord.user_cases_first_partyTouser.name} vs ${caseRecord.user_cases_second_partyTouser.name}</strong> (Case No. <strong>${caseRecord.caseId}</strong>) has been initiated by <strong>Rouse Avenue Court</strong>. You are identified as the <strong>second party</strong> in this mediation case.
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

        await helper.sendEmail('Action Required – Signature Verification for Mediation Request', caseRecord.user_cases_second_partyTouser.email, htmlBody)
      }

      await prisma.cases.update({
        where: { id: caseRecord.id },
        data: updateData
      })

      success(res, {}, 'Signature submitted successfully')
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
        include: {
          user: true,
          cases: true
        }
      })

      if (!signatureTracking) throw createError(errorCodes.NO_RECORD_FOUND)

      const caseData = await prisma.cases.findUnique({
        where: { id: signatureTracking.case_id },
        select: {
          id: true,
          created_at: true,
          updated_at: true,
          mediator: true,
          caseId: true,
          judge_document_url: true,
          nature_of_suit: true,
          stage: true,
          status: true,
          sub_status: true,
          hearing_date: true,
          institution_date: true,
          mediation_date_time: true,
          referral_judge_signature: true,
          plaintiff_signature: true,
          plaintiff_phone: true,
          plaintiff_advocate: true,
          respondent_signature: true,
          respondent_phone: true,
          respondent_advocate: true,
          judge: true,
          suit_no: true,
          hearing_count: true,
          user_cases_first_partyTouser: {
            select: {
              id: true,
              name: true
            }
          },
          user_cases_second_partyTouser: {
            select: {
              id: true,
              name: true
            }
          },
          user_cases_judgeTouser: {
            select: {
              id: true,
              name: true
            }
          }
        }
      })

      if (!caseData) throw createError(errorCodes.NO_RECORD_FOUND)

      let userName = ''
      let isFirstPaty = false
      if (caseData.user_cases_first_partyTouser.id === signatureTracking.user_id) {
        userName = caseData.user_cases_first_partyTouser.name
        isFirstPaty = true
      } else if (caseData.user_cases_second_partyTouser.id === signatureTracking.user_id) {
        userName = caseData.user_cases_second_partyTouser.name
        isFirstPaty = false
      }

      success(res, {
        caseData, userName, isFirstPaty
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
          case_agreement_id: true
        }
      })

      if (!signatureTracking) throw createError(errorCodes.NO_RECORD_FOUND)

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
            nature_of_suit: true,
            created_at: true,
            first_party: true,
            second_party: true,
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
            },
            user_cases_judgeTouser: {
              select: {
                name: true,
                email: true,
                id: true
              }
            }
          }
        })
      }

      let sendRequestToSecondParty = false
      let generateAgeement = false

      const updateData = {}
      if (signatureTracking.user_id === caseRecord.first_party) {
        updateData.first_party_signature = signature
        updateData.first_party_signature_datetime = new Date()
        sendRequestToSecondParty = true
        generateAgeement = false
      } else if (signatureTracking.user_id === caseRecord.second_party) {
        updateData.second_party_signature = signature
        updateData.second_party_signature_datetime = new Date()
        generateAgeement = true
        sendRequestToSecondParty = false
      } else { throw createError(errorCodes.NO_RECORD_FOUND) }

      if (sendRequestToSecondParty === true) {
        const newSignatureRecord = await helper.createSignatureTrackingRecord(prisma, caseRecord.second_party, null, signatureTracking.case_agreement_id)

        const htmlBody = `
        <div style="font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 30px;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #dddddd; border-radius: 6px; padding: 30px;">
            <h2 style="color: #333333; font-size: 22px; margin-bottom: 20px;">Mediation Resolved – Final Agreement Signature</h2>
            <p style="font-size: 16px; color: #444444; line-height: 1.5;">
              Hi ${caseRecord.user_cases_second_partyTouser.name},
            </p>
            <p style="font-size: 16px; color: #444444; line-height: 1.5;">
              Congratulations! The mediation initiated at <strong>Rouse Avenue Court</strong> (Case No. <strong>${caseRecord.caseId}</strong>) has been successfully resolved. You are identified as the <strong>second party</strong> in this mediation case.
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

        await helper.sendEmail('Final Step – Signature Required for Mediation Agreement', caseRecord.user_cases_second_partyTouser.email, htmlBody)
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
          judgeName: caseRecord.user_cases_judgeTouser?.name || ''
        }

        const html = helper.generateMediationHTML(mediationData)

        const tempDir = os.tmpdir()
        const tempPdfPath = path.join(tempDir, `mediation_document_${uuidv4()}.pdf`)
        const browser = await puppeteer.launch()
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

        const htmlBody = `
        <div style="font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 30px;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #dddddd; border-radius: 6px; padding: 30px;">
            <h2 style="color: #333333; font-size: 22px; margin-bottom: 20px;">Signed Agreement Available</h2>
            <p style="font-size: 16px; color: #444444; line-height: 1.5;">
              Hi,
            </p>
            <p style="font-size: 16px; color: #444444; line-height: 1.5;">
              This is regarding the mediation case <strong>#${caseRecord.caseId}</strong> between <strong>${caseRecord.user_cases_first_partyTouser.name}</strong> vs <strong>${caseRecord.user_cases_second_partyTouser.name}</strong>.
            </p>
            <p style="font-size: 16px; color: #444444; line-height: 1.5;">
              Please find below the link to the signed agreement for your reference:
            </p>
            <div style="margin: 25px 0;">
              <a href="${updateData.mediation_agreement_link}"
                 style="display: inline-block; background-color: #3c78d8; color: #ffffff; text-decoration: none; padding: 12px 20px; border-radius: 4px; font-size: 16px;">
                View Signed Agreement
              </a>
            </div>
            <p style="font-size: 14px; color: #888888; margin-top: 30px; border-top: 1px solid #eeeeee; padding-top: 15px;">
              Regards,<br />
              Team Rouse Avenue Mediation Center
            </p>
          </div>
        </div>
      `
        await helper.sendEmail('Signed Agreement – Rouse Avenue Mediation Center', caseRecord.user_cases_second_partyTouser.email, htmlBody)
        await helper.sendEmail('Signed Agreement – Rouse Avenue Mediation Center', caseRecord.user_cases_first_partyTouser.email, htmlBody)
        await helper.sendEmail('Signed Agreement – Rouse Avenue Mediation Center', caseRecord.user_cases_mediatorTouser.email, htmlBody)
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
            nature_of_suit: true,
            created_at: true,
            case_agreement: true,
            plaintiff_phone: true,
            respondent_phone: true,
            user_cases_mediatorTouser: {
              select: {
                name: true
              }
            },
            user_cases_first_partyTouser: {
              select: {
                id: true,
                name: true
              }
            },
            user_cases_second_partyTouser: {
              select: {
                id: true,
                name: true
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
      let isFirstPaty = false
      if (caseRecord.user_cases_first_partyTouser.id === signatureTracking.user_id) {
        userName = caseRecord.user_cases_first_partyTouser.name
        phoneNumber = caseRecord.plaintiff_phone
        isFirstPaty = true
      } else if (caseRecord.user_cases_second_partyTouser.id === signatureTracking.user_id) {
        userName = caseRecord.user_cases_second_partyTouser.name
        phoneNumber = caseRecord.respondent_phone
        isFirstPaty = false
      }

      success(res, {
        caseId: caseRecord.caseId,
        caseType: caseRecord.nature_of_suit,
        dateOfCaseRegistration: caseRecord.created_at,
        mediationCompletionDate,
        mediatorName: caseRecord.user_cases_mediatorTouser?.name || null,
        numberOfSessions,
        sessionDates,
        outcomeOfMediation,
        userName,
        firstPartyName: caseRecord.user_cases_first_partyTouser.name,
        secondPartyName: caseRecord.user_cases_second_partyTouser.name,
        isFirstPaty,
        partyPhoneNumber: phoneNumber
      })
    } catch (error) {
      next(error)
    }
  }
}
