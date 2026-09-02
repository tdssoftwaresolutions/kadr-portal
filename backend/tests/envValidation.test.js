const { describe, it, beforeEach, after } = require('node:test')
const assert = require('node:assert/strict')
const { validateEnv } = require('../config/envValidation')

describe('environment validation', () => {
  let originalEnv

  beforeEach(() => {
    originalEnv = { ...process.env }
  })

  after(() => {
    process.env = originalEnv
  })

  it('reports missing required variables', () => {
    delete process.env.SECRET_KEY
    delete process.env.DATABASE_URL
    const result = validateEnv({ exitOnError: false })
    assert.equal(result.ok, false)
    assert.ok(result.missing.includes('SECRET_KEY'))
    assert.ok(result.missing.includes('DATABASE_URL'))
  })

  it('passes when required variables are set', () => {
    process.env.DATABASE_URL = 'mysql://test'
    process.env.SECRET_KEY = 'test-secret'
    process.env.REFRESH_SECRET_KEY = 'test-refresh'
    process.env.SIGN_SECRET_KEY = 'test-sign'
    process.env.DATA_ENCRYPTION_KEY = require('node:crypto').randomBytes(32).toString('hex')
    const result = validateEnv({ exitOnError: false })
    assert.equal(result.ok, true)
  })
})
