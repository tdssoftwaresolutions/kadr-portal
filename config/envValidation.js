const REQUIRED_ENV = [
  'DATABASE_URL',
  'SECRET_KEY',
  'REFRESH_SECRET_KEY',
  'SIGN_SECRET_KEY'
]

const RECOMMENDED_ENV = [
  'BASE_URL',
  'S3_ACCESS_KEY_ID',
  'S3_SECRET_ACCESS_KEY',
  'S3_BUCKET_NAME',
  'WEBSITE_CONTACT_API_KEY',
  'APP_TIMEZONE',
  'EMAIL_SMTP_HOST',
  'EMAIL_USER',
  'EMAIL_PASSWORD',
  'ALERT_TECH_TEAM_EMAILS'
]

function validateEnv ({ exitOnError = true } = {}) {
  const missing = REQUIRED_ENV.filter((key) => !process.env[key])
  if (missing.length) {
    const message = `[env] Missing required environment variables: ${missing.join(', ')}`
    console.error(message)
    if (exitOnError && process.env.NODE_ENV === 'production') {
      process.exit(1)
    }
    return { ok: false, missing, warnings: [] }
  }

  const warnings = RECOMMENDED_ENV.filter((key) => !process.env[key])
  if (warnings.length) {
    console.warn(`[env] Recommended variables not set: ${warnings.join(', ')}`)
  }

  // Validate JWT secret strength in production
  if (process.env.NODE_ENV === 'production') {
    const secretKeys = ['SECRET_KEY', 'REFRESH_SECRET_KEY', 'SIGN_SECRET_KEY']
    const weakSecrets = secretKeys.filter((key) => {
      const val = process.env[key] || ''
      return val.length < 32 || val.includes('change-me') || val.includes('example')
    })
    if (weakSecrets.length) {
      const msg = `[env] SECURITY WARNING: Weak or placeholder secrets detected: ${weakSecrets.join(', ')}. Run "node scripts/generateSecrets.js" to generate strong secrets.`
      console.error(msg)
      if (exitOnError) {
        process.exit(1)
      }
    }

    // Ensure secrets are different from each other
    const secretValues = secretKeys.map((k) => process.env[k]).filter(Boolean)
    const uniqueSecrets = new Set(secretValues)
    if (uniqueSecrets.size < secretValues.length) {
      console.error('[env] SECURITY WARNING: JWT secrets must be unique. SECRET_KEY, REFRESH_SECRET_KEY, and SIGN_SECRET_KEY should all be different.')
      if (exitOnError) {
        process.exit(1)
      }
    }
  }

  if (process.env.KADR_STRICT_ADMIN_PERMISSIONS !== '0') {
    process.env.KADR_STRICT_ADMIN_PERMISSIONS = process.env.KADR_STRICT_ADMIN_PERMISSIONS || '1'
  }

  return { ok: true, missing: [], warnings }
}

module.exports = { validateEnv, REQUIRED_ENV, RECOMMENDED_ENV }
