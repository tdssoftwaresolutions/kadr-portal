const { describe, it, before } = require('node:test')
const assert = require('node:assert/strict')
const crypto = require('node:crypto')

describe('data crypto utilities', () => {
  let dataCrypto

  before(() => {
    // 32-byte key as 64 hex chars.
    process.env.DATA_ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex')
    // Load after the key is set so getKey() can resolve it.
    delete require.cache[require.resolve('../utils/crypto')]
    dataCrypto = require('../utils/crypto')
  })

  describe('encrypt / decrypt', () => {
    it('round-trips a string', () => {
      const enc = dataCrypto.encrypt('9876543210')
      assert.equal(dataCrypto.isEncrypted(enc), true)
      assert.equal(dataCrypto.decrypt(enc), '9876543210')
    })

    it('produces a different ciphertext each time (random IV)', () => {
      const a = dataCrypto.encrypt('same-value')
      const b = dataCrypto.encrypt('same-value')
      assert.notEqual(a, b)
      assert.equal(dataCrypto.decrypt(a), dataCrypto.decrypt(b))
    })

    it('passes through null and undefined', () => {
      assert.equal(dataCrypto.encrypt(null), null)
      assert.equal(dataCrypto.encrypt(undefined), undefined)
      assert.equal(dataCrypto.decrypt(null), null)
    })

    it('treats legacy plaintext as-is on decrypt (backfill safety)', () => {
      assert.equal(dataCrypto.decrypt('legacy-plaintext'), 'legacy-plaintext')
    })

    it('is idempotent and does not double-encrypt', () => {
      const once = dataCrypto.encrypt('value')
      const twice = dataCrypto.encrypt(once)
      assert.equal(once, twice)
    })

    it('fails to decrypt a tampered ciphertext (GCM auth)', () => {
      const enc = dataCrypto.encrypt('sensitive')
      const tampered = enc.slice(0, -2) + (enc.endsWith('A') ? 'B' : 'A')
      assert.throws(() => dataCrypto.decrypt(tampered))
    })
  })

  describe('encryptJson / decryptJson', () => {
    it('round-trips an object', () => {
      const obj = { a: 1, b: 'x', nested: { y: true } }
      const enc = dataCrypto.encryptJson(obj)
      assert.deepEqual(dataCrypto.decryptJson(enc), obj)
    })

    it('returns an already-parsed object unchanged', () => {
      const obj = { a: 1 }
      assert.deepEqual(dataCrypto.decryptJson(obj), obj)
    })
  })

  describe('OTP handling', () => {
    it('generates a zero-padded numeric OTP of the requested length', () => {
      for (let i = 0; i < 50; i++) {
        const otp = dataCrypto.generateNumericOtp(6)
        assert.match(otp, /^[0-9]{6}$/)
      }
    })

    it('hashes and verifies an OTP', () => {
      const otp = dataCrypto.generateNumericOtp(6)
      const hash = dataCrypto.hashOtp(otp)
      assert.notEqual(hash, otp)
      assert.equal(dataCrypto.compareOtp(otp, hash), true)
    })

    it('rejects a wrong OTP', () => {
      const hash = dataCrypto.hashOtp('123456')
      assert.equal(dataCrypto.compareOtp('654321', hash), false)
    })

    it('returns false for a malformed stored hash', () => {
      assert.equal(dataCrypto.compareOtp('123456', 'not-a-hash'), false)
      assert.equal(dataCrypto.compareOtp('123456', null), false)
    })
  })

  describe('maskSecret', () => {
    it('reveals only the last N characters', () => {
      assert.equal(dataCrypto.maskSecret('123456789', 4), '•••••6789')
    })

    it('returns empty string for falsy input', () => {
      assert.equal(dataCrypto.maskSecret(null), '')
      assert.equal(dataCrypto.maskSecret(''), '')
    })
  })
})
