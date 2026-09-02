'use strict'

/**
 * Data-security utilities for KadrPortal.
 *
 * Provides two distinct primitives:
 *
 *  1. Reversible field encryption (AES-256-GCM) for P0 data that the
 *     application must be able to read back later (bank accounts, OAuth
 *     tokens, gateway payloads, etc.).
 *
 *  2. One-way OTP hashing + cryptographically secure OTP generation for
 *     secrets that should never be reversible (OTP codes). Verification is
 *     done by hashing the incoming value and comparing against the stored
 *     hash in constant time.
 *
 * The encryption key is read from the DATA_ENCRYPTION_KEY environment
 * variable. It must be 32 bytes, supplied either as 64 hex characters or as
 * a base64 string that decodes to 32 bytes.
 */

const crypto = require('crypto')

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12 // 96-bit nonce, recommended for GCM
const KEY_LENGTH = 32 // 256-bit key
const ENC_PREFIX = 'enc:v1:' // versioned marker so we can rotate schemes later

let cachedKey = null

/**
 * Resolve and cache the 32-byte encryption key from the environment.
 * Accepts hex (64 chars) or base64 encodings.
 * @returns {Buffer}
 */
function getKey () {
  if (cachedKey) return cachedKey

  const raw = process.env.DATA_ENCRYPTION_KEY
  if (!raw) {
    throw new Error(
      'DATA_ENCRYPTION_KEY is not set. Generate one with: ' +
      'node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    )
  }

  let key
  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    key = Buffer.from(raw, 'hex')
  } else {
    key = Buffer.from(raw, 'base64')
  }

  if (key.length !== KEY_LENGTH) {
    throw new Error(
      `DATA_ENCRYPTION_KEY must decode to ${KEY_LENGTH} bytes (got ${key.length}). ` +
      'Provide 64 hex chars or a 32-byte base64 value.'
    )
  }

  cachedKey = key
  return cachedKey
}

/**
 * Returns true when the value looks like something this module produced.
 * @param {*} value
 * @returns {boolean}
 */
function isEncrypted (value) {
  return typeof value === 'string' && value.startsWith(ENC_PREFIX)
}

/**
 * Encrypt a plaintext string with AES-256-GCM.
 * Output format: "enc:v1:<iv>:<authTag>:<ciphertext>" (all base64).
 *
 * null / undefined pass through unchanged so callers can encrypt optional
 * fields without branching. Non-string values are JSON-stringified.
 *
 * @param {string|null|undefined} plaintext
 * @returns {string|null|undefined}
 */
function encrypt (plaintext) {
  if (plaintext === null || plaintext === undefined) return plaintext
  const asString = typeof plaintext === 'string' ? plaintext : JSON.stringify(plaintext)

  // Idempotent: don't double-encrypt already-encrypted values.
  if (isEncrypted(asString)) return asString

  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv)
  const ciphertext = Buffer.concat([cipher.update(asString, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()

  return (
    ENC_PREFIX +
    iv.toString('base64') + ':' +
    authTag.toString('base64') + ':' +
    ciphertext.toString('base64')
  )
}

/**
 * Decrypt a value produced by encrypt(). If the value is not in the expected
 * encrypted format it is returned unchanged, which lets us read legacy
 * plaintext rows during a gradual backfill.
 *
 * @param {string|null|undefined} value
 * @returns {string|null|undefined}
 */
function decrypt (value) {
  if (value === null || value === undefined) return value
  if (!isEncrypted(value)) return value // legacy plaintext, return as-is

  const parts = value.slice(ENC_PREFIX.length).split(':')
  if (parts.length !== 3) {
    throw new Error('Malformed encrypted value: unexpected segment count.')
  }
  const [ivB64, tagB64, dataB64] = parts
  const iv = Buffer.from(ivB64, 'base64')
  const authTag = Buffer.from(tagB64, 'base64')
  const ciphertext = Buffer.from(dataB64, 'base64')

  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv)
  decipher.setAuthTag(authTag)
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()])
  return plaintext.toString('utf8')
}

/**
 * Encrypt a JSON-serialisable value. Returns null for null/undefined.
 * @param {*} obj
 * @returns {string|null}
 */
function encryptJson (obj) {
  if (obj === null || obj === undefined) return null
  return encrypt(JSON.stringify(obj))
}

/**
 * Decrypt a value produced by encryptJson() back into an object. If the
 * stored value is legacy plaintext JSON (or already an object), it is parsed
 * / returned directly.
 * @param {string|object|null|undefined} value
 * @returns {*}
 */
function decryptJson (value) {
  if (value === null || value === undefined) return value
  if (typeof value === 'object') return value // already parsed by the driver
  const decrypted = decrypt(value)
  try {
    return JSON.parse(decrypted)
  } catch (e) {
    return decrypted
  }
}

/**
 * Mask an account number for display, revealing only the last `visible`
 * characters. e.g. maskSecret('123456789', 4) => '•••••6789'.
 * @param {string|null|undefined} value
 * @param {number} visible
 * @returns {string}
 */
function maskSecret (value, visible = 4) {
  if (!value) return ''
  const str = String(value)
  if (str.length <= visible) return str
  return '•'.repeat(str.length - visible) + str.slice(-visible)
}

// ---------------------------------------------------------------------------
// One-way OTP handling
// ---------------------------------------------------------------------------

/**
 * Generate a cryptographically secure numeric OTP.
 * @param {number} digits number of digits (default 6)
 * @returns {string} zero-padded OTP string
 */
function generateNumericOtp (digits = 6) {
  const max = 10 ** digits
  const value = crypto.randomInt(0, max) // uniform, CSPRNG-backed
  return String(value).padStart(digits, '0')
}

/**
 * Hash an OTP for storage. Uses scrypt with a per-OTP random salt so two
 * identical codes never share a hash. OTPs are short-lived and low-entropy,
 * so this is paired with expiry + attempt limits at the call site.
 *
 * Output: "<salt>:<hash>" (both hex).
 * @param {string|number} otp
 * @returns {string}
 */
function hashOtp (otp) {
  const salt = crypto.randomBytes(16)
  const derived = crypto.scryptSync(String(otp), salt, 32)
  return salt.toString('hex') + ':' + derived.toString('hex')
}

/**
 * Constant-time comparison of an entered OTP against a stored hash produced
 * by hashOtp(). Returns false on any malformed input rather than throwing.
 * @param {string|number} enteredOtp
 * @param {string} storedHash
 * @returns {boolean}
 */
function compareOtp (enteredOtp, storedHash) {
  if (typeof storedHash !== 'string' || !storedHash.includes(':')) return false
  const [saltHex, hashHex] = storedHash.split(':')
  const salt = Buffer.from(saltHex, 'hex')
  const expected = Buffer.from(hashHex, 'hex')
  const derived = crypto.scryptSync(String(enteredOtp), salt, expected.length)
  if (derived.length !== expected.length) return false
  return crypto.timingSafeEqual(derived, expected)
}

module.exports = {
  encrypt,
  decrypt,
  encryptJson,
  decryptJson,
  isEncrypted,
  maskSecret,
  generateNumericOtp,
  hashOtp,
  compareOtp,
  ENC_PREFIX
}
