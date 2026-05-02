const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
const helper = require('../utils/helper')
const errorCodes = require('../utils/errors/errorCodes')
const { createError } = require('../utils/errors')
const { success } = require('../utils/responses')
const { CaseTypes } = require('../utils/caseConstants')
const { v4: uuidv4 } = require('uuid')

module.exports = {

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
              <p>Thanks for registering on Kadr.live. Your account is now active.</p>
              <p>To login, use below credentials:</p> 
              <p>Username : ${email}</p> 
              <p>Password : ${generatedPassword} <p>
              <p style="margin-top: 20px;">
                Click the button below to login:
              </p>

              <p style="text-align: center; margin: 20px 0;">
                <a href="${process.env.BASE_URL}/admin/auth/sign-in"
                  style="background-color: #4CAF50; color: #ffffff; padding: 12px 20px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">
                  Login to Your Account
                </a>
              </p>
        `
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
        await helper.sendEmail(name, email, 'Thanks for registering on Kadr.live!', '<p>Thanks for registering on Kadr.live. Your account is under review, and you\'ll be notified once approved by the KADR team.</p>')

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
  }
}
