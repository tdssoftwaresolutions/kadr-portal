export const PHONE_NUMBER_PATTERN = /^(?:\+91|0)?[789]\d{9}$/

export function isValidPhoneNumber (value) {
  return PHONE_NUMBER_PATTERN.test(String(value || '').trim())
}

export function sanitizeDigits (value, maxLength = 10) {
  return String(value || '').replace(/\D/g, '').slice(0, maxLength)
}
