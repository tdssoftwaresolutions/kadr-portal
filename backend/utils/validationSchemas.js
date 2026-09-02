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

const clientSignupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters.').max(255, 'Name is too long.'),
  email: z.string().email('Please enter a valid email address.'),
  password: z.string().min(8, 'Password must be at least 8 characters.').max(128, 'Password is too long.'),
  phone_number: z.string()
    .min(10, 'Phone number must be at least 10 digits.')
    .max(15, 'Phone number is too long.')
    .regex(/^[+]?[\d\s-]+$/, 'Invalid phone number format.')
    .optional()
    .or(z.literal('')),
  city: z.string().max(100).optional().or(z.literal('')),
  state: z.string().max(100).optional().or(z.literal('')),
  pincode: z.string().max(6).optional().or(z.literal('')),
  referral_code: z.string().max(12).optional().or(z.literal(''))
}).passthrough() // Allow additional fields

const mediatorSignupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters.').max(255, 'Name is too long.'),
  email: z.string().email('Please enter a valid email address.'),
  password: z.string().min(8, 'Password must be at least 8 characters.').max(128, 'Password is too long.'),
  phone_number: z.string()
    .min(10, 'Phone number must be at least 10 digits.')
    .max(15, 'Phone number is too long.')
    .regex(/^[+]?[\d\s-]+$/, 'Invalid phone number format.'),
  city: z.string().max(100).optional().or(z.literal('')),
  state: z.string().max(100).optional().or(z.literal('')),
  bar_enrollment_no: z.string().max(255).optional().or(z.literal('')),
  llb_college: z.string().max(255).optional().or(z.literal('')),
  llb_university: z.string().max(255).optional().or(z.literal(''))
}).passthrough()

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
