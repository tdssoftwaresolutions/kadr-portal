const express = require('express')
const authController = require('../../controller/authController')
const authMiddleware = require('../../middleware/authMiddleware')
const { authLimiter, otpLimiter } = require('../../middleware/rateLimitMiddleware')
const validate = require('../../middleware/validate')
const { loginSchema, resetPasswordSchema, confirmPasswordChangeSchema } = require('../../utils/validationSchemas')

const router = express.Router()

router.post('/login', authLimiter, validate(loginSchema), authController.login)
router.post('/google-login', authLimiter, authController.googleLogin)
router.post('/refresh-token', authLimiter, authController.refreshToken)
router.get('/logout', authController.logout)
router.get('/authenticateWithGoogle', authMiddleware, authController.authenticateWithGoogle)
router.get('/googleCallback', authController.googleCallback)
router.post('/resetPassword', authLimiter, validate(resetPasswordSchema), authController.resetPassword)
router.post('/confirmPasswordChange', authLimiter, validate(confirmPasswordChangeSchema), authController.confirmPasswordChange)
router.post('/sendOtp', otpLimiter, authController.sendOtp)
router.post('/verifyOTP', otpLimiter, authController.verifyOtp)
router.get('/isEmailExist', authLimiter, authController.isEmailExist)
router.get('/getGoogleToken', authMiddleware, authController.getGoogleToken)

module.exports = router
