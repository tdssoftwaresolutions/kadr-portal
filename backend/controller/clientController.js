const prisma = require('../lib/prisma.js')
const helper = require('../utils/helper')
const errorCodes = require('../utils/errors/errorCodes')
const { createError } = require('../utils/errors')
const { success } = require('../utils/responses')
const { CaseTypes } = require('../utils/caseConstants')
const { v4: uuidv4 } = require('uuid')
const { sanitizeBucketUrl } = require('../utils/uploadService')

const CLIENT_EMAIL_KEY = (email) => ({
  email_user_type: { email, user_type: 'CLIENT' }
})

module.exports = {

  newUserSignup: async function (req, res, next) {
    try {
      const { name, email, phone, phone_number: phoneNumber, city, state, pincode, description, category, preferredLanguage, evidenceContent, profilePictureContent, evidenceUrl, profilePictureUrl, oppositeName, oppositeEmail, oppositePhone, existingUser, adultPlatformLiabilityAck, representativeEmail, representativeName, representativePhone } = req.body
      // Web forms send `phone`; the mobile app sends `phone_number`.
      const phoneValue = phone || phoneNumber
      if (!adultPlatformLiabilityAck) {
        throw createError(errorCodes.INVALID_REQUEST)
      }
      // Files are uploaded directly to S3 by the browser (presigned URLs), so we
      // normally receive their object URLs. The legacy base64 fields are still
      // accepted as a fallback (e.g. older mobile clients) and uploaded here.
      let uploadedProfilePictureResponse = sanitizeBucketUrl(profilePictureUrl)
      if (!uploadedProfilePictureResponse && profilePictureContent) { uploadedProfilePictureResponse = await helper.deployToS3Bucket(profilePictureContent, `profile-picture-${uuidv4()}`) }
      const userRequestData = {
        name,
        email,
        phone_number: phoneValue,
        password_hash: '',
        user_type: 'CLIENT',
        active: false,
        city,
        state,
        preferred_languages: JSON.stringify([preferredLanguage]),
        profile_picture_url: uploadedProfilePictureResponse || '',
        pincode,
        is_self_signed_up: true,
        is_deleted: false
      }
      if (existingUser === true) {
        const generatedPassword = helper.generateRandomPassword()
        const hashPassword = await helper.hashPassword(generatedPassword)
        userRequestData.is_self_signed_up = true
        userRequestData.active = true
        userRequestData.password_hash = hashPassword
        await prisma.user.update({
          where: CLIENT_EMAIL_KEY(email),
          data: userRequestData
        })
        await helper.sendTemplatedEmail('welcomeCredentials', email, {
          recipientName: name,
          email,
          password: generatedPassword,
          loginUrl: `${process.env.BASE_URL}/admin/auth/sign-in`
        })
        success(res, {}, 'You are all set! Please check your email for the next steps.')
      } else {
        const existing = await prisma.user.findUnique({
          where: CLIENT_EMAIL_KEY(email),
          select: { id: true, active: true, is_deleted: true, is_self_signed_up: true }
        })
        if (existing) {
          if (existing.is_deleted) {
            await prisma.user.update({
              where: { id: existing.id },
              data: userRequestData
            })
          } else if (existing.active === false && existing.is_self_signed_up) {
            throw createError(errorCodes.REGISTRATION_PENDING_APPROVAL)
          } else {
            throw createError(errorCodes.CLIENT_ACCOUNT_EXISTS)
          }
        }
        let uploadedFileResponse = sanitizeBucketUrl(evidenceUrl)
        if (!uploadedFileResponse && evidenceContent) uploadedFileResponse = await helper.deployToS3Bucket(evidenceContent, `evidence-${uuidv4()}`)
        const user = existing?.is_deleted
          ? await prisma.user.findUnique({ where: CLIENT_EMAIL_KEY(email) })
          : await prisma.user.create({
            data: userRequestData
          })
        const oppositePartyUser = await prisma.user.upsert({
          where: CLIENT_EMAIL_KEY(String(oppositeEmail).trim().toLowerCase()),
          update: {},
          create: {
            name: oppositeName,
            email: String(oppositeEmail).trim().toLowerCase(),
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

        const createdCase = await prisma.cases.create({
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

        // Tag the signing-up client's representative (their lawyer), if provided.
        // The representative is created inactive and activated in lockstep when
        // the client account is approved (generalController.updateInactiveUser).
        if (representativeEmail) {
          try {
            const { attachRepresentativeToCase, PARTY_SIDES } = require('../services/case/representativeService')
            await attachRepresentativeToCase({
              caseId: createdCase.id,
              side: PARTY_SIDES.FIRST,
              representativeEmail,
              representativeName,
              representativePhone,
              caseNumber: createdCase.caseId,
              category,
              representedPartyName: name
            })
          } catch (repErr) {
            console.error('[signup] representative tagging failed', repErr.message)
          }
        }

        await helper.sendTemplatedEmail('registrationUnderReview', email, {
          recipientName: name
        })

        success(res, {}, 'Your account has been created successfully! Our team will review your details and get back to you shortly.')
      }
    } catch (error) {
      if (error.errorCode) {
        next(error)
        return
      }
      try {
        if (error.code === 'P2002' && (error.meta?.target?.includes('email') || error.meta?.target?.includes('uq_user_email_type'))) {
          throw createError(errorCodes.CLIENT_ACCOUNT_EXISTS)
        }
        throw createError(errorCodes.INVALID_REQUEST)
      } catch (err) {
        next(err)
      }
    }
  },

  /**
   * Logged-in client starts an additional case (no new user account).
   * Case stays in status "new" until admin sets case_type via approveCaseType.
   */
  initiateNewCase: async function (req, res, next) {
    try {
      if (req.user.type !== 'CLIENT') throw createError(errorCodes.FORBIDDEN)
      const {
        description,
        category,
        evidenceContent,
        oppositeName,
        oppositeEmail,
        oppositePhone,
        adultPlatformLiabilityAck,
        representativeEmail,
        representativeName,
        representativePhone
      } = req.body
      if (!adultPlatformLiabilityAck) {
        throw createError(errorCodes.INVALID_REQUEST, {
          message: 'Please confirm that you are 18+ and accept responsibility for your use of the platform.'
        })
      }
      const { createClientInitiatedCase } = require('../services/case/clientCaseService')
      const created = await createClientInitiatedCase({
        firstPartyUserId: req.user.id,
        description,
        category,
        evidenceContent,
        oppositeName,
        oppositeEmail,
        oppositePhone,
        representativeEmail,
        representativeName,
        representativePhone
      })
      try {
        await helper.sendTemplatedEmail('registrationUnderReview', req.user.email, {
          recipientName: req.user.name || 'Client'
        })
      } catch (_) { /* non-blocking */ }
      success(res, { case: created }, 'Your new case has been submitted. Our team will review and assign a case type shortly.')
    } catch (error) {
      next(error)
    }
  }
}
