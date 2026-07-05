const prisma = require('../lib/prisma.js')
const helper = require('../utils/helper')
const errorCodes = require('../utils/errors/errorCodes')
const { createError } = require('../utils/errors')
const { success } = require('../utils/responses')
const { CaseTypes } = require('../utils/caseConstants')
const { v4: uuidv4 } = require('uuid')

module.exports = {

  newUserSignup: async function (req, res, next) {
    try {
      const { name, email, phone, city, state, pincode, description, category, preferredLanguage, evidenceContent, profilePictureContent, oppositeName, oppositeEmail, oppositePhone, existingUser, adultPlatformLiabilityAck } = req.body
      if (!adultPlatformLiabilityAck) {
        throw createError(errorCodes.INVALID_REQUEST)
      }
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
          where: {
            email
          },
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
          where: { email },
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
            throw createError(errorCodes.YOU_USER_ALREADY_EXISTS)
          }
        }
        let uploadedFileResponse = null
        if (evidenceContent) uploadedFileResponse = await helper.deployToS3Bucket(evidenceContent, `evidence-${uuidv4()}`)
        const user = existing?.is_deleted
          ? await prisma.user.findUnique({ where: { email } })
          : await prisma.user.create({
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
        if (error.code === 'P2002' && error.meta?.target?.includes('email')) {
          throw createError(errorCodes.YOU_USER_ALREADY_EXISTS)
        }
        throw createError(errorCodes.INVALID_REQUEST)
      } catch (err) {
        next(err)
      }
    }
  }
}
