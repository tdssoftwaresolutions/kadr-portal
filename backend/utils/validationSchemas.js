const { z } = require('zod')

/**
 * Zod validation schemas for API endpoints.
 * Used with the validate() middleware.
 */

const loginSchema = z.object({
  username: z.string().email('Please enter a valid email address.'),
  password: z.string().min(1, 'Password is required.'),
  userType: z.string().optional()
})

// Shared optional phone validator. The web signup forms send `phone` while the
// mobile app sends `phone_number`; schemas accept whichever is present.
const optionalPhone = z.string()
  .min(10, 'Phone number must be at least 10 digits.')
  .max(15, 'Phone number is too long.')
  .regex(/^[+]?[\d\s-]+$/, 'Invalid phone number format.')
  .optional()
  .or(z.literal(''))

// The client self-signup form (frontend/views/ClientControllers/SignUpClient.vue)
// posts a camelCase payload and does NOT collect a password (client accounts
// are activated later with a generated password). Validate the fields the form
// actually sends.
const clientSignupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters.').max(255, 'Name is too long.'),
  email: z.string().email('Please enter a valid email address.'),
  phone: optionalPhone, // web sends `phone`
  phone_number: optionalPhone, // mobile sends `phone_number`
  city: z.string().max(100).optional().or(z.literal('')),
  state: z.string().max(100).optional().or(z.literal('')),
  pincode: z.string().max(6).optional().or(z.literal('')),
  representativeEmail: z.string().email('Please enter a valid representative email address.'),
  representativeName: z.string().max(255).optional().or(z.literal('')),
  representativePhone: z.string()
    .min(10, 'Representative phone number must be at least 10 digits.')
    .max(15, 'Representative phone number is too long.')
    .regex(/^[+]?[\d\s-]+$/, 'Invalid representative phone number format.')
    .optional()
    .or(z.literal('')),
  // Object URLs returned by the direct-to-S3 presigned upload flow.
  evidenceUrl: z.string().url().max(1024).optional().or(z.literal('')),
  profilePictureUrl: z.string().url().max(1024).optional().or(z.literal(''))
}).passthrough() // Allow additional fields

// The mediator self-signup form (frontend/views/MediatorControllers/SignUpMediator.vue)
// posts a camelCase `userDetails` object and does NOT collect a password
// (mediator accounts are activated later via password reset). Validate the
// fields the form actually sends.
const mediatorSignupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters.').max(255, 'Name is too long.'),
  email: z.string().email('Please enter a valid email address.'),
  phone: optionalPhone, // web sends `phone`
  phone_number: optionalPhone, // mobile sends `phone_number`
  city: z.string().max(100).optional().or(z.literal('')),
  state: z.string().max(100).optional().or(z.literal('')),
  pincode: z.string().max(6).optional().or(z.literal('')),
  barEnrollmentNo: z.string().max(255).optional().or(z.literal('')),
  llbCollege: z.string().max(255).optional().or(z.literal('')),
  llbUniversity: z.string().max(255).optional().or(z.literal('')),
  // Accepts either a short human code (e.g. "ABC123") or a full mediator UUID
  // (36 chars), which resolveReferrerMediatorId() also supports as referral input.
  referralCode: z.string().max(64).optional().or(z.literal('')),
  // Object URLs returned by the direct-to-S3 presigned upload flow.
  mcpcCertificateUrl: z.string().url().max(1024).optional().or(z.literal('')),
  llbCertificateUrl: z.string().url().max(1024).optional().or(z.literal('')),
  profilePictureUrl: z.string().url().max(1024).optional().or(z.literal(''))
}).passthrough().refine(
  (data) => Boolean(data.phone || data.phone_number),
  { message: 'Phone number is required.', path: ['phone'] }
)

const resetPasswordSchema = z.object({
  emailAddress: z.string().email('Please enter a valid email address.'),
  userType: z.string().optional()
})

const confirmPasswordChangeSchema = z.object({
  emailAddress: z.string().email('Please enter a valid email address.'),
  otp: z.union([z.string().min(4, 'Invalid OTP.'), z.number()]),
  password: z.string().min(8, 'Password must be at least 8 characters.').max(128, 'Password is too long.'),
  userType: z.string().optional()
})

const paymentInitiateSchema = z.object({
  purpose: z.string().min(1, 'Payment purpose is required.'),
  caseId: z.string().optional().or(z.literal('')),
  amount: z.number().positive().optional()
})

module.exports = {
  loginSchema,
  clientSignupSchema,
  mediatorSignupSchema,
  resetPasswordSchema,
  confirmPasswordChangeSchema,
  paymentInitiateSchema
}
